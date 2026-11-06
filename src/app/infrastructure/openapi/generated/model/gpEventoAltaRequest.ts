import { GpTipoEvento } from './gpTipoEvento';
export interface GpEventoAltaRequest {
  tipo: GpTipoEvento; problemaId?: number | null; tratamientoId?: number | null;
  respuestaAId?: number | null; observacion: string; fechaHecho?: string | null;
  cantidadAfectada?: number | null; afectadosAproximado?: boolean | null;
}
