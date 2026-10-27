import { inject, Injectable } from '@angular/core';

import { RolPermisoUpdate } from '../../domain/rol-permiso.model';
import {
  ROLES_PERMISOS_GATEWAY,
  RolesPermisosGateway,
} from '../port/out/roles-permisos.gateway';

@Injectable()
export class ActualizarPermisosRolUseCase {
  private readonly gateway: RolesPermisosGateway = inject(ROLES_PERMISOS_GATEWAY);

  execute(id: number, input: RolPermisoUpdate) {
    return this.gateway.updatePermissions(id, input);
  }
}
