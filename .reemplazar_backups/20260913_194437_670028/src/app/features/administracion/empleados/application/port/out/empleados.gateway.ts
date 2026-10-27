import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { EmpleadoFiltro } from '../../../domain/empleado-filtro.model';
import {
  Empleado,
  EmpleadoCreate,
  EmpleadoDetalle,
  EmpleadoUpdate,
} from '../../../domain/empleado.model';

export interface EmpleadosGateway {
  list(filter: EmpleadoFiltro): Observable<PageResult<Empleado>>;
  get(id: number): Observable<EmpleadoDetalle>;
  create(input: EmpleadoCreate): Observable<number>;
  update(id: number, input: EmpleadoUpdate): Observable<void>;
  retire(id: number, motivo: string, fechaCese?: string): Observable<void>;
}

export const EMPLEADOS_GATEWAY =
  new InjectionToken<EmpleadosGateway>('EMPLEADOS_GATEWAY');
