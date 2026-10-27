import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermissionService } from './permission.service';
import { UotContextStore } from '../../features/uot/state/uot-context.store';

export const permissionGuard: CanActivateFn = (route, state) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const uot = inject(UotContextStore);
  if (uot.isGeneral()) {
    if (route.routeConfig?.path === 'inicio') return true;
    return router.createUrlTree(['/seleccionar-uot'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const permission = route.data['permission'] as string | undefined;
  const permissions = (route.data['permissions'] as string[] | undefined) ?? [];
  const mode = (route.data['permissionMode'] as 'all' | 'any' | undefined) ?? 'all';

  const allowed = permission
    ? permissionService.has(permission)
    : permissions.length === 0
      ? true
      : mode === 'any'
        ? permissionService.hasAny(permissions)
        : permissionService.hasAll(permissions);

  return allowed ? true : router.createUrlTree(['/forbidden']);
};
