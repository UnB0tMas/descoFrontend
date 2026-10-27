import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  UserAssignRoleRequest,
  UserCreateRequest,
  UserDisableRequest,
  UserReactivateRequest,
  UserRemoveRoleRequest,
  UserUpdateRequest,
  UsuariosYAccesosService,
} from '../../../../../../infrastructure/openapi/generated';
import { UsuariosGateway } from '../../../application/port/out/usuarios.gateway';
import { UsuarioFiltro } from '../../../domain/usuario-filtro.model';
import {
  UsuarioCreate,
  UsuarioUpdate,
} from '../../../domain/usuario.model';
import { UsuariosHttpMapper } from './usuarios-http.mapper';

@Injectable()
export class UsuariosHttpAdapter implements UsuariosGateway {
  private readonly api = inject(UsuariosYAccesosService);
  private readonly mapper = inject(UsuariosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: UsuarioFiltro) {
    return this.api
      .usuariosListar(
        {
          estadoCuenta: filter.estadoCuenta,
          empresaId: filter.empresaId,
          pagina: filter.page,
          tamano: filter.size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.page(response, filter.size)));
  }

  get(id: number) {
    return this.api
      .usuariosVer(
        { id },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.detail(response)));
  }

  create(input: UsuarioCreate) {
    const userCreateRequest: UserCreateRequest = {
      empleadoId: input.empleadoId,
      nombreUsuario: input.nombreUsuario,
      passwordInicial: input.passwordInicial,
      correoSeguridad: input.correoSeguridad,
      requiereCambioPassword: input.requiereCambioPassword,
      rolIds: [...input.rolIds],
    };

    return this.api
      .usuariosCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          userCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  update(id: number, input: UsuarioUpdate) {
    const userUpdateRequest: UserUpdateRequest = {
      nombreUsuario: input.nombreUsuario,
      requiereCambioPassword: input.requiereCambioPassword,
      segundoFactorHabilitado: input.segundoFactorHabilitado,
    };

    return this.api
      .usuariosEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          userUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  disable(id: number, motivo: string) {
    const userDisableRequest: UserDisableRequest = { motivo };

    return this.api
      .usuariosDeshabilitar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          userDisableRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  reactivate(id: number, motivo?: string) {
    const userReactivateRequest: UserReactivateRequest = { motivo };

    return this.api
      .usuariosReactivar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          userReactivateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  assignRole(id: number, rolId: number) {
    const userAssignRoleRequest: UserAssignRoleRequest = { rolId };

    return this.api
      .usuariosAsignarRol(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          userAssignRoleRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  removeRole(id: number, rolId: number, motivo: string) {
    const userRemoveRoleRequest: UserRemoveRoleRequest = {
      rolId,
      motivo,
    };

    return this.api
      .usuariosRetirarRol(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          userRemoveRoleRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }
}
