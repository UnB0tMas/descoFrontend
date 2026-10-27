import { Injectable } from '@angular/core';

import { ApiEnvelope } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import {
  AuthContext,
  AuthFlowResult,
  AuthRefreshResult,
} from '../../../domain/auth-context.model';
import { AuthChallenge } from '../../../domain/auth-challenge.model';
import { AuthStep } from '../../../domain/auth-step.model';
import { AuthToken } from '../../../domain/auth-token.model';

type RecordValue = Record<string, unknown>;

@Injectable()
export class AuthHttpMapper {
  envelopeData<T>(response: unknown): T {
    const envelope = this.record(response) as ApiEnvelope<T>;

    if (envelope.exitoso === false) {
      throw new Error(envelope.mensaje || 'La operación no pudo completarse.');
    }

    return envelope.datos as T;
  }

  flow(response: unknown): AuthFlowResult {
    const data = this.record(this.envelopeData<unknown>(response));

    return {
      paso: this.authStep(data['paso']),
      tokens: this.token(data['tokens']),
      contexto: this.context(data['contexto']),
      desafio: this.challenge(data['desafio']),
    };
  }

  refresh(response: unknown): AuthRefreshResult {
    const data = this.record(this.envelopeData<unknown>(response));
    const tokens = this.token(data['tokens']);
    const contexto = this.context(data['contexto']);

    if (!tokens || !contexto) {
      throw new Error('No se pudo renovar la sesión.');
    }

    return { tokens, contexto };
  }

  currentContext(response: unknown): AuthContext {
    const context = this.context(this.envelopeData<unknown>(response));

    if (!context) {
      throw new Error('No se pudo obtener la información de la sesión.');
    }

    return context;
  }

  challengeResponse(response: unknown): AuthChallenge {
    const challenge = this.challenge(this.envelopeData<unknown>(response));

    if (!challenge) {
      throw new Error('No se pudo continuar con la verificación.');
    }

    return challenge;
  }

  voidResponse(response: unknown): void {
    const envelope = this.record(response) as ApiEnvelope<unknown>;

    if (envelope.exitoso === false) {
      throw new Error(envelope.mensaje || 'La operación no pudo completarse.');
    }
  }

  private token(value: unknown): AuthToken | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = this.record(value);
    const accessToken = this.string(row['accessToken']);
    const refreshToken = this.string(row['refreshToken']);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      tokenType: this.string(row['tokenType']) || 'Bearer',
      accessTokenExpiraUtc: this.nullableString(row['accessTokenExpiraUtc']),
      refreshToken,
      refreshTokenExpiraUtc: this.nullableString(row['refreshTokenExpiraUtc']),
      sesionPublicaId: this.nullableString(row['sesionPublicaId']),
    };
  }

  private challenge(value: unknown): AuthChallenge | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = this.record(value);

    return {
      paso: this.authStep(row['paso']),
      usuarioId: this.nullableNumber(row['usuarioId']),
      nombreUsuario: this.nullableString(row['nombreUsuario']),
      correlacionId: this.nullableString(row['correlacionId']),
      correoEnmascarado: this.nullableString(row['correoEnmascarado']),
    };
  }

  private context(value: unknown): AuthContext | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const row = this.record(value);
    const user = this.record(row['usuario']);

    return {
      usuario: {
        usuarioId: this.number(user['usuarioId']),
        nombreUsuario: this.string(user['nombreUsuario']),
        estadoCuenta: this.nullableString(user['estadoCuenta']),
        ultimoAccesoCorrectoUtc: this.nullableString(user['ultimoAccesoCorrectoUtc']),
        requiereCambioPassword: this.boolean(user['requiereCambioPassword']),
        segundoFactorHabilitado: this.boolean(user['segundoFactorHabilitado']),
        tokenVersion: this.nullableNumber(user['tokenVersion']),
        personaId: this.nullableNumber(user['personaId']),
        tipoDocumento: this.nullableString(user['tipoDocumento']),
        numeroDocumento: this.nullableString(user['numeroDocumento']),
        nombres: this.nullableString(user['nombres']),
        apellidoPaterno: this.nullableString(user['apellidoPaterno']),
        apellidoMaterno: this.nullableString(user['apellidoMaterno']),
        nombreCompleto: this.nullableString(user['nombreCompleto']),
        telefono: this.nullableString(user['telefono']),
        codigoEmpleado: this.nullableString(user['codigoEmpleado']),
        empresaId: this.nullableNumber(user['empresaId']),
        correoSeguridad: this.nullableString(user['correoSeguridad']),
        correoSeguridadVerificado: this.boolean(user['correoSeguridadVerificado']),
        sesionPublicaId: this.nullableString(user['sesionPublicaId']),
        fechaSesionUtc: this.nullableString(user['fechaSesionUtc']),
        fechaExpiracionRenovacionUtc: this.nullableString(
          user['fechaExpiracionRenovacionUtc'],
        ),
        dispositivoUsuarioId: this.nullableNumber(user['dispositivoUsuarioId']),
        navegador: this.nullableString(user['navegador']),
        sistemaOperativo: this.nullableString(user['sistemaOperativo']),
        dispositivoReconocido: this.boolean(user['dispositivoReconocido']),
      },
      roles: this.array(row['roles']).map((item) => {
        const role = this.record(item);
        return {
          rolId: this.number(role['rolId']),
          codigo: this.string(role['codigo']),
          nombre: this.string(role['nombre']),
          descripcion: this.nullableString(role['descripcion']),
          requiereSegundoFactor: this.boolean(role['requiereSegundoFactor']),
        };
      }),
      modulos: this.array(row['modulos']).map((item) => {
        const module = this.record(item);
        return {
          moduloId: this.number(module['moduloId']),
          moduloPadreId: this.nullableNumber(module['moduloPadreId']),
          codigo: this.string(module['codigo']),
          nombre: this.string(module['nombre']),
          orden: this.number(module['orden']),
          ruta: this.nullableString(module['ruta']),
          icono: this.nullableString(module['icono']),
          visibleMenu: this.boolean(module['visibleMenu']),
          grupo: this.boolean(module['esGrupo']),
        };
      }),
      permisos: this.array(row['permisos']).map((item) => {
        const permission = this.record(item);
        return {
          permisoId: this.nullableNumber(permission['permisoId']),
          moduloId: this.nullableNumber(permission['moduloId']),
          codigoModulo: this.nullableString(permission['codigoModulo']),
          codigo: this.string(permission['codigo']),
          nombre: this.nullableString(permission['nombre']),
          descripcion: this.nullableString(permission['descripcion']),
          accion: this.nullableString(permission['accion']),
          sensible: this.boolean(permission['sensible']),
          requiereMotivo: this.boolean(permission['requiereMotivo']),
        };
      }),
    };
  }

  private authStep(value: unknown): AuthStep {
    switch (value) {
      case 'EMAIL_VERIFICATION_REQUIRED':
      case 'TWO_FACTOR_REQUIRED':
      case 'AUTHENTICATED':
        return value;
      default:
        throw new Error('No se pudo procesar el estado de autenticación.');
    }
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
}
