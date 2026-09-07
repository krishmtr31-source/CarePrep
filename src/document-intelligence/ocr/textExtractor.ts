import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { evaluateTextQuality, TextQualityResult } from './textQualityChecker';
import { cleanAndReportOcrText } from './ocrCleaner';

// Configure pdfjs-dist worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    } catch {
      // safe fallback
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
  qualityReport?: TextQualityResult;
  corrections?: string[];
  isPasswordProtected?: boolean;
  error?: string;
}

// Shared worker cache for multi-page document sessions
let activeWorkerPromise: Promise<any> | null = null;
let activeWorkerInstance: any = null;
let idleWorkerTimer: any = null;

/**
 * Retrieves a reusable Tesseract.js worker or creates a new one
 */
async function getOcrWorker(
  onProgress?: (percent: number, status: string) => void
): Promise<any> {
  // Clear any existing idle timeout
  if (idleWorkerTimer) {
    clearTimeout(idleWorkerTimer);
    idleWorkerTimer = null;
  }

  if (activeWorkerInstance) {
    return activeWorkerInstance;
  }

  if (!activeWorkerPromise) {
    activeWorkerPromise = (async () => {
      onProgress?.(10, 'Preparing document...');
      const worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            const pct = Math.round(20 + m.progress * 70);
            onProgress?.(pct, `Extracting medical text (${Math.round(m.progress * 100)}%)...`);
          }
        }
      });
      activeWorkerInstance = worker;
      return worker;
    })();
  }

  const worker = await activeWorkerPromise;
  activeWorkerPromise = null;
  return worker;
}

/**
 * Gracefully terminates the active OCR worker to free browser resources
 */
export async function terminateOcrWorker(): Promise<void> {
  if (idleWorkerTimer) {
    clearTimeout(idleWorkerTimer);
    idleWorkerTimer = null;
  }
  if (activeWorkerInstance) {
    try {
      await activeWorkerInstance.terminate();
    } catch {
      // worker termination silent catch
    }
    activeWorkerInstance = null;
  }
  activeWorkerPromise = null;
}

/**
 * Schedules worker termination after an idle period
 */
function scheduleWorkerCleanup(delayMs = 30000): void {
  if (idleWorkerTimer) clearTimeout(idleWorkerTimer);
  idleWorkerTimer = setTimeout(() => {
    terminateOcrWorker();
  }, delayMs);
}

/**
 * Resizes an image file if it exceeds maximum resolution (2200px) to prevent OOM
 * and accelerate OCR processing while maintaining sharp character fidelity.
 */
async function preprocessImageIfNeeded(file: File): Promise<string | Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 2200;
      let { width, height } = img;

      if (width <= MAX_DIM && height <= MAX_DIM) {
        resolve(file);
        return;
      }

      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Main entry point: Extracts text from an uploaded File (PDF, Image, or plain text)
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  if (!file) {
    throw new Error('No file provided for text extraction.');
  }

  if (file.size === 0) {
    throw new Error('The selected file appears to be empty (0 bytes).');
  }

  const fileName = file.name.toLowerCase();

  // 1. PDF File handling
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractTextFromPdf(file, onProgress);
  }

  // 2. Image File handling (JPG, JPEG, PNG, WEBP)
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
    const { cleanedText, corrections } = cleanAndReportOcrText(content);
    const quality = evaluateTextQuality(cleanedText);
    onProgress?.(100, 'OCR completed');
    return {
      text: cleanedText,
      confidence: quality.isAcceptable ? Math.max(0.85, quality.score) : 0.40,
      pagesCount: 1,
      extractedLines: cleanedText.split('\n').map(l => l.trim()).filter(Boolean),
      extractionMethod: 'PDF_TEXT',
      qualityReport: quality,
      corrections
    };
  }

  throw new Error(`Unsupported file type: ${file.type || fileName}. Supported formats: PDF, JPG, JPEG, PNG, WEBP.`);
}

