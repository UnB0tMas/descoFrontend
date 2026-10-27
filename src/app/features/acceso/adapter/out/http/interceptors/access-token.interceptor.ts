import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { SKIP_ACCESS_TOKEN } from '../../../../../../core/http/context/http-context.tokens';
import { SessionStore } from '../../../../../../core/session/session.store';

export const accessTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_ACCESS_TOKEN)) {
    return next(request);
  }

  const token = inject(SessionStore).accessToken();

  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
