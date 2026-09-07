/**
 * Legacy Gemini Document Service (Compatibility Wrapper)
 * CarePrep (SIH26047)
 *
 * NOTE: This is a thin compatibility wrapper around the canonical backend service.
 * Canonical implementation is: src/backend/services/medicalDocumentService.ts
 *
 * There is NO independent Gemini client or duplicate generateContent logic here.
 */

import { GeminiMedicalDocumentAnalysis } from '../../document-intelligence/models/document';
import { medicalDocumentService, adaptToLegacyGeminiAnalysis } from '../../backend/services/medicalDocumentService';
import { getGeminiModelName } from '../../backend/config/geminiConfig';

export interface DocumentAnalysisRequest {
  fileName: string;
  fileData?: string; // Base64 string or data URL
  mimeType?: string; // e.g. 'application/pdf', 'image/jpeg', 'image/png'
  rawText?: string;
}

export class GeminiDocumentService {
  public isConfigured(): boolean {
    return medicalDocumentService.isConfigured();
  }

  public getModelName(): string {
    return getGeminiModelName();
  }

  public async analyzeDocument(request: DocumentAnalysisRequest): Promise<GeminiMedicalDocumentAnalysis> {
    const canonicalResult = await medicalDocumentService.analyzeDocument({
      fileName: request.fileName,
      fileData: request.fileData,
      mimeType: request.mimeType || (request.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      rawText: request.rawText
    });

    return adaptToLegacyGeminiAnalysis(canonicalResult, request.fileName);
  }
}

export const geminiDocumentService = new GeminiDocumentService();
