import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SKIP_CORRELATION_ID } from '../context/http-context.tokens';
import { CorrelationIdService } from '../services/correlation-id.service';

export const correlationIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_CORRELATION_ID)) {
    return next(request);
  }

  const correlationId = inject(CorrelationIdService).create();

  return next(
    request.clone({
      setHeaders: {
        'X-Correlation-Id': correlationId,
      },
    }),
  );
};
