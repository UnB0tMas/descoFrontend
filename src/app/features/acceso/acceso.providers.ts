import { Provider } from '@angular/core';

import { AUTH_GATEWAY } from './application/port/out/auth.gateway';
import { CerrarOtrasSesionesUseCase } from './application/use-case/cerrar-otras-sesiones.use-case';
import { CerrarSesionUseCase } from './application/use-case/cerrar-sesion.use-case';
import { ConfirmarValidacionCorreoUseCase } from './application/use-case/confirmar-validacion-correo.use-case';
import { LoginUseCase } from './application/use-case/login.use-case';
import { ObtenerContextoActualUseCase } from './application/use-case/obtener-contexto-actual.use-case';
import { RefrescarSesionUseCase } from './application/use-case/refrescar-sesion.use-case';
import { RestablecerPasswordUseCase } from './application/use-case/restablecer-password.use-case';
import { SolicitarRecuperacionPasswordUseCase } from './application/use-case/solicitar-recuperacion-password.use-case';
import { SolicitarSegundoFactorUseCase } from './application/use-case/solicitar-segundo-factor.use-case';
import { SolicitarValidacionCorreoUseCase } from './application/use-case/solicitar-validacion-correo.use-case';
import { VerificarSegundoFactorUseCase } from './application/use-case/verificar-segundo-factor.use-case';
import { AuthFlowStore } from './adapter/in/ui/state/auth-flow.store';
import { AuthHttpAdapter } from './adapter/out/http/auth-http.adapter';
import { AuthHttpMapper } from './adapter/out/http/auth-http.mapper';

export function provideAcceso(): Provider[] {
  return [
    AuthFlowStore,
    AuthHttpMapper,
    AuthHttpAdapter,
    {
      provide: AUTH_GATEWAY,
      useExisting: AuthHttpAdapter,
    },
    LoginUseCase,
    SolicitarValidacionCorreoUseCase,
    ConfirmarValidacionCorreoUseCase,
    SolicitarSegundoFactorUseCase,
    VerificarSegundoFactorUseCase,
    SolicitarRecuperacionPasswordUseCase,
    RestablecerPasswordUseCase,
    RefrescarSesionUseCase,
    ObtenerContextoActualUseCase,
    CerrarSesionUseCase,
    CerrarOtrasSesionesUseCase,
  ];
}
