import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { PagoSocioFiltro } from '../../../domain/pago-socio-filtro.model';
import { PagoSocio, PagoSocioCreate, PagoSocioDetalle } from '../../../domain/pago-socio.model';
export interface PagosSociosGateway {
    list(f: PagoSocioFiltro): Observable<PageResult<PagoSocio>>;
    get(id: number): Observable<PagoSocioDetalle>;
    create(i: PagoSocioCreate): Observable<number>;
    confirm(id: number): Observable<void>;
    cancel(id: number, motivo: string): Observable<void>;
}
export const PAGOS_SOCIOS_GATEWAY = new InjectionToken<PagosSociosGateway>('PAGOS_SOCIOS_GATEWAY');
