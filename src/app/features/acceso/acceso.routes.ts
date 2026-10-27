import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AccessService } from '../../core/access/access.service';
import { AccessStore } from '../../core/access/access.store';
import { SessionStore } from '../../core/session/session.store';
import { ObtenerContextoActualUseCase } from './application/use-case/obtener-contexto-actual.use-case';

export const publicOnlyGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return session.authenticated()
    ? router.createUrlTree(['/inicio'])
    : true;
};

export const authenticatedGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const accessStore = inject(AccessStore);
  const accessService = inject(AccessService);
  const contextUseCase = inject(ObtenerContextoActualUseCase);
  const router = inject(Router);

  if (!session.authenticated()) {
    return router.createUrlTree(['/login']);
  }

  const mandatoryRoute = state.url.startsWith('/cambio-password-obligatorio');

  if (accessStore.loaded()) {
    const requiresChange = accessStore.user()?.requiereCambioPassword ?? false;

    return requiresChange && !mandatoryRoute
      ? router.createUrlTree(['/cambio-password-obligatorio'])
      : true;
  }

  return contextUseCase.execute().pipe(
    map((context) =>
      context.usuario.requiereCambioPassword && !mandatoryRoute
        ? router.createUrlTree(['/cambio-password-obligatorio'])
        : true,
    ),
    catchError(() => {
      session.clear();
      accessService.clear();
      return of(router.createUrlTree(['/login']));
    }),
  );
};

export const accesoRoutes: Routes = [
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'validacion-correo',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/validacion-correo/validacion-correo').then(
        (m) => m.ValidacionCorreoPage,
      ),
  },
  {
    path: 'segundo-factor',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/segundo-factor/segundo-factor').then(
        (m) => m.SegundoFactorPage,
      ),
  },
  {
    path: 'recuperar-password',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./adapter/in/ui/pages/recuperar-password/recuperar-password').then(
        (m) => m.RecuperarPasswordPage,
      ),
  },
  {
    path: 'restablecer-password',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import(
        './adapter/in/ui/pages/restablecer-password/restablecer-password'
      ).then((m) => m.RestablecerPasswordPage),
  },
  {
    path: 'cambio-password-obligatorio',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import(
        './adapter/in/ui/pages/cambio-password-obligatorio/cambio-password-obligatorio'
      ).then((m) => m.CambioPasswordObligatorioPage),
  },
];
