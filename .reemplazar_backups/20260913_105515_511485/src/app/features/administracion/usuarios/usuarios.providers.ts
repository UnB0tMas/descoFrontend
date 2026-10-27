import { Provider } from '@angular/core';

import { USUARIOS_GATEWAY } from './application/port/out/usuarios.gateway';
import { AsignarRolUsuarioUseCase } from './application/use-case/asignar-rol-usuario.use-case';
import { CrearCuentaUseCase } from './application/use-case/crear-cuenta.use-case';
import { DeshabilitarCuentaUseCase } from './application/use-case/deshabilitar-cuenta.use-case';
import { EditarCuentaUseCase } from './application/use-case/editar-cuenta.use-case';
import { ListarUsuariosUseCase } from './application/use-case/listar-usuarios.use-case';
import { ObtenerUsuarioUseCase } from './application/use-case/obtener-usuario.use-case';
import { ReactivarCuentaUseCase } from './application/use-case/reactivar-cuenta.use-case';
import { RetirarRolUsuarioUseCase } from './application/use-case/retirar-rol-usuario.use-case';
import { UsuariosHttpAdapter } from './adapter/out/http/usuarios-http.adapter';
import { UsuariosHttpMapper } from './adapter/out/http/usuarios-http.mapper';

export function provideUsuarios(): Provider[] {
  return [
    UsuariosHttpMapper,
    UsuariosHttpAdapter,
    {
      provide: USUARIOS_GATEWAY,
      useExisting: UsuariosHttpAdapter,
    },
    ListarUsuariosUseCase,
    ObtenerUsuarioUseCase,
    CrearCuentaUseCase,
    EditarCuentaUseCase,
    DeshabilitarCuentaUseCase,
    ReactivarCuentaUseCase,
    AsignarRolUsuarioUseCase,
    RetirarRolUsuarioUseCase,
  ];
}
