import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../../core/access/permission.service';
import { UotContextStore } from '../uot/state/uot-context.store';

export const apappssAccessGuard: CanActivateFn = (_route, state) => {
  const access = inject(PermissionService);
  const router = inject(Router);
  if (inject(UotContextStore).isGeneral()) {
    return router.createUrlTree(['/seleccionar-uot'], {
      queryParams: { returnUrl: state.url },
    });
  }
  const allowed = (
    access.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']) ||
    access.hasAll(['APAPPSS_PREDIOS_LISTAR', 'PREDIOS_LISTAR']) ||
    access.hasAll(['APAPPSS_PREDIOS_VER', 'PREDIOS_VER']) ||
    access.hasAll(['APAPPSS_SOCIOS_VER', 'PRODUCTORES_VER']) ||
    [
      'CAMPANIAS_LISTAR', 'PARTICIPANTES_LISTAR', 'OPERATIVOS_LISTAR',
      'ENTREGAS_LISTAR', 'JABAS_LISTAR', 'PRECIOS_LISTAR',
      'INCIDENCIAS_LISTAR', 'GASTOS_LISTAR', 'LIQUIDACIONES_LISTAR',
      'PAGOS_LISTAR', 'COBROS_LISTAR',
    ].some((code) => access.has(code))
  );
  return allowed ? true : router.createUrlTree(['/forbidden']);
};
