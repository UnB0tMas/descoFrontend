/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5LiquidacionResumenResponse } from './e5LiquidacionResumenResponse';
export interface E5LiquidacionesResponse {
    campaniaId?: number;
    liquidaciones?: Array<E5LiquidacionResumenResponse>;
}
