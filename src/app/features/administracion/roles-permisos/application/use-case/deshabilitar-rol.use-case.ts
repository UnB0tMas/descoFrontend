import { inject, Injectable } from '@angular/core';

import {
  ROLES_PERMISOS_GATEWAY,
  RolesPermisosGateway,
} from '../port/out/roles-permisos.gateway';

@Injectable()
export class DeshabilitarRolUseCase {
  private readonly gateway: RolesPermisosGateway = inject(ROLES_PERMISOS_GATEWAY);

  execute(id: number, motivo: string) {
    return this.gateway.disable(id, motivo);
  }
}
