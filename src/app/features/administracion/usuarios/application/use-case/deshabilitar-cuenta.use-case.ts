import { inject, Injectable } from '@angular/core';

import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class DeshabilitarCuentaUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(id: number, motivo: string) {
    return this.gateway.disable(id, motivo);
  }
}
