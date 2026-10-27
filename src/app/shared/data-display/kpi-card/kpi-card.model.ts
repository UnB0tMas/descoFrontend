import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type KpiTone = 'blue' | 'sky' | 'indigo' | 'slate';
export type KpiTrendDirection = 'up' | 'down' | 'neutral';

export interface KpiCardData {
  label: string;
  value: string | number;
  description?: string;
  trendLabel?: string;
  trendDirection?: KpiTrendDirection;
  icon: IconDefinition;
  tone?: KpiTone;
}
