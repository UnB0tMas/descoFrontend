import { inject, Injectable } from '@angular/core';

import {
  MI_CUENTA_GATEWAY,
  MiCuentaGateway,
} from '../port/out/mi-cuenta.gateway';

@Injectable()
export class QuitarReconocimientoDispositivoUseCase {
  private readonly gateway: MiCuentaGateway = inject(MI_CUENTA_GATEWAY);

  execute(dispositivoUsuarioId: number) {
    return this.gateway.updateDeviceRecognition(dispositivoUsuarioId, false);
  }
}
