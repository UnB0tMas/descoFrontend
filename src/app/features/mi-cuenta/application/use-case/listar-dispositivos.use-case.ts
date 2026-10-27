import { inject, Injectable } from '@angular/core';

import {
  MI_CUENTA_GATEWAY,
  MiCuentaGateway,
} from '../port/out/mi-cuenta.gateway';

@Injectable()
export class ListarDispositivosUseCase {
  private readonly gateway: MiCuentaGateway = inject(MI_CUENTA_GATEWAY);

  execute() {
    return this.gateway.listDevices();
  }
}
