import { ExtractedDocumentData, TimelineEvent, DocumentClassification } from '../../document-intelligence/models/document';
import { processDocumentWithAI, buildDocumentTimelineEvents } from '../../document-intelligence/parsers/documentPipeline';
import { AgentRequest, AgentResponse, AgentEvidence } from './orchestrationTypes';
import { evidenceService } from './EvidenceService';

export interface ProcessDocumentPayload {
  rawText: string;
  fileName: string;
  sourceType: 'pdf' | 'image' | 'sample';
  hintType?: DocumentClassification;
}

export interface DocumentAgentResult {
  extractedDocument: ExtractedDocumentData;
  timelineEvents: TimelineEvent[];
  abnormalFindingsCount: number;
}

/**
 * Document Agent.
 * Orchestrates OCR text classification, clinical entity extraction (Medications, Diagnoses, Labs),
 * abnormal finding detection, and chronological timeline integration.
 */
export class DocumentAgent {
  public async processDocument(
    request: AgentRequest<ProcessDocumentPayload>
  ): Promise<AgentResponse<DocumentAgentResult>> {
    const { rawText, fileName, sourceType, hintType } = request.payload;

    try {
      // 1. Process document text using hybrid AI + deterministic pipeline
      const extractedDocument = await processDocumentWithAI(rawText, fileName, sourceType, hintType);
      extractedDocument.patientId = request.patientId;
      extractedDocument.caseId = request.sessionId;

      // 2. Build timeline events
      const timelineEvents = buildDocumentTimelineEvents([extractedDocument]);

      // 3. Record evidence for extracted clinical entities
      const evidenceItems: AgentEvidence[] = [];

      // Record medications
      extractedDocument.medications.forEach(med => {
        evidenceItems.push(
          evidenceService.recordEvidence(
            'DOCUMENT',
            fileName,
            med.evidence.snippet,
            `Medication: ${med.name} ${med.dosage}`,
            { confidence: med.evidence.confidenceScore, documentPage: med.evidence.pageNumber }
          )
        );
      });

      // Record lab results
      extractedDocument.labResults.forEach(lab => {
        evidenceItems.push(
          evidenceService.recordEvidence(
            'DOCUMENT',
            fileName,
            lab.evidence.snippet,
            `Lab: ${lab.testName} = ${lab.resultValue} ${lab.unit} [${lab.flag}]`,
            { confidence: lab.evidence.confidenceScore, documentPage: lab.evidence.pageNumber }
          )
        );
      });

      // Record diagnoses
      extractedDocument.diagnoses.forEach(diag => {
        evidenceItems.push(
          evidenceService.recordEvidence(
            'DOCUMENT',
            fileName,
            diag.evidence.snippet,
            `Previous Diagnosis: ${diag.conditionName}`,
            { confidence: diag.evidence.confidenceScore, documentPage: diag.evidence.pageNumber }
          )
        );
      });

      const abnormalFindingsCount = extractedDocument.labResults.filter(l => l.isAbnormal).length;

      return {
        agentName: 'DocumentAgent',
        status: extractedDocument.unreliableFields && extractedDocument.unreliableFields.length > 0 ? 'WARNING' : 'SUCCESS',
        structuredData: {
          extractedDocument,
          timelineEvents,
          abnormalFindingsCount
        },
        evidence: evidenceItems,
        warnings: extractedDocument.unreliableFields,
        nextAction: 'UPDATE_TIMELINE'
      };
    } catch (err: any) {
      // Graceful error fallback
      return {
        agentName: 'DocumentAgent',
        status: 'ERROR',
        structuredData: {
          extractedDocument: {
            documentId: `doc-err-${Date.now()}`,
            fileName,
            fileType: sourceType,
            classification: 'OTHER',
            classificationConfidence: 0,
            uploadedAt: new Date().toISOString(),
            rawText: rawText || '',
            pagesCount: 1,
            medications: [],
            diagnoses: [],
            labResults: [],
            unreliableFields: ['Document processing error — manual clinician review required.']
          },
          timelineEvents: [],
          abnormalFindingsCount: 0
        },
        warnings: ['Document processing failed; flagged for manual physician review.'],
        error: err.message,
        nextAction: 'CONTINUE_WITH_WARNING'
      };
    }
  }
}

export const documentAgent = new DocumentAgent();
