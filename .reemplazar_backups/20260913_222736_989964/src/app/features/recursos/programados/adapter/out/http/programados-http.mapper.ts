import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../../administracion/shared/admin-api.mapper';
import { DisponibilidadRecurso } from '../../../domain/disponibilidad-recurso.model';
import {
  RecursoProgramado,
  RecursoProgramadoDetalle,
  RecursoProgramadoMovimiento,
} from '../../../domain/recurso-programado.model';

@Injectable()
export class ProgramadosHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.summary(row), size);
  }

  detail(response: unknown): RecursoProgramadoDetalle {
    const row = this.api.record(this.api.data<unknown>(response));
    return {
      recursoProgramadoId: this.api.number(row['recursoProgramadoId']),
      campaniaVentaId: this.api.nullableNumber(row['campaniaVentaId']),
      operativoVentaId: this.api.nullableNumber(row['operativoVentaId']),
      salidaCampoId: this.api.nullableNumber(row['salidaCampoId']),
      bienInventarioId: this.api.nullableNumber(row['bienInventarioId']),
      bien: this.api.nullableString(row['bien']),
      estadoBien: this.api.nullableString(row['estadoBien']),
      suministroId: this.api.nullableNumber(row['suministroId']),
      suministro: this.api.nullableString(row['suministro']),
      unidadMedida: this.api.nullableString(row['unidadMedida']),
      cantidadProgramada: this.api.number(row['cantidadProgramada']),
      observacion: this.api.nullableString(row['observacion']),
      estado: this.api.boolean(row['estado']),
      estadoProceso: this.api.string(row['estadoProceso']),
      usuarioProgramacionId: this.api.nullableNumber(row['usuarioProgramacionId']),
      fechaProgramacion: this.api.nullableString(row['fechaProgramacion']),
      usuarioCancelacionId: this.api.nullableNumber(row['usuarioCancelacionId']),
      fechaCancelacion: this.api.nullableString(row['fechaCancelacion']),
      motivoCancelacion: this.api.nullableString(row['motivoCancelacion']),
      movimientos: this.api
        .array(row['movimientos'])
        .map((item) => this.movement(this.api.record(item))),
    };
  }

  availability(response: unknown): DisponibilidadRecurso {
    const row = this.api.record(this.api.data<unknown>(response));
    return {
      bienes: this.api.array(row['bienes']).map((item) => {
        const value = this.api.record(item);
        return {
          bienInventarioId: this.api.number(value['bienInventarioId']),
          codigoPatrimonial: this.api.string(value['codigoPatrimonial']),
          nombre: this.api.string(value['nombre']),
          estadoBien: this.api.string(value['estadoBien']),
          disponible: this.api.boolean(value['disponible']),
        };
      }),
      suministros: this.api.array(row['suministros']).map((item) => {
        const value = this.api.record(item);
        return {
          suministroId: this.api.number(value['suministroId']),
          codigo: this.api.string(value['codigo']),
          nombre: this.api.string(value['nombre']),
          unidadMedida: this.api.string(value['unidadMedida']),
          stockDisponible: this.api.number(value['stockDisponible']),
        };
      }),
    };
  }

  createdId(response: unknown): number {
    const row = this.api.record(this.api.data<unknown>(response));
    return this.api.number(row['recursoProgramadoId']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private summary(row: Record<string, unknown>): RecursoProgramado {
    return {
      recursoProgramadoId: this.api.number(row['recursoProgramadoId']),
      campaniaVentaId: this.api.nullableNumber(row['campaniaVentaId']),
      operativoVentaId: this.api.nullableNumber(row['operativoVentaId']),
      salidaCampoId: this.api.nullableNumber(row['salidaCampoId']),
      bienInventarioId: this.api.nullableNumber(row['bienInventarioId']),
      bien: this.api.nullableString(row['bien']),
      suministroId: this.api.nullableNumber(row['suministroId']),
      suministro: this.api.nullableString(row['suministro']),
      cantidadProgramada: this.api.number(row['cantidadProgramada']),
      estadoProceso: this.api.string(row['estadoProceso']),
      fechaProgramacion: this.api.nullableString(row['fechaProgramacion']),
      observacion: this.api.nullableString(row['observacion']),
      cantidadEjecutada: this.api.number(row['cantidadEjecutada']),
      cantidadDevuelta: this.api.number(row['cantidadDevuelta']),
    };
  }

  private movement(row: Record<string, unknown>): RecursoProgramadoMovimiento {
    return {
      recursoMovimientoId: this.api.number(row['recursoMovimientoId']),
      tipoMovimiento: this.api.string(row['tipoMovimiento']),
      cantidad: this.api.number(row['cantidad']),
      fechaHora: this.api.nullableString(row['fechaHora']),
      observacion: this.api.nullableString(row['observacion']),
      usuario: this.api.nullableString(row['usuario']),
    };
  }
}
