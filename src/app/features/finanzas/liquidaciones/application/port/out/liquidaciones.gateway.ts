import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { LiquidacionDetalle } from '../../../domain/liquidacion-detalle.model';
import { LiquidacionFiltro } from '../../../domain/liquidacion-filtro.model';
import { Liquidacion } from '../../../domain/liquidacion.model';
export interface LiquidacionesGateway {
    list(f: LiquidacionFiltro): Observable<PageResult<Liquidacion>>;
    get(id: number): Observable<LiquidacionDetalle>;
    calculate(participacionId: number): Observable<number>;
    recalculate(id: number, motivo: string): Observable<number>;
    approve(id: number): Observable<void>;
    cancel(id: number, motivo: string): Observable<void>;
}
export const LIQUIDACIONES_GATEWAY = new InjectionToken<LiquidacionesGateway>('LIQUIDACIONES_GATEWAY');
