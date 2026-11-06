/* DESCO API - respuesta tipada. */
import { E5CobrosResponse } from './e5CobrosResponse';
export interface ApiResponseE5CobrosResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5CobrosResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
