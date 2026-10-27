import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResult } from '../../../../../../shared/models/page-result.model';
import { AuditoriaDetalle } from '../../../domain/auditoria-detalle.model';
import { AuditoriaEvento } from '../../../domain/auditoria-evento.model';
import { AuditoriaFiltro } from '../../../domain/auditoria-filtro.model';
export interface AuditoriaGateway {
    list(f: AuditoriaFiltro): Observable<PageResult<AuditoriaEvento>>;
    get(id: number): Observable<AuditoriaDetalle>;
    export(f: AuditoriaFiltro): Observable<Blob>;
}
export const AUDITORIA_GATEWAY = new InjectionToken<AuditoriaGateway>('AUDITORIA_GATEWAY');
