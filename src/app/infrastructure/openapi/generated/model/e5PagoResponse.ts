/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
export interface E5PagoResponse {
    pagoId?: number;
    importe?: number;
    medioPago?: string;
    referencia?: string;
    estado?: string;
    fecha?: string;
}
