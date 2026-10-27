import { Provider } from '@angular/core';

import { MI_CUENTA_GATEWAY } from './application/port/out/mi-cuenta.gateway';
import { CambiarPasswordUseCase } from './application/use-case/cambiar-password.use-case';
import { CerrarOtrasSesionesCuentaUseCase } from './application/use-case/cerrar-otras-sesiones.use-case';
import { CerrarSesionRemotaUseCase } from './application/use-case/cerrar-sesion-remota.use-case';
import { ConfirmarCambioCorreoUseCase } from './application/use-case/confirmar-cambio-correo.use-case';
import { ListarDispositivosUseCase } from './application/use-case/listar-dispositivos.use-case';
import { ListarSesionesUseCase } from './application/use-case/listar-sesiones.use-case';
import { QuitarReconocimientoDispositivoUseCase } from './application/use-case/quitar-reconocimiento-dispositivo.use-case';
import { ReconocerDispositivoUseCase } from './application/use-case/reconocer-dispositivo.use-case';
import { SolicitarCambioCorreoUseCase } from './application/use-case/solicitar-cambio-correo.use-case';
import { MiCuentaHttpAdapter } from './adapter/out/http/mi-cuenta-http.adapter';
import { MiCuentaHttpMapper } from './adapter/out/http/mi-cuenta-http.mapper';

export function provideMiCuenta(): Provider[] {
  return [
    MiCuentaHttpMapper,
    MiCuentaHttpAdapter,
    {
      provide: MI_CUENTA_GATEWAY,
      useExisting: MiCuentaHttpAdapter,
    },
    CambiarPasswordUseCase,
    SolicitarCambioCorreoUseCase,
    ConfirmarCambioCorreoUseCase,
    ListarSesionesUseCase,
    CerrarSesionRemotaUseCase,
    CerrarOtrasSesionesCuentaUseCase,
    ListarDispositivosUseCase,
    ReconocerDispositivoUseCase,
    QuitarReconocimientoDispositivoUseCase,
  ];
}
