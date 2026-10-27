import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { GastoFiltro } from '../../../domain/gasto-filtro.model';
import { Gasto, GastoCreate, GastoDetalle, GastoUpdate } from '../../../domain/gasto.model';
import { ProrrateoInput } from '../../../domain/prorrateo.model';
export interface GastosGateway {
    list(f: GastoFiltro): Observable<PageResult<Gasto>>;
    get(id: number): Observable<GastoDetalle>;
    create(i: GastoCreate): Observable<number>;
    update(id: number, i: GastoUpdate): Observable<void>;
    prorate(id: number, p: readonly ProrrateoInput[]): Observable<void>;
    approve(id: number): Observable<void>;
    cancel(id: number, motivo: string): Observable<void>;
}
export const GASTOS_GATEWAY = new InjectionToken<GastosGateway>('GASTOS_GATEWAY');
