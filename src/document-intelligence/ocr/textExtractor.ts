import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { evaluateTextQuality } from './textQualityChecker';
import { cleanOcrText } from './ocrCleaner';

// Set up pdf.js worker if in browser
if (typeof window !== 'undefined') {
  try {
    // Prefer Vite URL resolution for the locally bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    } catch {
      // fallback
    }
  }
}

export interface OcrResult {
  text: string;
  confidence: number;
  pagesCount: number;
  extractedLines: string[];
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE';
  wasFallbackUsed?: boolean;
}

/**
 * Extracts raw text from an uploaded File (PDF, Image, or plain text)
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  const fileName = file.name.toLowerCase();

  // 1. PDF File handling
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractTextFromPdf(file, onProgress);
  }

  // 2. Image File handling (JPG, PNG, WebP)
  if (
    fileName.endsWith('.png') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.webp') ||
    file.type.startsWith('image/')
  ) {
    return extractTextFromImage(file, onProgress);
  }

  // 3. Plain Text fallback
  if (file.type.startsWith('text/') || fileName.endsWith('.txt')) {
    onProgress?.(50, 'Reading text document...');
    const content = await file.text();
    const quality = evaluateTextQuality(content);
    const cleaned = cleanOcrText(content);
    onProgress?.(100, 'Done');
    return {
      text: cleaned,
      confidence: quality.isAcceptable ? quality.score : 0.40,
      pagesCount: 1,
      extractedLines: cleaned.split('\n').map(l => l.trim()).filter(Boolean),
      extractionMethod: 'PDF_TEXT'
    };
  }

  throw new Error(`Unsupported file type: ${file.type || fileName}. Please upload a PDF or Image.`);
}

/**
 * Extracts text from PDF using pdfjs-dist with automatic OCR fallback if text quality is poor.
 * Accurately reconstructs line breaks and column spacing using text element coordinates.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(15, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';
    const lines: string[] = [];

    // Step 1: Attempt layout-aware PDF text extraction
    for (let i = 1; i <= numPages; i++) {
      onProgress?.(
        Math.round(15 + (i / numPages) * 35),
        `Extracting text from page ${i} of ${numPages}...`
      );
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const rawItems = textContent.items as any[];

      interface PosTextItem {
        str: string;
        x: number;
        y: number;
        width: number;
      }

      const items: PosTextItem[] = rawItems
        .filter((item: any) => typeof item.str === 'string' && item.str.length > 0)
        .map((item: any) => ({
          str: item.str,
          x: Array.isArray(item.transform) ? item.transform[4] : 0,
          y: Array.isArray(item.transform) ? item.transform[5] : 0,
          width: typeof item.width === 'number' ? item.width : 0
        }));

      // Group text items by vertical row (tolerance: within 3.5 points)
      const lineBuckets: Array<{ y: number; items: PosTextItem[] }> = [];

      for (const it of items) {
        let placed = false;
        for (const bucket of lineBuckets) {
          if (Math.abs(bucket.y - it.y) <= 3.5) {
            bucket.items.push(it);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lineBuckets.push({ y: it.y, items: [it] });
        }
      }

      // Sort rows top-to-bottom (descending Y in PDF coordinates)
      lineBuckets.sort((a, b) => b.y - a.y);

      const pageLines: string[] = [];
      for (const bucket of lineBuckets) {
        // Sort items left-to-right (ascending X)
        bucket.items.sort((a, b) => a.x - b.x);

        let rowStr = '';
        let lastX = -1;
        let lastWidth = 0;

        for (const it of bucket.items) {
          if (lastX >= 0) {
            const gap = it.x - (lastX + lastWidth);
            if (gap > 16) {
              rowStr += '    '; // Table column spacing
            } else if (gap > 3) {
              rowStr += ' ';
            }
          }
          rowStr += it.str;
          lastX = it.x;
          lastWidth = it.width;
        }

        const trimmedRow = rowStr.trim();
        if (trimmedRow) {
          pageLines.push(trimmedRow);
          lines.push(trimmedRow);
        }
      }

      fullText += `\n--- [Page ${i}] ---\n` + pageLines.join('\n');
    }

    const cleanedText = cleanOcrText(fullText);
    const quality = evaluateTextQuality(cleanedText);

    // Step 2: Quality validation check
    if (quality.isAcceptable || lines.length >= 3) {
      onProgress?.(100, 'PDF text extraction verified.');
      return {
        text: cleanedText,
        confidence: Math.max(0.85, quality.score),
        pagesCount: numPages,
        extractedLines: lines,
        extractionMethod: 'PDF_TEXT',
        wasFallbackUsed: false
      };
    }

    // Step 3: Text quality is poor or empty (e.g. Scanned PDF or corrupted font stream) -> Automatic OCR Fallback
    onProgress?.(55, `Poor direct text (${quality.reason}). Initializing automatic OCR rendering...`);
    const ocrText = await renderPdfPagesAndOcr(pdfDoc, onProgress);
    const cleanedOcr = cleanOcrText(ocrText);
    const ocrQuality = evaluateTextQuality(cleanedOcr);

    onProgress?.(100, 'OCR fallback completed.');
    return {
      text: cleanedOcr,
      confidence: ocrQuality.isAcceptable ? Math.max(0.75, ocrQuality.score) : 0.50,
      pagesCount: numPages,
      extractedLines: cleanedOcr.split('\n').map(l => l.trim()).filter(Boolean),
      extractionMethod: 'OCR',
      wasFallbackUsed: true
    };
  } catch (err: any) {
    onProgress?.(50, 'PDF parse failed. Attempting direct OCR...');
    // If pdfjsLib threw, try image OCR directly if possible, or return safe unextracted placeholder
    try {
      const imgRes = await extractTextFromImage(file, onProgress);
      return imgRes;
    } catch {
      return {
        text: '',
        confidence: 0.10,
        pagesCount: 1,
        extractedLines: [],
        extractionMethod: 'PDF_TEXT',
        wasFallbackUsed: true
      };
    }
  }
}

/**
 * Renders PDF pages to canvas and processes each page with Tesseract.js
 */
