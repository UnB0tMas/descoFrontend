import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ApiError } from '../models/api-error.model';

interface BackendErrorEnvelope {
  codigo?: unknown;
  mensaje?: unknown;
  correlacionId?: unknown;
  fechaHoraUtc?: unknown;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const payload =
        error.error && typeof error.error === 'object'
          ? (error.error as BackendErrorEnvelope)
          : null;

      const normalized: ApiError = {
        status: error.status,
        code:
          typeof payload?.codigo === 'string'
            ? payload.codigo
            : error.status === 0
              ? 'SERVICIO_NO_DISPONIBLE'
              : 'ERROR_HTTP',
        message:
          typeof payload?.mensaje === 'string'
            ? payload.mensaje
            : error.status === 0
              ? 'No se pudo establecer comunicación con el servidor.'
              : error.message || 'La operación no pudo completarse.',
        correlationId:
          typeof payload?.correlacionId === 'string'
            ? payload.correlacionId
            : null,
        timestamp:
          typeof payload?.fechaHoraUtc === 'string'
            ? payload.fechaHoraUtc
            : null,
        details: error.error,
      };

      return throwError(() => normalized);
    }),
  );
