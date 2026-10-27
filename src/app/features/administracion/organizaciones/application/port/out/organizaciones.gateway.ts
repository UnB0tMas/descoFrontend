import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import {
  AsociacionCreate,
  AsociacionUpdate,
} from '../../../domain/asociacion.model';
import { Area, AreaCreate, AreaUpdate } from '../../../domain/area.model';
import {
  Empresa,
  EmpresaCreate,
  EmpresaUpdate,
  OrganizacionDetalle,
} from '../../../domain/empresa.model';

export interface OrganizacionesGateway {
  list(page: number, size: number, uotId?: number): Observable<PageResult<Empresa>>;
  get(id: number, uotId?: number): Observable<OrganizacionDetalle>;

  createCompany(input: EmpresaCreate): Observable<number>;
  updateCompany(id: number, input: EmpresaUpdate): Observable<void>;

  createAssociation(input: AsociacionCreate): Observable<number>;
  updateAssociation(id: number, input: AsociacionUpdate): Observable<void>;
  disableOrganization(id: number, uotId: number, reason: string): Observable<void>;

  listAreas(
    page: number,
    size: number,
    uotId?: number,
    empresaId?: number,
  ): Observable<PageResult<Area>>;
  createArea(input: AreaCreate): Observable<number>;
  updateArea(id: number, input: AreaUpdate): Observable<void>;
  disableArea(id: number, uotId: number, reason: string): Observable<void>;
}

export const ORGANIZACIONES_GATEWAY =
  new InjectionToken<OrganizacionesGateway>('ORGANIZACIONES_GATEWAY');
