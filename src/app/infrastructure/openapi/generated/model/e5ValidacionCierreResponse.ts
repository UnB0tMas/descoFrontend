/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5DiferenciaResponse } from './e5DiferenciaResponse';
export interface E5ValidacionCierreResponse {
    campaniaId?: number;
    pendientes?: number;
    habilitado?: boolean;
    diferencias?: Array<E5DiferenciaResponse>;
}
