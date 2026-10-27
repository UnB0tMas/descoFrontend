import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { SessionStore } from '../../core/session/session.store';
import { UotApiService } from './adapter/out/http/uot-api.service';
import { UotContext } from './domain/uot.model';
import { UotContextStore } from './state/uot-context.store';

export const uotContextGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const api = inject(UotApiService);
  const store = inject(UotContextStore);
  const router = inject(Router);

  if (!session.authenticated()) {
    store.clear();
    return router.createUrlTree(['/login']);
  }

  const resolve = (context: UotContext): true | UrlTree => {
    if (
      context.modo === 'ESPECIFICA' &&
      !context.uotSeleccionadaId &&
      context.uots.length > 1
    ) {
      return router.createUrlTree(['/seleccionar-uot'], {
        queryParams: { returnUrl: state.url || '/inicio' },
      });
    }

    if (context.requiereSeleccion) {
      return router.createUrlTree(['/seleccionar-uot'], {
        queryParams: { returnUrl: state.url || '/inicio' },
      });
    }

    return true;
  };

  return api.loadContext().pipe(
    switchMap((context) => {
      if (
        context.modo === 'ESPECIFICA' &&
        !context.uotSeleccionadaId &&
        context.uots.length === 1
      ) {
        return api
          .selectContext('ESPECIFICA', context.uots[0].uotId)
          .pipe(map((selected) => resolve(selected)));
      }

      return of(resolve(context));
    }),
    catchError(() =>
      of(router.createUrlTree(['/service-unavailable'])),
    ),
  );
};
