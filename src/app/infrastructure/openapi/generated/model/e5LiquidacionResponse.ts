/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5LineaResponse } from './e5LineaResponse';
import { E5PagoResponse } from './e5PagoResponse';
export interface E5LiquidacionResponse {
    liquidacionId?: number;
    participacionId?: number;
    version?: number;
    estado?: string;
    moneda?: string;
    neto?: number;
    pagado?: number;
    saldo?: number;
    kilogramos?: number;
    bruto?: number;
    ajustePrecio?: number;
    ventaAjustada?: number;
    cargos?: number;
    gastos?: number;
    descuentos?: number;
    bonificaciones?: number;
    redondeo?: number;
    creado?: string;
    aprobado?: string;
    observacion?: string;
    detalle?: Array<E5LineaResponse>;
    pagos?: Array<E5PagoResponse>;
}
