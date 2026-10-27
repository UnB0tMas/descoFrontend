import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../shared/admin-api.mapper';
import {
  Empleado,
  EmpleadoAreaHistorial,
  EmpleadoDetalle,
  EmpleadoRol,
  EmpleadoUsuario,
} from '../../../domain/empleado.model';

@Injectable()
export class EmpleadosHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.employee(row), size);
  }

  detail(response: unknown): EmpleadoDetalle {
    const raw = this.api.record(this.api.data<unknown>(response));
    const userRaw = this.api.record(raw['usuario']);

    return {
      ...this.employee(raw),
      fechaNacimiento: this.api.nullableString(raw['fechaNacimiento']),
      distritoCodigo: this.api.string(raw['distritoCodigo']),
      distritoNombre: this.api.nullableString(raw['distritoNombre']),
      centroPobladoId: this.api.nullableNumber(raw['centroPobladoId']),
      centroPobladoNombre: this.api.nullableString(raw['centroPobladoNombre']),
      referencia: this.api.nullableString(raw['referencia']),
      areas: this.api
        .array(raw['areas'])
        .map((item) => this.areaHistory(this.api.record(item))),
      usuario:
        this.api.nullableNumber(userRaw['usuarioId']) === null
          ? null
          : this.user(userRaw),
      roles: this.api
        .array(raw['roles'])
        .map((item) => this.role(this.api.record(item))),
    };
  }

  createdId(response: unknown): number {
    const raw = this.api.record(this.api.data<unknown>(response));
    return this.api.number(raw['empleadoId']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private employee(row: Record<string, unknown>): Empleado {
    return {
      empleadoId: this.api.number(row['empleadoId']),
      empresaId: this.api.number(row['empresaId']),
      empresa: this.api.string(row['empresa']),
      codigoEmpleado: this.api.string(row['codigoEmpleado']),
      fechaIngreso: this.api.nullableString(row['fechaIngreso']),
      fechaCese: this.api.nullableString(row['fechaCese']),
      estado: this.api.boolean(row['estado']),
      tipoDocumento: this.api.string(row['tipoDocumento']),
      numeroDocumento: this.api.string(row['numeroDocumento']),
      nombres: this.api.string(row['nombres']),
      apellidoPaterno: this.api.string(row['apellidoPaterno']),
      apellidoMaterno: this.api.nullableString(row['apellidoMaterno']),
      telefono: this.api.nullableString(row['telefono']),
      correo: this.api.nullableString(row['correo']),
      areaId: this.api.nullableNumber(row['areaId']),
      area: this.api.nullableString(row['area']),
      cargo: this.api.nullableString(row['cargo']),
      usuarioId: this.api.nullableNumber(row['usuarioId']),
      nombreUsuario: this.api.nullableString(row['nombreUsuario']),
      estadoCuenta: this.api.nullableString(row['estadoCuenta']),
    };
  }

  private areaHistory(row: Record<string, unknown>): EmpleadoAreaHistorial {
    return {
      empleadoAreaId: this.api.number(row['empleadoAreaId']),
      areaId: this.api.number(row['areaId']),
      area: this.api.string(row['area']),
      cargo: this.api.nullableString(row['cargo']),
      fechaDesde: this.api.nullableString(row['fechaDesde']),
      fechaHasta: this.api.nullableString(row['fechaHasta']),
      estado: this.api.boolean(row['estado']),
    };
  }

  private user(row: Record<string, unknown>): EmpleadoUsuario {
    return {
      usuarioId: this.api.number(row['usuarioId']),
      nombreUsuario: this.api.string(row['nombreUsuario']),
      estadoCuenta: this.api.nullableString(row['estadoCuenta']),
      ultimoAccesoCorrecto: this.api.nullableString(row['ultimoAccesoCorrecto']),
      segundoFactorHabilitado: this.api.boolean(row['segundoFactorHabilitado']),
    };
  }

  private role(row: Record<string, unknown>): EmpleadoRol {
    return {
      rolId: this.api.number(row['rolId']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      fechaDesde: this.api.nullableString(row['fechaDesde']),
      fechaHasta: this.api.nullableString(row['fechaHasta']),
      estado: this.api.boolean(row['estado']),
    };
  }
}
