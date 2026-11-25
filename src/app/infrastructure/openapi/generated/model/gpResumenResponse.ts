/** Contrato tipado del resumen productivo; valores agregados consultados desde PA. */
export interface GpResumenPunto {
  fecha: string;
  valor: number;
}
export interface GpResumenTipo {
  tipo: string;
  total: number;
}
export interface GpResumenResponse {
  mediciones: number;
  seguimientos: number;
  incidenciasAbiertas: number;
  evolucion: GpResumenPunto[];
  tiposSeguimiento: GpResumenTipo[];
}
export type GpResumenPeriodo = '90D' | '12M' | 'TODO';
export type GpResumenTipoEvento = 'TODOS' | 'OBSERVACION' | 'EVALUACION' | 'INCIDENCIA' | 'TRATAMIENTO' | 'RESPUESTA';
