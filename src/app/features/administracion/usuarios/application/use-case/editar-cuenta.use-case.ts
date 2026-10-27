import { inject, Injectable } from '@angular/core';

import { UsuarioUpdate } from '../../domain/usuario.model';
import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class EditarCuentaUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(id: number, input: UsuarioUpdate) {
    return this.gateway.update(id, input);
  }
}
