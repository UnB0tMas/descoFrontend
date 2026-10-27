import { AjustePrecio } from './ajuste-precio.model';
export interface ImpactoAjuste extends AjustePrecio {
    usuarioId: number | null;
    estado: boolean;
    campaniaVentaId: number | null;
    campania: string | null;
    numeroDocumento: string | null;
    socioNombre: string | null;
    liquidacionesRelacionadas: number;
}
