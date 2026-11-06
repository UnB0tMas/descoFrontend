/* DESCO API - respuesta tipada. */
import { E5LiquidacionesResponse } from './e5LiquidacionesResponse';
export interface ApiResponseE5LiquidacionesResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5LiquidacionesResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
