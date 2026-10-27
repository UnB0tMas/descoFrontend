import { inject, Injectable } from '@angular/core';

import { UsuarioFiltro } from '../../domain/usuario-filtro.model';
import {
  USUARIOS_GATEWAY,
  UsuariosGateway,
} from '../port/out/usuarios.gateway';

@Injectable()
export class ListarUsuariosUseCase {
  private readonly gateway: UsuariosGateway = inject(USUARIOS_GATEWAY);

  execute(filter: UsuarioFiltro) {
    return this.gateway.list(filter);
  }
}
