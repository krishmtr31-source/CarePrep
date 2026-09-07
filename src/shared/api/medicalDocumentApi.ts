import { getAuthHeaders } from './apiClient';

export interface ILabResultEntry {
  testName: string;
  value: string;
  unit: string;
  referenceRange?: string;
  flag?: string;
}

export interface IMedicationEntry {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
}

export interface StructuredExtractionResult {
  documentType: 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'CONSULTATION_NOTE' | 'RADIOLOGY_REPORT' | 'ECG_REPORT' | 'MEDICAL_CERTIFICATE' | 'OTHER';
  documentTitle: string;
  documentDate: string | null;
  patientName: string | null;
  doctorName: string | null;
  hospitalName: string | null;
  summary: string;
  labResults: ILabResultEntry[];
  medications: IMedicationEntry[];
  diagnosesMentioned: string[];
  proceduresMentioned: string[];
  importantNotes: string[];
  extractionWarnings: string[];
}

export interface MedicalDocumentRecord {
  _id?: string;
  documentId: string;
  patientId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData?: string;
  documentType: string;
  documentTitle: string;
  documentDate?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
  hospitalName?: string | null;
  summary: string;
  labResults: ILabResultEntry[];
  medications: IMedicationEntry[];
  diagnosesMentioned: string[];
  proceduresMentioned: string[];
  importantNotes: string[];
  extractionWarnings: string[];
  extractionStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  aiModel?: string;
  processedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const medicalDocumentApi = {
  /**
   * Sends file to server-side Gemini endpoint for structured information extraction.
   */
  async analyzeDocument(
    file: File,
    base64Data?: string,
    rawText?: string
  ): Promise<{ success: boolean; extraction?: StructuredExtractionResult; error?: string }> {
    try {
      let dataUrl = base64Data;
      if (!dataUrl) {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/medical-documents/analyze', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          fileSize: file.size,
          fileData: dataUrl,
          rawText
        })
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'AI extraction is temporarily unavailable.'
        };
      }

      return {
        success: true,
        extraction: data.extraction
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'AI extraction is temporarily unavailable.'
      };
    }
  },

  /**
   * Saves patient-confirmed extracted document into MongoDB permanent records.
   */
  async saveDocument(docData: Partial<MedicalDocumentRecord>): Promise<{ success: boolean; document?: MedicalDocumentRecord; error?: string }> {
    try {
      const res = await fetch('/api/medical-documents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(docData)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to save document' };
      }
      return { success: true, document: data.document };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save document' };
    }
  },

  /**
   * Retrieves all medical documents for the authenticated patient, sorted newest first.
   */
  async getDocuments(patientId?: string): Promise<MedicalDocumentRecord[]> {
    try {
      const url = patientId ? `/api/medical-documents?patientId=${encodeURIComponent(patientId)}` : '/api/medical-documents';
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  /**
   * Retrieves a single document by documentId.
   */
  async getDocumentById(id: string): Promise<MedicalDocumentRecord | null> {
    try {
      const res = await fetch(`/api/medical-documents/${encodeURIComponent(id)}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Updates extracted details after patient edits.
   */
  async updateDocument(id: string, updateData: Partial<MedicalDocumentRecord>): Promise<{ success: boolean; document?: MedicalDocumentRecord; error?: string }> {
    try {
      const res = await fetch(`/api/medical-documents/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update document' };
      }
      return { success: true, document: data.document };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update document' };
    }
  },

  /**
   * Deletes a medical document.
   */
  async deleteDocument(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/medical-documents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete document' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete document' };
    }
  }
};
