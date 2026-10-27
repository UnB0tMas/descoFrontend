import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../../core/access/permission.service';

export const apappssAccessGuard: CanActivateFn = () => {
  const access = inject(PermissionService);
  const router = inject(Router);
  const allowed = (
    access.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']) ||
    access.hasAll(['APAPPSS_PREDIOS_LISTAR', 'PREDIOS_LISTAR']) ||
    [
      'CAMPANIAS_LISTAR', 'PARTICIPANTES_LISTAR', 'OPERATIVOS_LISTAR',
      'ENTREGAS_LISTAR', 'JABAS_LISTAR', 'PRECIOS_LISTAR',
      'INCIDENCIAS_LISTAR', 'GASTOS_LISTAR', 'LIQUIDACIONES_LISTAR',
      'PAGOS_LISTAR', 'COBROS_LISTAR',
    ].some((code) => access.has(code))
  );
  return allowed ? true : router.createUrlTree(['/forbidden']);
};
