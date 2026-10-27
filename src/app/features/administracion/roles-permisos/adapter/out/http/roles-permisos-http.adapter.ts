import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  RoleCreateRequest,
  RoleDisableRequest,
  RolePermissionsUpdateRequest,
  RoleUpdateRequest,
  RolesYPermisosService,
} from '../../../../../../infrastructure/openapi/generated';
import { RolesPermisosGateway } from '../../../application/port/out/roles-permisos.gateway';
import { RolPermisoUpdate } from '../../../domain/rol-permiso.model';
import { RolCreate, RolUpdate } from '../../../domain/rol.model';
import { RolesPermisosHttpMapper } from './roles-permisos-http.mapper';

@Injectable()
export class RolesPermisosHttpAdapter implements RolesPermisosGateway {
  private readonly api = inject(RolesYPermisosService);
  private readonly mapper = inject(RolesPermisosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(page: number, size: number) {
    return this.api
      .rolesListar(
        { pagina: page, tamano: size },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.page(response, size)));
  }

  get(id: number) {
    return this.api
      .rolesVer(
        { id },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.detail(response)));
  }

  create(input: RolCreate) {
    const roleCreateRequest: RoleCreateRequest = {
      codigo: input.codigo,
      nombre: input.nombre,
      descripcion: input.descripcion,
      requiereSegundoFactor: input.requiereSegundoFactor,
    };

    return this.api
      .rolesCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          roleCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  update(id: number, input: RolUpdate) {
    const roleUpdateRequest: RoleUpdateRequest = {
      nombre: input.nombre,
      descripcion: input.descripcion,
      requiereSegundoFactor: input.requiereSegundoFactor,
    };

    return this.api
      .rolesEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          roleUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  disable(id: number, motivo: string) {
    const roleDisableRequest: RoleDisableRequest = { motivo };

    return this.api
      .rolesDeshabilitar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          roleDisableRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  updatePermissions(id: number, input: RolPermisoUpdate) {
    const rolePermissionsUpdateRequest: RolePermissionsUpdateRequest = {
      permisoIds: [...input.permisoIds],
      motivo: input.motivo,
    };

    return this.api
      .rolesActualizarPermisos(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          rolePermissionsUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }
}
