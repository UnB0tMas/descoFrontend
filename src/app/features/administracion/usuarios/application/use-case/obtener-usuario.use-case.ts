import { inject, Injectable } from '@angular/core';

import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class ObtenerUsuarioUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(id: number) {
    return this.gateway.get(id);
  }
}
