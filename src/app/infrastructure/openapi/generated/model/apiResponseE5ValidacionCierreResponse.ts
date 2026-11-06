/* DESCO API - respuesta tipada. */
import { E5ValidacionCierreResponse } from './e5ValidacionCierreResponse';
export interface ApiResponseE5ValidacionCierreResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5ValidacionCierreResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
