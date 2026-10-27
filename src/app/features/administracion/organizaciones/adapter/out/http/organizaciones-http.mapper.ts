import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../shared/admin-api.mapper';
import { Area } from '../../../domain/area.model';
import {
  Empresa,
  OrganizacionDetalle,
  OrganizacionEmpleado,
} from '../../../domain/empresa.model';

@Injectable()
export class OrganizacionesHttpMapper {
  private readonly api = inject(AdminApiMapper);

  organizationsPage(response: unknown, size: number) {
    return this.api.page(response, (row) => this.company(row), size);
  }

  areasPage(response: unknown, size: number) {
    return this.api.page(response, (row) => this.area(row), size);
  }

  detail(response: unknown): OrganizacionDetalle {
    const raw = this.api.record(this.api.data<unknown>(response));

    return {
      organizacion: this.company(this.api.record(raw['organizacion'])),
      distritoCodigo: this.api.string(raw['distritoCodigo']),
      distritoNombre: this.api.nullableString(raw['distritoNombre']),
      centroPobladoId: this.api.nullableNumber(raw['centroPobladoId']),
      centroPobladoNombre: this.api.nullableString(raw['centroPobladoNombre']),
      referencia: this.api.nullableString(raw['referencia']),
      altitudM: this.api.nullableNumber(raw['altitudM']),
      posicionWkt: this.api.nullableString(raw['posicionWkt']),
      posicionSrid: this.api.nullableNumber(raw['posicionSrid']),
      areas: this.api
        .array(raw['areas'])
        .map((item) => this.area(this.api.record(item))),
      empleados: this.api
        .array(raw['empleados'])
        .map((item) => this.employee(this.api.record(item))),
    };
  }

  createdId(response: unknown): number {
    const raw = this.api.record(this.api.data<unknown>(response));
    return this.api.number(raw['id']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private company(row: Record<string, unknown>): Empresa {
    return {
      empresaId: this.api.number(row['empresaId']),
      uotId: this.api.number(row['uotId']),
      uotCodigo: this.api.string(row['uotCodigo']),
      uotNombre: this.api.string(row['uotNombre']),
      ruc: this.api.string(row['ruc']),
      razonSocial: this.api.string(row['razonSocial']),
      nombreComercial: this.api.nullableString(row['nombreComercial']),
      telefono: this.api.nullableString(row['telefono']),
      correo: this.api.nullableString(row['correo']),
      fechaCreacion: this.api.nullableString(row['fechaCreacion']),
      estado: this.api.boolean(row['estado']),
      esAsociacion: this.api.boolean(row['esAsociacion']),
      fechaConstitucion: this.api.nullableString(row['fechaConstitucion']),
      numeroPartida: this.api.nullableString(row['numeroPartida']),
    };
  }

  private area(row: Record<string, unknown>): Area {
    return {
      areaId: this.api.number(row['areaId']),
      uotId: this.api.number(row['uotId']),
      uotCodigo: this.api.string(row['uotCodigo']),
      uotNombre: this.api.string(row['uotNombre']),
      empresaId: this.api.number(row['empresaId']),
      empresa: this.api.string(row['empresa']),
      areaPadreId: this.api.nullableNumber(row['areaPadreId']),
      areaPadre: this.api.nullableString(row['areaPadre']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      estado: this.api.boolean(row['estado']),
    };
  }

  private employee(row: Record<string, unknown>): OrganizacionEmpleado {
    return {
      empleadoId: this.api.number(row['empleadoId']),
      codigoEmpleado: this.api.nullableString(row['codigoEmpleado']),
      numeroDocumento: this.api.nullableString(row['numeroDocumento']),
      empleado: this.api.string(row['empleado']),
    };
  }
}