/**
 * Extracts text from PDF using layout-aware coordinate extraction with automated OCR fallback
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(10, 'Preparing document...');
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';
    const lines: string[] = [];

    // Step 1: Attempt layout-aware PDF text extraction
    for (let i = 1; i <= numPages; i++) {
      // Non-blocking yield to keep browser UI smooth
      await new Promise(r => setTimeout(r, 0));

      onProgress?.(
        Math.round(15 + (i / numPages) * 35),
        `Reading page ${i} of ${numPages}...`
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

    const { cleanedText, corrections } = cleanAndReportOcrText(fullText);
    const quality = evaluateTextQuality(cleanedText);

    // Step 2: Quality validation check
    if (quality.isAcceptable || lines.length >= 3) {
      onProgress?.(95, 'Organizing prescription details...');
      await new Promise(r => setTimeout(r, 100));
      onProgress?.(100, 'OCR completed');
      return {
        text: cleanedText,
        confidence: Math.max(0.85, quality.score),
        pagesCount: numPages,
        extractedLines: lines,
        extractionMethod: 'PDF_TEXT',
        wasFallbackUsed: false,
        qualityReport: quality,
        corrections
      };
    }

    // Step 3: Text quality is poor or empty (Scanned PDF or image-only) -> Run OCR Fallback
    onProgress?.(45, 'Extracting medical text...');
    const ocrText = await renderPdfPagesAndOcr(pdfDoc, onProgress);
    const { cleanedText: cleanedOcr, corrections: ocrCorrections } = cleanAndReportOcrText(ocrText);
    const ocrQuality = evaluateTextQuality(cleanedOcr);

    onProgress?.(95, 'Organizing prescription details...');
    await new Promise(r => setTimeout(r, 100));
    onProgress?.(100, 'OCR completed');

    return {
      text: cleanedOcr,
      confidence: ocrQuality.isAcceptable ? Math.max(0.75, ocrQuality.score) : 0.50,
      pagesCount: numPages,
      extractedLines: cleanedOcr.split('\n').map(l => l.trim()).filter(Boolean),
      extractionMethod: 'OCR',
      wasFallbackUsed: true,
      qualityReport: ocrQuality,
      corrections: ocrCorrections
    };
  } catch (err: any) {
    if (err?.name === 'PasswordException' || String(err?.message || '').toLowerCase().includes('password')) {
      return {
        text: '',
        confidence: 0,
        pagesCount: 1,
        extractedLines: [],
        extractionMethod: 'PDF_TEXT',
        isPasswordProtected: true,
        error: 'This PDF document is password-protected. Please remove the password before uploading.'
      };
    }

    // Attempt direct image OCR if PDF parsing threw
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
        wasFallbackUsed: true,
        error: 'Unable to parse PDF. The file may be damaged or corrupted.'
      };
    }
  }
}

/**
 * Renders PDF pages to canvas and runs Tesseract.js OCR page-by-page
 */
async function renderPdfPagesAndOcr(
  pdfDoc: any,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  const numPages = Math.min(pdfDoc.numPages, 10); // Process up to 10 pages
  let combinedOcrText = '';

  const worker = await getOcrWorker();

  for (let i = 1; i <= numPages; i++) {
    await new Promise(r => setTimeout(r, 0)); // Non-blocking yield

    const currentPercent = Math.round(45 + (i / numPages) * 45);
    onProgress?.(currentPercent, `Processing page ${i} / ${numPages}...`);

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
          const ret = await worker.recognize(blob);
          combinedOcrText += `\n--- [Page ${i}] ---\n` + (ret.data?.text || '');
        }
      }
    }
  }

  scheduleWorkerCleanup();
  return combinedOcrText.trim();
}

/**
 * Extracts text from Image using Tesseract.js worker
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(10, 'Preparing document...');

  try {
    const preprocessed = await preprocessImageIfNeeded(file);
    const worker = await getOcrWorker(onProgress);

    onProgress?.(30, 'Extracting medical text...');
    const ret = await worker.recognize(preprocessed);

    onProgress?.(85, 'Organizing prescription details...');
    await new Promise(r => setTimeout(r, 100));

    const rawOcrText = ret.data?.text || '';
    const { cleanedText, corrections } = cleanAndReportOcrText(rawOcrText);
    const quality = evaluateTextQuality(cleanedText);

    // Calculate confidence from Tesseract word confidences or quality check
    const tesseractConfidence = typeof ret.data?.confidence === 'number' ? ret.data.confidence / 100 : 0.70;
    const finalConfidence = quality.isAcceptable
      ? Math.max(0.70, (tesseractConfidence + quality.score) / 2)
      : Math.min(0.50, quality.score);

    onProgress?.(100, 'OCR completed');
    scheduleWorkerCleanup();

    return {
      text: cleanedText,
      confidence: Math.round(finalConfidence * 100) / 100,
      pagesCount: 1,
      extractedLines: cleanedText.split('\n').map(l => l.trim()).filter(Boolean),
      extractionMethod: 'OCR',
      wasFallbackUsed: false,
      qualityReport: quality,
      corrections
    };
  } catch (err: any) {
    scheduleWorkerCleanup();
    return {
      text: '',
      confidence: 0.10,
      pagesCount: 1,
      extractedLines: [],
      extractionMethod: 'OCR',
      wasFallbackUsed: true,
      error: err?.message || 'OCR extraction failed on this image.'
    };
  }
}
