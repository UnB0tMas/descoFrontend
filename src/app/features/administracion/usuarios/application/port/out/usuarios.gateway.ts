import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { PageResult } from '../../../../../../shared/models/page-result.model';
import { UsuarioFiltro } from '../../../domain/usuario-filtro.model';
import { PoliticaSeguridadDispositivo } from '../../../domain/politica-seguridad.model';
import {
  Usuario,
  UsuarioCreate,
  UsuarioDetalle,
  UsuarioUpdate,
} from '../../../domain/usuario.model';

export interface UsuariosGateway {
  list(filter: UsuarioFiltro): Observable<PageResult<Usuario>>;
  get(id: number): Observable<UsuarioDetalle>;
  getSecurityPolicy(): Observable<PoliticaSeguridadDispositivo>;
  updateSecurityPolicy(diasDispositivoReconocido: number): Observable<void>;
  create(input: UsuarioCreate): Observable<number>;
  update(id: number, input: UsuarioUpdate): Observable<void>;
  disable(id: number, motivo: string): Observable<void>;
  reactivate(id: number, motivo?: string): Observable<void>;
  assignRole(id: number, rolId: number): Observable<void>;
  removeRole(id: number, rolId: number, motivo: string): Observable<void>;
}

export const USUARIOS_GATEWAY =
  new InjectionToken<UsuariosGateway>('USUARIOS_GATEWAY');
