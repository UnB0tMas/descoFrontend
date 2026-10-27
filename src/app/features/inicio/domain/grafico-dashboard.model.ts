export type DashboardChartType =
  | 'LINE'
  | 'AREA'
  | 'BAR'
  | 'COLUMN'
  | 'DONUT';

export interface DashboardChartPoint {
  categoria: string;
  valor: number;
  orden: number;
}

export interface DashboardChartSeries {
  nombre: string;
  puntos: readonly DashboardChartPoint[];
}

export interface DashboardChart {
  codigo: string;
  titulo: string;
  subtitulo: string | null;
  tipoGrafico: DashboardChartType;
  unidad: string | null;
  ancho: number;
  orden: number;
  series: readonly DashboardChartSeries[];
}
