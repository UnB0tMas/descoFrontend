import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { RolPermisoUpdate } from '../../../domain/rol-permiso.model';
import {
  Rol,
  RolCreate,
  RolDetalle,
  RolUpdate,
} from '../../../domain/rol.model';

export interface RolesPermisosGateway {
  list(page: number, size: number): Observable<PageResult<Rol>>;
  get(id: number): Observable<RolDetalle>;
  create(input: RolCreate): Observable<number>;
  update(id: number, input: RolUpdate): Observable<void>;
  disable(id: number, motivo: string): Observable<void>;
  updatePermissions(id: number, input: RolPermisoUpdate): Observable<void>;
}

export const ROLES_PERMISOS_GATEWAY =
  new InjectionToken<RolesPermisosGateway>('ROLES_PERMISOS_GATEWAY');
