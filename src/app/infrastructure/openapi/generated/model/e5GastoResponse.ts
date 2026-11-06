/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
export interface E5GastoResponse {
    gastoId?: number;
    concepto?: string;
    importe?: number;
    moneda?: string;
    estado?: string;
    fecha?: string;
    repartoId?: number;
    version?: number;
    repartoEstado?: string;
    vendedores?: number;
}
