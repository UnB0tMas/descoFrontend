import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ModuleAccessService } from './module-access.service';
import { UotContextStore } from '../../features/uot/state/uot-context.store';

export const moduleAccessGuard: CanActivateFn = (route, state) => {
  const moduleAccess = inject(ModuleAccessService);
  const router = inject(Router);
  const uot = inject(UotContextStore);
  if (uot.isGeneral()) {
    if (route.routeConfig?.path === 'inicio') return true;
    return router.createUrlTree(['/seleccionar-uot'], {
      queryParams: { returnUrl: state.url },
    });
  }
  const moduleCode = route.data['module'] as string | undefined;

  if (!moduleCode) {
    return true;
  }

  return moduleAccess.has(moduleCode)
    ? true
    : router.createUrlTree(['/forbidden']);
};
