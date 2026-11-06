/* DESCO API - respuesta tipada. */
import { E5GastosResponse } from './e5GastosResponse';
export interface ApiResponseE5GastosResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5GastosResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
