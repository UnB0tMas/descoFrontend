import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, isApiError } from '../../core/http/models/api-error.model';
import { safeApiMessage } from '../../core/http/safe-api-message';
import { ApiEnvelopeError } from './api-response-unwrapper';

export function mapOpenApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return { ...error, message: safeApiMessage(error.status, error.message), details: null };
  }

  if (error instanceof ApiEnvelopeError) {
    return {
      status: 400,
      code: error.code,
      message: safeApiMessage(400, error.message),
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
    const candidate =
      typeof payload['mensaje'] === 'string' ? payload['mensaje'] : null;

    return {
      status: error.status,
      code: typeof payload['codigo'] === 'string' ? payload['codigo'] : 'ERROR_HTTP',
      message: safeApiMessage(error.status, candidate),
      correlationId:
        typeof payload['correlacionId'] === 'string' ? payload['correlacionId'] : null,
      timestamp:
        typeof payload['fechaHoraUtc'] === 'string' ? payload['fechaHoraUtc'] : null,
      details: null,
    };
  }

  return {
    status: 0,
    code: 'ERROR_CLIENTE',
    message: safeApiMessage(0, null),
    correlationId: null,
    timestamp: null,
    details: null,
  };
}
