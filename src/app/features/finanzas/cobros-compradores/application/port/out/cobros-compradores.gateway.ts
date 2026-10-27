import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { CobroCompradorFiltro } from '../../../domain/cobro-comprador-filtro.model';
import { CobroComprador, CobroCompradorCreate } from '../../../domain/cobro-comprador.model';
import { SaldoComprador } from '../../../domain/saldo-comprador.model';
export interface CobrosCompradoresGateway {
    list(f: CobroCompradorFiltro): Observable<PageResult<CobroComprador>>;
    balance(campaniaVentaId: number, operativoVentaId?: number): Observable<SaldoComprador>;
    create(i: CobroCompradorCreate): Observable<number>;
    confirm(id: number): Observable<void>;
    cancel(id: number, motivo: string): Observable<void>;
}
export const COBROS_COMPRADORES_GATEWAY = new InjectionToken<CobrosCompradoresGateway>('COBROS_COMPRADORES_GATEWAY');
