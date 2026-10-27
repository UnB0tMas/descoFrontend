import { Provider } from '@angular/core';

import { ROLES_PERMISOS_GATEWAY } from './application/port/out/roles-permisos.gateway';
import { ActualizarPermisosRolUseCase } from './application/use-case/actualizar-permisos-rol.use-case';
import { CrearRolUseCase } from './application/use-case/crear-rol.use-case';
import { DeshabilitarRolUseCase } from './application/use-case/deshabilitar-rol.use-case';
import { EditarRolUseCase } from './application/use-case/editar-rol.use-case';
import { ListarRolesUseCase } from './application/use-case/listar-roles.use-case';
import { ObtenerRolUseCase } from './application/use-case/obtener-rol.use-case';
import { RolesPermisosHttpAdapter } from './adapter/out/http/roles-permisos-http.adapter';
import { RolesPermisosHttpMapper } from './adapter/out/http/roles-permisos-http.mapper';

export function provideRolesPermisos(): Provider[] {
  return [
    RolesPermisosHttpMapper,
    RolesPermisosHttpAdapter,
    {
      provide: ROLES_PERMISOS_GATEWAY,
      useExisting: RolesPermisosHttpAdapter,
    },
    ListarRolesUseCase,
    ObtenerRolUseCase,
    CrearRolUseCase,
    EditarRolUseCase,
    DeshabilitarRolUseCase,
    ActualizarPermisosRolUseCase,
  ];
}
