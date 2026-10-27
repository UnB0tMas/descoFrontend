import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../shared/admin-api.mapper';
import { UsuarioDispositivo } from '../../../domain/usuario-dispositivo.model';
import {
  Usuario,
  UsuarioDetalle,
  UsuarioRol,
} from '../../../domain/usuario.model';

@Injectable()
export class UsuariosHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.user(row), size);
  }

  detail(response: unknown): UsuarioDetalle {
    const raw = this.api.record(this.api.data<unknown>(response));

    return {
      usuarioId: this.api.number(raw['usuarioId']),
      nombreUsuario: this.api.string(raw['nombreUsuario']),
      estadoCuenta: this.api.nullableString(raw['estadoCuenta']),
      estado: this.api.boolean(raw['estado']),
      fechaCreacion: this.api.nullableString(raw['fechaCreacion']),
      ultimoAccesoCorrecto: this.api.nullableString(raw['ultimoAccesoCorrecto']),
      fechaCambioPassword: this.api.nullableString(raw['fechaCambioPassword']),
      requiereCambioPassword: this.api.boolean(raw['requiereCambioPassword']),
      segundoFactorHabilitado: this.api.boolean(raw['segundoFactorHabilitado']),
      empleadoId: this.api.number(raw['empleadoId']),
      numeroDocumento: this.api.nullableString(raw['numeroDocumento']),
      empleado: this.api.nullableString(raw['empleado']),
      roles: this.api
        .array(raw['roles'])
        .map((item) => this.role(this.api.record(item))),
      dispositivos: this.api
        .array(raw['dispositivos'])
        .map((item) => this.device(this.api.record(item))),
    };
  }

  createdId(response: unknown): number {
    const raw = this.api.record(this.api.data<unknown>(response));
    return this.api.number(raw['usuarioId']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private user(row: Record<string, unknown>): Usuario {
    return {
      usuarioId: this.api.number(row['usuarioId']),
      nombreUsuario: this.api.string(row['nombreUsuario']),
      estadoCuenta: this.api.nullableString(row['estadoCuenta']),
      fechaCreacion: this.api.nullableString(row['fechaCreacion']),
      ultimoAccesoCorrecto: this.api.nullableString(row['ultimoAccesoCorrecto']),
      intentosFallidos: this.api.number(row['intentosFallidos']),
      bloqueadoHasta: this.api.nullableString(row['bloqueadoHasta']),
      segundoFactorHabilitado: this.api.boolean(row['segundoFactorHabilitado']),
      empleadoId: this.api.number(row['empleadoId']),
      codigoEmpleado: this.api.nullableString(row['codigoEmpleado']),
      empresa: this.api.nullableString(row['empresa']),
      numeroDocumento: this.api.nullableString(row['numeroDocumento']),
      empleado: this.api.nullableString(row['empleado']),
      rolesActivos: this.api.number(row['rolesActivos']),
      sesionesActivas: this.api.number(row['sesionesActivas']),
    };
  }

  private role(row: Record<string, unknown>): UsuarioRol {
    return {
      rolId: this.api.number(row['rolId']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      fechaDesde: this.api.nullableString(row['fechaDesde']),
      fechaHasta: this.api.nullableString(row['fechaHasta']),
      estado: this.api.boolean(row['estado']),
    };
  }

  private device(row: Record<string, unknown>): UsuarioDispositivo {
    return {
      dispositivoUsuarioId: this.api.number(row['dispositivoUsuarioId']),
      navegador: this.api.nullableString(row['navegador']),
      sistemaOperativo: this.api.nullableString(row['sistemaOperativo']),
      primeraDeteccion: this.api.nullableString(row['primeraDeteccion']),
      ultimaActividad: this.api.nullableString(row['ultimaActividad']),
      esReconocido: this.api.boolean(row['esReconocido']),
      fechaReconocimiento: this.api.nullableString(row['fechaReconocimiento']),
      fechaRetiroReconocimiento: this.api.nullableString(
        row['fechaRetiroReconocimiento'],
      ),
      estado: this.api.boolean(row['estado']),
    };
  }
}
