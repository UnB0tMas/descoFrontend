/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
export interface E5LiquidacionResumenResponse {
    liquidacionId?: number;
    participacionId?: number;
    version?: number;
    neto?: number;
    moneda?: string;
    estado?: string;
    pagado?: number;
}
