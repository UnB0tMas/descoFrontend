import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConveniosModulesStore } from './state/convenios-modules.store';
import { UotContextStore } from '../uot/state/uot-context.store';

export const convenioModuleGuard: CanActivateFn = (route, state) => {
  const modules = inject(ConveniosModulesStore);
  const uot = inject(UotContextStore);
  const router = inject(Router);
  if (uot.isGeneral()) {
    return router.createUrlTree(['/seleccionar-uot'], {
      queryParams: { returnUrl: state.url },
    });
  }
  const codigo = (route.data['moduloEspecial'] as string | undefined) ?? 'COMERCIALIZACION_ASOCIATIVA';
  return uot.isSpecific() && modules.has(codigo)
    ? true
    : router.createUrlTree(['/forbidden']);
};
