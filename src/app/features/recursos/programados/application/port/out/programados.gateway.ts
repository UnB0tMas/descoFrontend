import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { DisponibilidadRecurso } from '../../../domain/disponibilidad-recurso.model';
import { RecursoProgramadoFiltro } from '../../../domain/recurso-programado-filtro.model';
import {
  DestinoRecursoProgramado,
  RecursoProgramado,
  RecursoProgramadoConsumo,
  RecursoProgramadoCreate,
  RecursoProgramadoDetalle,
  RecursoProgramadoDevolucion,
  RecursoProgramadoUpdate,
  TipoDestinoRecurso,
} from '../../../domain/recurso-programado.model';

export interface ProgramadosGateway {
  list(filter: RecursoProgramadoFiltro): Observable<PageResult<RecursoProgramado>>;
  get(id: number): Observable<RecursoProgramadoDetalle>;
  destinations(uotId?: number, tipo?: TipoDestinoRecurso): Observable<readonly DestinoRecursoProgramado[]>;
  availability(uotId: number): Observable<DisponibilidadRecurso>;
  program(input: RecursoProgramadoCreate): Observable<number>;
  update(id: number, input: RecursoProgramadoUpdate): Observable<void>;
  assign(id: number): Observable<void>;
  returnResource(id: number, input: RecursoProgramadoDevolucion): Observable<void>;
  consume(id: number, input: RecursoProgramadoConsumo): Observable<void>;
  cancel(id: number, motivo: string): Observable<void>;
}

export const PROGRAMADOS_GATEWAY =
  new InjectionToken<ProgramadosGateway>('PROGRAMADOS_GATEWAY');
