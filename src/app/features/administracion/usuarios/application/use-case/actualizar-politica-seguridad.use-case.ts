import { inject, Injectable } from '@angular/core';

import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class ActualizarPoliticaSeguridadUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(diasDispositivoReconocido: number) {
    return this.gateway.updateSecurityPolicy(diasDispositivoReconocido);
  }
}
