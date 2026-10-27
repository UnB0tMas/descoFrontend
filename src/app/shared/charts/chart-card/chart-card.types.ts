import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ApexOptions } from 'ng-apexcharts';

export type DescoChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'pie'
  | 'donut'
  | 'radialBar'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'candlestick'
  | 'boxPlot'
  | 'radar'
  | 'polarArea'
  | 'rangeBar'
  | 'rangeArea'
  | 'treemap'
  | 'funnel'
  | 'pyramid';

export interface ChartCardData {
  title: string;
  subtitle?: string;
  icon: IconDefinition;
  options: ApexOptions;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}
