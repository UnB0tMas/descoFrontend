import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { AjustePrecioFiltro } from '../../../domain/ajuste-precio-filtro.model';
import { AjustePrecio, AjustePrecioCreate } from '../../../domain/ajuste-precio.model';
import { ImpactoAjuste } from '../../../domain/impacto-ajuste.model';
export interface AjustesPrecioGateway {
    list(f: AjustePrecioFiltro): Observable<PageResult<AjustePrecio>>;
    impact(id: number): Observable<ImpactoAjuste>;
    create(i: AjustePrecioCreate): Observable<number>;
    cancel(id: number, motivo: string): Observable<void>;
}
export const AJUSTES_PRECIO_GATEWAY = new InjectionToken<AjustesPrecioGateway>('AJUSTES_PRECIO_GATEWAY');
