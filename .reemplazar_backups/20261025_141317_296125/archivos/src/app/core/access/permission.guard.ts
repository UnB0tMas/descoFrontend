import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermissionService } from './permission.service';

export const permissionGuard: CanActivateFn = (route) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

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
