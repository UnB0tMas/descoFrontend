import { inject, Injectable } from '@angular/core';

import { RolCreate, RolUpdate } from '../../domain/rol.model';
import {
  ROLES_PERMISOS_GATEWAY,
  RolesPermisosGateway,
} from '../port/out/roles-permisos.gateway';

@Injectable()
export class EditarRolUseCase {
  private readonly gateway: RolesPermisosGateway = inject(ROLES_PERMISOS_GATEWAY);

  execute(id: number, input: RolUpdate) {
    return this.gateway.update(id, input);
  }
}
