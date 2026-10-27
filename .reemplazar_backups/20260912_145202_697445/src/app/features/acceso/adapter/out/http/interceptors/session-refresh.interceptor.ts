import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  finalize,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { SKIP_SESSION_REFRESH } from '../../../../../../core/http/context/http-context.tokens';
import { AccessService } from '../../../../../../core/access/access.service';
import { SessionStore } from '../../../../../../core/session/session.store';
import { AuthRefreshResult } from '../../../../domain/auth-context.model';
import { RefrescarSesionUseCase } from '../../../../application/use-case/refrescar-sesion.use-case';

let refreshInFlight$: Observable<AuthRefreshResult> | null = null;

export const sessionRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_SESSION_REFRESH)) {
    return next(request);
  }

  const session = inject(SessionStore);
  const access = inject(AccessService);
  const refreshUseCase = inject(RefrescarSesionUseCase);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        !session.refreshToken()
      ) {
        return throwError(() => error);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = defer(() => refreshUseCase.execute()).pipe(
          finalize(() => {
            refreshInFlight$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      }

      return refreshInFlight$.pipe(
        switchMap(() => next(request)),
        catchError((refreshError) => {
          session.clear();
          access.clear();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
