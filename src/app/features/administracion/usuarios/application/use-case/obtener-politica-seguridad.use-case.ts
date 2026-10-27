import { inject, Injectable } from '@angular/core';

import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class ObtenerPoliticaSeguridadUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute() {
    return this.gateway.getSecurityPolicy();
  }
}
