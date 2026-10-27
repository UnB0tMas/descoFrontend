import { inject, Injectable } from '@angular/core';

import {
  ROLES_PERMISOS_GATEWAY,
  RolesPermisosGateway,
} from '../port/out/roles-permisos.gateway';

@Injectable()
export class ListarRolesUseCase {
  private readonly gateway: RolesPermisosGateway = inject(ROLES_PERMISOS_GATEWAY);

  execute(page: number, size: number) {
    return this.gateway.list(page, size);
  }
}
