import { AgentEvidence, EvidenceSourceType } from './orchestrationTypes';

export class EvidenceService {
  private evidenceTrail: AgentEvidence[] = [];

  public recordEvidence(
    sourceType: EvidenceSourceType,
    sourceName: string,
    rawSnippet: string,
    structuredField: string,
    options?: { confidence?: number; documentPage?: number }
  ): AgentEvidence {
    const entry: AgentEvidence = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sourceType,
      sourceName,
      rawSnippet,
      structuredField,
      timestamp: new Date().toISOString(),
      confidence: options?.confidence,
      documentPage: options?.documentPage
    };

    this.evidenceTrail.push(entry);
    return entry;
  }

  public getEvidenceForField(field: string): AgentEvidence[] {
    return this.evidenceTrail.filter(e => e.structuredField.toLowerCase().includes(field.toLowerCase()));
  }

  public getAllEvidence(): AgentEvidence[] {
    return [...this.evidenceTrail];
  }

  public clearEvidence(): void {
    this.evidenceTrail = [];
  }
}

export const evidenceService = new EvidenceService();
