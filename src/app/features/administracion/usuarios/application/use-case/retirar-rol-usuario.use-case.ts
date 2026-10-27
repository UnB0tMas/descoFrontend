import { inject, Injectable } from '@angular/core';

import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class RetirarRolUsuarioUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(id: number, rolId: number, motivo: string) {
    return this.gateway.removeRole(id, rolId, motivo);
  }
}