async function renderPdfPagesAndOcr(
  pdfDoc: any,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  const numPages = Math.min(pdfDoc.numPages, 5); // Limit max pages to 5 for prototype performance
  let combinedOcrText = '';

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(
      Math.round(55 + (i / numPages) * 40),
      `Rendering & running OCR on page ${i} of ${numPages}...`
    );

    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const worker = await createWorker('eng', 1);
          const ocrResult = await worker.recognize(blob);
          await worker.terminate();
          combinedOcrText += `\n--- [Page ${i}] ---\n` + ocrResult.data.text;
        }
      }
    }
  }

  return combinedOcrText.trim();
}

/**
 * Extracts text from Image using Tesseract.js worker
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(10, 'Initializing OCR Engine (Tesseract.js)...');

  try {
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress) {
          onProgress?.(Math.round(20 + m.progress * 75), `OCR Recognizing text (${Math.round(m.progress * 100)}%)...`);
        }
      }
    });

    const imageUrl = URL.createObjectURL(file);
    const ret = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    const rawOcrText = ret.data.text.trim();
    const cleanedText = cleanOcrText(rawOcrText);
    const quality = evaluateTextQuality(cleanedText);

    onProgress?.(100, 'Image OCR completed');
    return {
      text: cleanedText,
      confidence: quality.isAcceptable ? Math.max(0.70, quality.score) : 0.45,
      pagesCount: 1,
      extractedLines: cleanedText.split('\n').map(l => l.trim()).filter(Boolean),
      extractionMethod: 'OCR',
      wasFallbackUsed: false
    };
  } catch (err: any) {
    onProgress?.(100, 'OCR Failed.');
    return {
      text: '',
      confidence: 0.10,
      pagesCount: 1,
      extractedLines: [],
      extractionMethod: 'OCR',
      wasFallbackUsed: true
    };
  }
}
