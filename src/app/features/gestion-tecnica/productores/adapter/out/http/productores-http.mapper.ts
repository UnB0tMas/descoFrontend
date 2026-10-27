import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../../administracion/shared/admin-api.mapper';
import {
  ProductorAfiliacion,
  ProductorCampania,
  ProductorDetalle,
  ProductorPredio,
} from '../../../domain/productor-detalle.model';
import { Productor } from '../../../domain/productor.model';

@Injectable()
export class ProductoresHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.summary(row), size);
  }

  detail(response: unknown): ProductorDetalle {
    const row = this.api.record(this.api.data<unknown>(response));
    const memberships = this.api
      .array(row['afiliaciones'])
      .map((item) => this.membership(this.api.record(item)));
    const currentMembership =
      memberships.find((item) => item.estado && !item.fechaHasta) ??
      memberships.find((item) => item.estado) ??
      memberships[0] ??
      null;

    return {
      ...this.summary(row),
      socioAsociacionId: currentMembership?.socioAsociacionId ?? null,
      asociacionId: currentMembership?.asociacionId ?? null,
      codigoSocio: currentMembership?.codigoSocio ?? null,
      situacionMembresia: currentMembership?.situacionMembresia ?? null,
      asociacionNombre: currentMembership?.asociacionNombre ?? null,
      fechaNacimiento: this.api.nullableString(row['fechaNacimiento']),
      distritoCodigo: this.api.string(row['distritoCodigo']),
      distritoNombre: this.api.nullableString(row['distritoNombre']),
      centroPobladoId: this.api.nullableNumber(row['centroPobladoId']),
      centroPobladoNombre: this.api.nullableString(row['centroPobladoNombre']),
      referencia: this.api.nullableString(row['referencia']),
      afiliaciones: memberships,
      predios: this.api.array(row['predios']).map((item) => this.property(this.api.record(item))),
      campanias: this.api.array(row['campanias']).map((item) => this.campaign(this.api.record(item))),
    };
  }

  createdId(response: unknown): number {
    const row = this.api.record(this.api.data<unknown>(response));
    return this.api.number(row['socioId']);
  }

  void(response: unknown): void { this.api.void(response); }

  private summary(row: Record<string, unknown>): Productor {
    return {
      socioId: this.api.number(row['socioId']),
      tipoDocumento: this.api.string(row['tipoDocumento']),
      numeroDocumento: this.api.string(row['numeroDocumento']),
      nombres: this.api.string(row['nombres']),
      apellidoPaterno: this.api.string(row['apellidoPaterno']),
      apellidoMaterno: this.api.nullableString(row['apellidoMaterno']),
      telefono: this.api.nullableString(row['telefono']),
      correo: this.api.nullableString(row['correo']),
      fechaAlta: this.api.nullableString(row['fechaAlta']),
      estado: this.api.boolean(row['estado']),
      socioAsociacionId: this.api.nullableNumber(row['socioAsociacionId']),
      asociacionId: this.api.nullableNumber(row['asociacionId']),
      codigoSocio: this.api.nullableString(row['codigoSocio']),
      situacionMembresia: this.api.nullableString(row['situacionMembresia']),
      asociacionNombre: this.api.nullableString(row['asociacionNombre']),
    };
  }

  private membership(row: Record<string, unknown>): ProductorAfiliacion {
    return {
      socioAsociacionId: this.api.number(row['socioAsociacionId']),
      asociacionId: this.api.number(row['asociacionId']),
      asociacionNombre: this.api.string(row['asociacionNombre']),
      codigoSocio: this.api.string(row['codigoSocio']),
      fechaDesde: this.api.nullableString(row['fechaDesde']),
      fechaHasta: this.api.nullableString(row['fechaHasta']),
      situacionMembresia: this.api.string(row['situacionMembresia']),
      estado: this.api.boolean(row['estado']),
    };
  }

  private property(row: Record<string, unknown>): ProductorPredio {
    return {
      predioId: this.api.number(row['predioId']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      fechaRegistro: this.api.nullableString(row['fechaRegistro']),
      estado: this.api.boolean(row['estado']),
      tipoTitularidad: this.api.nullableString(row['tipoTitularidad']),
      porcentaje: this.api.nullableNumber(row['porcentaje']),
      fechaDesde: this.api.nullableString(row['fechaDesde']),
      fechaHasta: this.api.nullableString(row['fechaHasta']),
    };
  }

  private campaign(row: Record<string, unknown>): ProductorCampania {
    return {
      participacionCampaniaSocioId: this.api.number(row['participacionCampaniaSocioId']),
      campaniaVentaId: this.api.number(row['campaniaVentaId']),
      codigo: this.api.string(row['codigo']),
      nombre: this.api.string(row['nombre']),
      fechaInicio: this.api.nullableString(row['fechaInicio']),
      fechaFin: this.api.nullableString(row['fechaFin']),
      estadoProceso: this.api.string(row['estadoProceso']),
      estadoParticipacion: this.api.string(row['estadoParticipacion']),
      fechaRegistro: this.api.nullableString(row['fechaRegistro']),
    };
  }
}
