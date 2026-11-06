/* DESCO API - respuesta tipada. */
import { E5TableroResponse } from './e5TableroResponse';
export interface ApiResponseE5TableroResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5TableroResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
