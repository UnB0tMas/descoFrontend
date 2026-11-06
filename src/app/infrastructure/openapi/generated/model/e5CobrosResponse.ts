/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5CobroResponse } from './e5CobroResponse';
export interface E5CobrosResponse {
    campaniaId?: number;
    cobrado?: number;
    ventaComprador?: number;
    saldoComprador?: number;
    movimientos?: Array<E5CobroResponse>;
}
