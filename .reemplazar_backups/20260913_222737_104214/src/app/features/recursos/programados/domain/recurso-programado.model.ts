export type EstadoProcesoRecurso =
  | 'PROGRAMADO'
  | 'EN_EJECUCION'
  | 'COMPLETADO'
  | 'CANCELADO'
  | string;

export type TipoDestinoRecurso = 'CAMPANIA' | 'OPERATIVO' | 'SALIDA';
export type TipoRecursoProgramable = 'BIEN' | 'SUMINISTRO';

export interface RecursoProgramado {
  recursoProgramadoId: number;
  campaniaVentaId: number | null;
  operativoVentaId: number | null;
  salidaCampoId: number | null;
  bienInventarioId: number | null;
  bien: string | null;
  suministroId: number | null;
  suministro: string | null;
  cantidadProgramada: number;
  estadoProceso: EstadoProcesoRecurso;
  fechaProgramacion: string | null;
  observacion: string | null;
  cantidadEjecutada: number;
  cantidadDevuelta: number;
}

export interface RecursoProgramadoMovimiento {
  recursoMovimientoId: number;
  tipoMovimiento: string;
  cantidad: number;
  fechaHora: string | null;
  observacion: string | null;
  usuario: string | null;
}

export interface RecursoProgramadoDetalle {
  recursoProgramadoId: number;
  campaniaVentaId: number | null;
  operativoVentaId: number | null;
  salidaCampoId: number | null;
  bienInventarioId: number | null;
  bien: string | null;
  estadoBien: string | null;
  suministroId: number | null;
  suministro: string | null;
  unidadMedida: string | null;
  cantidadProgramada: number;
  observacion: string | null;
  estado: boolean;
  estadoProceso: EstadoProcesoRecurso;
  usuarioProgramacionId: number | null;
  fechaProgramacion: string | null;
  usuarioCancelacionId: number | null;
  fechaCancelacion: string | null;
  motivoCancelacion: string | null;
  movimientos: readonly RecursoProgramadoMovimiento[];
}

export interface RecursoProgramadoCreate {
  campaniaVentaId?: number;
  operativoVentaId?: number;
  salidaCampoId?: number;
  bienInventarioId?: number;
  suministroId?: number;
  cantidadProgramada: number;
  observacion?: string;
}

export interface RecursoProgramadoUpdate {
  cantidadProgramada: number;
  observacion?: string;
}

export interface RecursoProgramadoDevolucion {
  cantidadDevuelta: number;
  observacion?: string;
}

export interface RecursoProgramadoConsumo { cantidadConsumida?: number; observacion?: string; }
