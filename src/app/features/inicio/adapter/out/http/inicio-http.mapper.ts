import { Injectable } from '@angular/core';

import { ApiEnvelope } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import { Dashboard } from '../../../domain/dashboard.model';
import {
  DashboardChart,
  DashboardChartSeries,
  DashboardChartType,
} from '../../../domain/grafico-dashboard.model';

type RecordValue = Record<string, unknown>;

@Injectable()
export class InicioHttpMapper {
  dashboard(response: unknown): Dashboard {
    const envelope = this.record(response) as ApiEnvelope<unknown>;

    if (envelope.exitoso === false) {
      throw new Error(envelope.mensaje || 'No se pudo cargar el dashboard.');
    }

    const data = this.record(envelope.datos);
    const period = this.record(data['periodo']);

    return {
      periodo: {
        desde: this.string(period['desde']),
        hasta: this.string(period['hasta']),
      },
      indicadores: this.array(data['indicadores'])
        .map((item) => {
          const row = this.record(item);

          return {
            codigo: this.string(row['codigo']),
            indicador: this.string(row['indicador']),
            valor: this.string(row['valor']),
            unidad: this.nullableString(row['unidad']),
            icono: this.nullableString(row['icono']),
            orden: this.number(row['orden']),
          };
        })
        .sort((a, b) => a.orden - b.orden),
      graficos: this.array(data['graficos'])
        .map((item) => this.chart(item))
        .sort((a, b) => a.orden - b.orden),
      alertas: this.array(data['alertas'])
        .map((item) => {
          const row = this.record(item);

          return {
            tipo: this.string(row['tipo']),
            mensaje: this.string(row['mensaje']),
            cantidad: this.number(row['cantidad']),
            orden: this.number(row['orden']),
          };
        })
        .sort((a, b) => a.orden - b.orden),
      accesosRapidos: this.array(data['accesosRapidos'])
        .map((item) => {
          const row = this.record(item);

          return {
            moduloId: this.number(row['moduloId']),
            codigoModulo: this.string(row['codigoModulo']),
            nombreModulo: this.string(row['nombreModulo']),
            ruta: this.string(row['ruta']),
            icono: this.nullableString(row['icono']),
            orden: this.number(row['orden']),
          };
        })
        .filter((item) => Boolean(item.ruta))
        .sort((a, b) => a.orden - b.orden),
    };
  }

  private chart(value: unknown): DashboardChart {
    const row = this.record(value);

    return {
      codigo: this.string(row['codigo']),
      titulo: this.string(row['titulo']),
      subtitulo: this.nullableString(row['subtitulo']),
      tipoGrafico: this.chartType(row['tipoGrafico']),
      unidad: this.nullableString(row['unidad']),
      ancho: Math.max(1, Math.min(2, this.number(row['ancho']) || 1)),
      orden: this.number(row['orden']),
      series: this.array(row['series'])
        .map((item) => this.chartSeries(item))
        .filter((item) => item.puntos.length > 0),
    };
  }

  private chartSeries(value: unknown): DashboardChartSeries {
    const row = this.record(value);

    return {
      nombre: this.string(row['nombre']),
      puntos: this.array(row['puntos'])
        .map((item) => {
          const point = this.record(item);

          return {
            categoria: this.string(point['categoria']),
            valor: this.number(point['valor']),
            orden: this.number(point['orden']),
          };
        })
        .sort((a, b) => a.orden - b.orden),
    };
  }

  private chartType(value: unknown): DashboardChartType {
    const candidate = this.string(value).toUpperCase();

    if (
      candidate === 'LINE' ||
      candidate === 'AREA' ||
      candidate === 'BAR' ||
      candidate === 'COLUMN' ||
      candidate === 'DONUT'
    ) {
      return candidate;
    }

    return 'BAR';
  }

  private record(value: unknown): RecordValue {
    return value && typeof value === 'object'
      ? (value as RecordValue)
      : {};
  }

  private array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private string(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
  }

  private nullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private number(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
