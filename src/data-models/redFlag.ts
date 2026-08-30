export type RedFlagSeverity = 'CRITICAL' | 'URGENT' | 'WARNING';

export interface RedFlagRule {
  id: string;
  category: 'CARDIOVASCULAR' | 'RESPIRATORY' | 'NEUROLOGICAL' | 'ACUTE_ABDOMEN' | 'SEPSIS' | 'BLEEDING' | 'AYUSH_EMERGENCY';
  title: string;
  description: string;
  severity: RedFlagSeverity;
  keywords: string[];
  immediateActionNotice: {
    en: string;
    hi: string;
    ta: string;
  };
}

export interface RedFlagAlert {
  ruleId: string;
  ruleTitle: string;
  severity: RedFlagSeverity;
  matchedTrigger: string;
  timestamp: string;
  actionMessage: string;
}
