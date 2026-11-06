/* DESCO API - respuesta tipada. */
import { E5CierreResponse } from './e5CierreResponse';
export interface ApiResponseE5CierreResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5CierreResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
