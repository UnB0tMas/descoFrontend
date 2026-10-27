import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ReporteFiltro } from '../../../domain/reporte-filtro.model';
import { Reporte, ReporteDatos } from '../../../domain/reporte.model';
export interface ReportesGateway {
    list(): Observable<readonly Reporte[]>;
    data(f: ReporteFiltro): Observable<ReporteDatos>;
    export(f: ReporteFiltro): Observable<Blob>;
}
export const REPORTES_GATEWAY = new InjectionToken<ReportesGateway>('REPORTES_GATEWAY');
