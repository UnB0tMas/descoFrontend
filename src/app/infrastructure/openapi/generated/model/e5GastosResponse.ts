/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5GastoResponse } from './e5GastoResponse';
export interface E5GastosResponse {
    campaniaId?: number;
    gastos?: Array<E5GastoResponse>;
}
