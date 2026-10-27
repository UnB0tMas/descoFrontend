import { Liquidacion } from './liquidacion.model';
export interface LiquidacionLinea {
    liquidacionDetalleId: number;
    tipo: string;
    entregaDetalleId: number | null;
    gastoProrrateoSocioId: number | null;
    ajustePrecioSocioId: number | null;
    concepto: string;
    importe: number;
}
export interface LiquidacionPago {
    pagoSocioId: number;
    fechaHora: string | null;
    importe: number;
    medioPago: string;
    numeroOperacion: string | null;
    estadoProceso: string;
}
export interface LiquidacionDetalle {
    liquidacion: Liquidacion;
    estado: boolean;
    numeroDocumento: string | null;
    socioNombre: string | null;
    detalle: readonly LiquidacionLinea[];
    pagos: readonly LiquidacionPago[];
}
