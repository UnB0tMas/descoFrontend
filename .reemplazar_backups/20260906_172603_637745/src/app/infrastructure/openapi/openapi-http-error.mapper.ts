import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, isApiError } from '../../core/http/models/api-error.model';
import { ApiEnvelopeError } from './api-response-unwrapper';

export function mapOpenApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof ApiEnvelopeError) {
    return {
      status: 400,
      code: error.code,
      message: error.message,
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

    return {
      status: error.status,
      code:
        typeof payload['codigo'] === 'string'
          ? payload['codigo']
          : 'ERROR_HTTP',
      message:
        typeof payload['mensaje'] === 'string'
          ? payload['mensaje']
          : error.message,
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
    message:
      error instanceof Error
        ? error.message
        : 'Se produjo un error no identificado.',
    correlationId: null,
    timestamp: null,
    details: error,
  };
}
