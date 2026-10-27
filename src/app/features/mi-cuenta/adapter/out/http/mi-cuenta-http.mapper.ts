import { Injectable } from '@angular/core';

import { ApiEnvelope } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import { DispositivoCuenta } from '../../../domain/dispositivo.model';
import { SesionCuenta } from '../../../domain/sesion.model';

type RecordValue = Record<string, unknown>;

@Injectable()
export class MiCuentaHttpMapper {
  sessions(response: unknown): readonly SesionCuenta[] {
    return this.array(this.data(response))
      .map((item) => {
        const row = this.record(item);

        return {
          sesionPublicaId: this.string(row['sesionPublicaId']),
          fechaCreacionUtc: this.nullableString(row['fechaCreacionUtc']),
          fechaUltimaActividadUtc: this.nullableString(
            row['fechaUltimaActividadUtc'],
          ),
          fechaExpiracionRenovacionUtc: this.nullableString(
            row['fechaExpiracionRenovacionUtc'],
          ),
          ipCreacion: this.nullableString(row['ipCreacion']),
          ipUltimaActividad: this.nullableString(row['ipUltimaActividad']),
          sesionActual: this.boolean(row['sesionActual']),
          activa: this.boolean(row['activa']),
          dispositivoUsuarioId: this.nullableNumber(
            row['dispositivoUsuarioId'],
          ),
          navegador: this.nullableString(row['navegador']),
          sistemaOperativo: this.nullableString(row['sistemaOperativo']),
          fechaPrimeraDeteccionUtc: this.nullableString(
            row['fechaPrimeraDeteccionUtc'],
          ),
          fechaUltimaActividadDispositivoUtc: this.nullableString(
            row['fechaUltimaActividadDispositivoUtc'],
          ),
          reconocido: this.boolean(row['reconocido']),
        };
      })
      .sort((a, b) => {
        if (a.sesionActual !== b.sesionActual) {
          return a.sesionActual ? -1 : 1;
        }

        return this.dateValue(b.fechaUltimaActividadUtc) -
          this.dateValue(a.fechaUltimaActividadUtc);
      });
  }

  devices(response: unknown): readonly DispositivoCuenta[] {
    return this.array(this.data(response))
      .map((item) => {
        const row = this.record(item);

        return {
          dispositivoUsuarioId: this.number(row['dispositivoUsuarioId']),
          navegador: this.nullableString(row['navegador']),
          sistemaOperativo: this.nullableString(row['sistemaOperativo']),
          fechaPrimeraDeteccionUtc: this.nullableString(
            row['fechaPrimeraDeteccionUtc'],
          ),
          fechaUltimaActividadUtc: this.nullableString(
            row['fechaUltimaActividadUtc'],
          ),
          ultimaIp: this.nullableString(row['ultimaIp']),
          reconocidoVigente: this.boolean(row['reconocidoVigente']),
          fechaReconocimientoUtc: this.nullableString(
            row['fechaReconocimientoUtc'],
          ),
          fechaExpiracionReconocimientoUtc: this.nullableString(
            row['fechaExpiracionReconocimientoUtc'],
          ),
          dispositivoActual: this.boolean(row['dispositivoActual']),
        };
      })
      .sort((a, b) => {
        if (a.dispositivoActual !== b.dispositivoActual) {
          return a.dispositivoActual ? -1 : 1;
        }

        return this.dateValue(b.fechaUltimaActividadUtc) -
          this.dateValue(a.fechaUltimaActividadUtc);
      });
  }

  voidResponse(response: unknown): void {
    this.data(response);
  }

  private data(response: unknown): unknown {
    const envelope = this.record(response) as ApiEnvelope<unknown>;

    if (envelope.exitoso === false) {
      throw new Error(envelope.mensaje || 'La operación no pudo completarse.');
    }

    return envelope.datos;
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

  private nullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private boolean(value: unknown): boolean {
    return value === true || value === 1 || value === 'true' || value === '1';
  }

  private dateValue(value: string | null): number {
    if (!value) {
      return 0;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
