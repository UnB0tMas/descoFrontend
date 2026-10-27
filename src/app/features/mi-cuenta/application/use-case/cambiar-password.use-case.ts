import { inject, Injectable } from '@angular/core';

import { CambioPasswordCuenta } from '../../domain/seguridad-cuenta.model';
import {
  MI_CUENTA_GATEWAY,
  MiCuentaGateway,
} from '../port/out/mi-cuenta.gateway';

@Injectable()
export class CambiarPasswordUseCase {
  private readonly gateway: MiCuentaGateway = inject(MI_CUENTA_GATEWAY);

  execute(input: CambioPasswordCuenta) {
    return this.gateway.changePassword(input);
  }
}
