import { inject, Injectable } from '@angular/core';

import {
  ROLES_PERMISOS_GATEWAY,
  RolesPermisosGateway,
} from '../port/out/roles-permisos.gateway';

@Injectable()
export class ObtenerRolUseCase {
  private readonly gateway: RolesPermisosGateway = inject(ROLES_PERMISOS_GATEWAY);

  execute(id: number) {
    return this.gateway.get(id);
  }
}
