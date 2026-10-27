import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../shared/admin-api.mapper';
import { Permiso } from '../../../domain/permiso.model';
import {
  Rol,
  RolDetalle,
  RolUsuario,
} from '../../../domain/rol.model';

@Injectable()
export class RolesPermisosHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.role(row), size);
  }

  detail(response: unknown): RolDetalle {
    const raw = this.api.record(this.api.data<unknown>(response));

    return {
      rol: this.role(this.api.record(raw['rol'])),
      permisos: this.api
        .array(raw['permisos'])
        .map((item) => this.permission(this.api.record(item))),
      usuarios: this.api
        .array(raw['usuarios'])
        .map((item) => this.user(this.api.record(item))),
    };
  }

  createdId(response: unknown): number {
    const raw = this.api.record(this.api.data<unknown>(response));
    return this.api.number(raw['rolId']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private role(row: Record<string, unknown>): Rol {
    return {
      rolId: this.api.number(row['rolId']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      descripcion: this.api.nullableString(row['descripcion']),
      requiereSegundoFactor: this.api.boolean(row['requiereSegundoFactor']),
      esSistema: this.api.boolean(row['esSistema']),
      estado: this.api.boolean(row['estado']),
      usuariosActivos: this.api.number(row['usuariosActivos']),
      permisosActivos: this.api.number(row['permisosActivos']),
    };
  }

  private permission(row: Record<string, unknown>): Permiso {
    return {
      permisoId: this.api.number(row['permisoId']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      accion: this.api.nullableString(row['accion']),
      esSensible: this.api.boolean(row['esSensible']),
      requiereMotivo: this.api.boolean(row['requiereMotivo']),
      moduloCodigo: this.api.string(row['moduloCodigo']),
      moduloNombre: this.api.string(row['moduloNombre']),
      estado: this.api.boolean(row['estado']),
    };
  }

  private user(row: Record<string, unknown>): RolUsuario {
    return {
      usuarioId: this.api.number(row['usuarioId']),
      nombreUsuario: this.api.string(row['nombreUsuario']),
      numeroDocumento: this.api.nullableString(row['numeroDocumento']),
      empleado: this.api.nullableString(row['empleado']),
      fechaDesde: this.api.nullableString(row['fechaDesde']),
      fechaHasta: this.api.nullableString(row['fechaHasta']),
      estado: this.api.boolean(row['estado']),
    };
  }
}
