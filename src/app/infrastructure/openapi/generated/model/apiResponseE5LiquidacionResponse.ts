/* DESCO API - respuesta tipada. */
import { E5LiquidacionResponse } from './e5LiquidacionResponse';
export interface ApiResponseE5LiquidacionResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5LiquidacionResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
