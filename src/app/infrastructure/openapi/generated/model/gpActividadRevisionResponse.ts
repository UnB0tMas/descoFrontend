export interface GpActividadRevisionResponse {
  revisionId: number; actividadId: number; nombreAnterior?: string | null;
  nombreNuevo?: string | null; estadoAnterior: boolean; estadoNuevo: boolean;
  motivo: string; usuarioId: number; usuarioNombre?: string | null; fechaRegistro: string;
}
