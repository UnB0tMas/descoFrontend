/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5CuotaResponse } from './e5CuotaResponse';
export interface E5RepartoResponse {
    repartoId?: number;
    version?: number;
    vendedores?: number;
    importe?: number;
    moneda?: string;
    estado?: string;
    observacion?: string;
    socios?: Array<E5CuotaResponse>;
}
