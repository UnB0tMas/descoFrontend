/* DESCO API - respuesta tipada. */
import { E5RepartoResponse } from './e5RepartoResponse';
export interface ApiResponseE5RepartoResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5RepartoResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
