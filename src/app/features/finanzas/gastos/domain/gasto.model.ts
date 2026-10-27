import { Prorrateo } from './prorrateo.model';
export interface Gasto {
    gastoCampaniaId: number;
    campaniaVentaId: number;
    campania: string | null;
    operativoVentaId: number | null;
    operativo: string | null;
    tipoGastoId: number;
    tipoGasto: string | null;
    reglaProrrateoId: number;
    reglaProrrateo: string | null;
    fecha: string | null;
    concepto: string;
    importe: number;
    moneda: string;
    estadoProceso: string;
    totalProrrateado: number;
}
export interface GastoDetalle {
    gasto: Gasto;
    estado: boolean;
    prorrateo: readonly Prorrateo[];
}
export interface GastoCreate {
    campaniaVentaId: number;
    operativoVentaId?: number;
    tipoGastoId: number;
    reglaProrrateoId: number;
    fecha: string;
    concepto: string;
    importe: number;
    moneda: string;
}
export interface GastoUpdate {
    tipoGastoId: number;
    reglaProrrateoId: number;
    fecha: string;
    concepto: string;
    importe: number;
    moneda: string;
}
