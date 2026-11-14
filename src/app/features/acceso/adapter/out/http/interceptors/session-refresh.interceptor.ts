import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  defer,
  finalize,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { AccessService } from '../../../../../../core/access/access.service';
import { SKIP_SESSION_REFRESH } from '../../../../../../core/http/context/http-context.tokens';
import { SessionStore } from '../../../../../../core/session/session.store';
import { RefrescarSesionUseCase } from '../../../../application/use-case/refrescar-sesion.use-case';
import { AuthRefreshResult } from '../../../../domain/auth-context.model';

let refreshInFlight$: Observable<AuthRefreshResult> | null = null;

function expiresSoon(value: string | null): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now() + 30_000;
}

/** Una sesión expirada nunca se transforma en autorización implícita de administrador. */
export const sessionRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_SESSION_REFRESH)) return next(request);

  const session = inject(SessionStore);
  const access = inject(AccessService);
  const router = inject(Router);
  const refreshUseCase = inject(RefrescarSesionUseCase);

  const invalidateSession = (): void => {
    session.clear();
    access.clear();
    if (!router.url.startsWith('/login')) {
      void router.navigateByUrl('/login');
    }
  };

  const refreshOnce = (): Observable<AuthRefreshResult> => {
    if (!refreshInFlight$) {
      refreshInFlight$ = defer(() => refreshUseCase.execute()).pipe(
        catchError((error: unknown) => {
          invalidateSession();
          return throwError(() => error);
        }),
        finalize(() => { refreshInFlight$ = null; }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return refreshInFlight$;
  };

  const send = () => next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      if (!session.refreshToken()) {
        invalidateSession();
        return throwError(() => error);
      }
      // El interceptor de access token vuelve a leer el token renovado.
      return refreshOnce().pipe(
        switchMap(() => next(request)),
        catchError((retryError: unknown) => {
          if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
            invalidateSession();
          }
          return throwError(() => retryError);
        }),
      );
    }),
  );

  // Renueva antes del vencimiento para evitar cadenas de 401 al cargar un módulo.
  if (session.authenticated() && session.refreshToken() &&
      expiresSoon(session.tokens()?.accessTokenExpiresAt ?? null)) {
    return refreshOnce().pipe(switchMap(() => send()));
  }

  return send();
};
