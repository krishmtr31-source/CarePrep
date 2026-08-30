import { AYUSH_INTAKE_QUESTIONS } from '../ayushEngine';
import { IntakeAnswer, IntakeQuestion } from '../../data-models/intake';
import { AgentRequest, AgentResponse, AgentEvidence } from './orchestrationTypes';
import { evidenceService } from './EvidenceService';

export interface AyushProcessPayload {
  answers: IntakeAnswer[];
  currentStep?: string;
}

export interface AyushAgentResult {
  dashavidhaProfile: {
    prakriti: string;
    vikriti: string;
    agni: string;
    koshtha: string;
    aharaShakti: string;
    vyayamaShakti: string;
  };
  missingParameters: string[];
  suggestedQuestions: IntakeQuestion[];
  clinicianNotice: string;
}

/**
 * AYUSH Agent.
 * Organizes patient-reported Dashavidha Pariksha parameters while strictly enforcing
 * that clinical assessment (Nadi, Sparshana, Chikitsa) is reserved for the physician.
 */
export class AyushAgent {
  public processAyushIntake(
    request: AgentRequest<AyushProcessPayload>
  ): AgentResponse<AyushAgentResult> {
    const { answers } = request.payload;

    const profile = {
      prakriti: 'Not provided.',
      vikriti: 'Not provided.',
      agni: 'Not provided.',
      koshtha: 'Not provided.',
      aharaShakti: 'Not provided.',
      vyayamaShakti: 'Not provided.'
    };

    const evidenceItems: AgentEvidence[] = [];

    answers.forEach(ans => {
      const val = ans.rawPatientResponse || ans.customText || ans.selectedOptionIds?.join(', ');
      if (!val) return;

      if (ans.step === 'AYUSH_PRAKRITI') {
        profile.prakriti = val;
        evidenceItems.push(
          evidenceService.recordEvidence(
            ans.audioProvenance === 'VOICE' ? 'PATIENT_VOICE' : 'PATIENT_TOUCH',
            'AYUSH Prakriti Question',
            val,
            'Prakriti'
          )
        );
      } else if (ans.step === 'AYUSH_VIKRITI') {
        profile.vikriti = val;
      } else if (ans.step === 'AYUSH_AGNI') {
        profile.agni = val;
      } else if (ans.step === 'AYUSH_KOSHTHA') {
        profile.koshtha = val;
      } else if (ans.step === 'AYUSH_AHARA_SHAKTI') {
        profile.aharaShakti = val;
      } else if (ans.step === 'AYUSH_VYAYAMA_SHAKTI') {
        profile.vyayamaShakti = val;
      }
    });

    const missingParameters: string[] = [];
    if (profile.prakriti === 'Not provided.') missingParameters.push('Prakriti');
    if (profile.agni === 'Not provided.') missingParameters.push('Agni');
    if (profile.koshtha === 'Not provided.') missingParameters.push('Koshtha');
    if (profile.aharaShakti === 'Not provided.') missingParameters.push('Ahara Shakti');
    if (profile.vyayamaShakti === 'Not provided.') missingParameters.push('Vyayama Shakti');

    return {
      agentName: 'AyushAgent',
      status: 'SUCCESS',
      structuredData: {
        dashavidhaProfile: profile,
        missingParameters,
        suggestedQuestions: AYUSH_INTAKE_QUESTIONS,
        clinicianNotice: 'Patient-reported holistic indicators. Physician Nadi Pariksha required.'
      },
      evidence: evidenceItems,
      nextAction: 'EVALUATE_SAFETY'
    };
  }
}

export const ayushAgent = new AyushAgent();
