/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
export interface E5SocioBalanceResponse {
    participacionId?: number;
    socioId?: number;
    socio?: string;
    kilogramos?: number;
    liquidacionId?: number;
    version?: number;
    liquidacionEstado?: string;
    neto?: number;
    pagado?: number;
    saldo?: number;
    bruto?: number;
    ventaEfectiva?: number;
    gastos?: number;
    cargos?: number;
    requiereRegeneracion?: boolean;
}
