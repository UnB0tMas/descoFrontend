import { inject, Injectable } from '@angular/core';

import {
  MI_CUENTA_GATEWAY,
  MiCuentaGateway,
} from '../port/out/mi-cuenta.gateway';

@Injectable()
export class CerrarSesionRemotaUseCase {
  private readonly gateway: MiCuentaGateway = inject(MI_CUENTA_GATEWAY);

  execute(sesionPublicaId: string) {
    return this.gateway.closeSession(sesionPublicaId);
  }
}
