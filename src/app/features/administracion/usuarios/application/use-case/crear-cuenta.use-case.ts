import { inject, Injectable } from '@angular/core';

import { UsuarioCreate } from '../../domain/usuario.model';
import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class CrearCuentaUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(input: UsuarioCreate) {
    return this.gateway.create(input);
  }
}
