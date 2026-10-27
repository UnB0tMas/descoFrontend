import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { VisitaDetalle } from '../../../domain/visita-evidencia.model';
import { VisitaFiltro } from '../../../domain/visita-filtro.model';
import {
  VisitaStart,
  VisitaTecnica,
  VisitaUpdate,
} from '../../../domain/visita-tecnica.model';

export interface VisitasGateway {
  list(filter: VisitaFiltro): Observable<PageResult<VisitaTecnica>>;
  get(id: number): Observable<VisitaDetalle>;
  start(input: VisitaStart): Observable<number>;
  update(id: number, input: VisitaUpdate): Observable<void>;
  finish(
    id: number,
    fechaHoraFin: string,
    resumen: string,
    recomendaciones: string,
  ): Observable<void>;
  annul(id: number, motivo: string, fechaHoraFin: string): Observable<void>;
}

export const VISITAS_GATEWAY = new InjectionToken<VisitasGateway>(
  'VISITAS_GATEWAY',
);
