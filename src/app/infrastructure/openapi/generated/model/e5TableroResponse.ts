/**
 * DESCO API - modelo tipado compatible con OpenAPI Generator.
 */
import { E5SocioBalanceResponse } from './e5SocioBalanceResponse';
import { E5VariedadBalanceResponse } from './e5VariedadBalanceResponse';
import { E5RepartoResumenResponse } from './e5RepartoResumenResponse';
export interface E5TableroResponse {
    campaniaId?: number;
    nombre?: string;
    estado?: string;
    cerrada?: boolean;
    vendedores?: number;
    kilogramos?: number;
    bruto?: number;
    ventaAjustada?: number;
    netoAprobado?: number;
    pagado?: number;
    gastoComun?: number;
    cargos?: number;
    jabasAsignadas?: number;
    jabasDevueltas?: number;
    jabasFaltantes?: number;
    socios?: Array<E5SocioBalanceResponse>;
    variedades?: Array<E5VariedadBalanceResponse>;
    repartos?: Array<E5RepartoResumenResponse>;
}
