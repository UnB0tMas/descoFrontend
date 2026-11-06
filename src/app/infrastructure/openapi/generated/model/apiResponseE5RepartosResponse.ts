/* DESCO API - respuesta tipada. */
import { E5RepartosResponse } from './e5RepartosResponse';
export interface ApiResponseE5RepartosResponse {
  exitoso?: boolean;
  codigo?: string;
  mensaje?: string;
  datos?: E5RepartosResponse;
  correlacionId?: string;
  fechaHoraUtc?: string;
}
