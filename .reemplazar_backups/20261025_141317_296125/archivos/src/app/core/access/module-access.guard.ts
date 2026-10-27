import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ModuleAccessService } from './module-access.service';

export const moduleAccessGuard: CanActivateFn = (route) => {
  const moduleAccess = inject(ModuleAccessService);
  const router = inject(Router);
  const moduleCode = route.data['module'] as string | undefined;

  if (!moduleCode) {
    return true;
  }

  return moduleAccess.has(moduleCode)
    ? true
    : router.createUrlTree(['/forbidden']);
};
