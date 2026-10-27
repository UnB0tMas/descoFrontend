import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../../administracion/shared/admin-api.mapper';
import { DisponibilidadRecurso } from '../../../domain/disponibilidad-recurso.model';
import {
  DestinoRecursoProgramado,
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

  destinations(response: unknown): readonly DestinoRecursoProgramado[] {
    const rows = this.api.array(this.api.data<unknown>(response));

    return rows.map((item) => {
      const row = this.api.record(item);
      const type = this.api.string(row['tipo']);

      return {
        tipo:
          type === 'CAMPANIA' || type === 'OPERATIVO' || type === 'SALIDA'
            ? type
            : 'SALIDA',
        destinoId: this.api.number(row['destinoId']),
        uotId: this.api.number(row['uotId']),
        uotCodigo: this.api.nullableString(row['uotCodigo']),
        uotNombre: this.api.nullableString(row['uotNombre']),
        codigo: this.api.nullableString(row['codigo']),
        nombre: this.api.string(row['nombre']),
        estadoProceso: this.api.nullableString(row['estadoProceso']),
        fechaReferencia: this.api.nullableString(row['fechaReferencia']),
        descripcion: this.api.nullableString(row['descripcion']),
      };
    });
  }

  availability(response: unknown): DisponibilidadRecurso {
    const row = this.api.record(this.api.data<unknown>(response));
    return {
      bienes: this.api.array(row['bienes']).map((item) => {
        const value = this.api.record(item);
        return {
          bienInventarioId: this.api.number(value['bienInventarioId']),
          uotId: this.api.number(value['uotId']),
          uotCodigo: this.api.nullableString(value['uotCodigo']),
          uotNombre: this.api.nullableString(value['uotNombre']),
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
          uotId: this.api.number(value['uotId']),
          uotCodigo: this.api.nullableString(value['uotCodigo']),
          uotNombre: this.api.nullableString(value['uotNombre']),
          codigo: this.api.string(value['codigo']),
          nombre: this.api.string(value['nombre']),
          unidadMedida: this.api.string(value['unidadMedida']),
          stockActual: this.api.number(value['stockActual']),
          stockReservado: this.api.number(value['stockReservado']),
          stockDisponible: this.api.number(value['stockDisponible']),
          stockMinimo: this.api.number(value['stockMinimo']),
          requiereReposicion: this.api.boolean(value['requiereReposicion']),
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
      cantidadPendiente: this.api.number(row['cantidadPendiente']),
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
