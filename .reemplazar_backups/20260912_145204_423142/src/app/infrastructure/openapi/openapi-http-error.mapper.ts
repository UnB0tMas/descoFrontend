import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, isApiError } from '../../core/http/models/api-error.model';
import { ApiEnvelopeError } from './api-response-unwrapper';

const DEFAULT_MESSAGE =
  'No fue posible completar la operación. Intente nuevamente.';

export function mapOpenApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return {
      ...error,
      message: userMessage(error.status, error.message),
    };
  }

  if (error instanceof ApiEnvelopeError) {
    return {
      status: 400,
      code: error.code,
      message: userMessage(400, error.message),
      correlationId: error.correlationId,
      timestamp: null,
      details: null,
    };
  }

  if (error instanceof HttpErrorResponse) {
    const payload =
      error.error && typeof error.error === 'object'
        ? (error.error as Record<string, unknown>)
        : {};

    const backendMessage =
      typeof payload['mensaje'] === 'string'
        ? payload['mensaje']
        : null;

    return {
      status: error.status,
      code:
        typeof payload['codigo'] === 'string'
          ? payload['codigo']
          : 'ERROR_HTTP',
      message: userMessage(error.status, backendMessage),
      correlationId:
        typeof payload['correlacionId'] === 'string'
          ? payload['correlacionId']
          : null,
      timestamp:
        typeof payload['fechaHoraUtc'] === 'string'
          ? payload['fechaHoraUtc']
          : null,
      details: error.error,
    };
  }

  return {
    status: 0,
    code: 'ERROR_CLIENTE',
    message: DEFAULT_MESSAGE,
    correlationId: null,
    timestamp: null,
    details: error,
  };
}

function userMessage(
  status: number,
  candidate: string | null | undefined,
): string {
  if (status === 0) {
    return 'No fue posible conectarse al sistema. Verifique su conexión e intente nuevamente.';
  }

  if (status === 401) {
    return 'Su sesión no es válida. Inicie sesión nuevamente.';
  }

  if (status === 403) {
    return 'No cuenta con autorización para realizar esta acción.';
  }

  if (status === 404) {
    return safeCandidate(candidate)
      ?? 'No se encontró la información solicitada.';
  }

  if (status === 409) {
    return safeCandidate(candidate)
      ?? 'No fue posible completar la operación porque la información ya existe o cambió.';
  }

  if (status === 429) {
    return 'Se realizaron demasiadas solicitudes. Intente nuevamente en unos momentos.';
  }

  if (status >= 500) {
    return 'No fue posible completar la operación en este momento. Intente nuevamente.';
  }

  return safeCandidate(candidate) ?? DEFAULT_MESSAGE;
}

function safeCandidate(
  candidate: string | null | undefined,
): string | null {
  if (!candidate?.trim()) {
    return null;
  }

  const value = candidate.trim();

  if (isTechnicalMessage(value)) {
    return null;
  }

  return value;
}

function isTechnicalMessage(value: string): boolean {
  const normalized = value.toLowerCase();

  const technicalMarkers = [
    'exception',
    'stacktrace',
    'stack trace',
    'sqlstate',
    'sqlexception',
    'jdbc',
    'simplejdbccall',
    'stored procedure',
    'procedimiento almacenado',
    'constraint',
    'foreign key',
    'primary key',
    'nullpointer',
    'classcastexception',
    'timeout exception',
    'http://',
    'https://',
    '/api/',
    'endpoint',
    'bearer',
    'token',
    'provider',
    'proveedor externo',
    'factiliza',
    'verificape',
    'reniec api',
    'sunat api',
  ];

  return technicalMarkers.some((marker) =>
    normalized.includes(marker)
  );
}
