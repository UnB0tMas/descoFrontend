import { inject, Injectable } from '@angular/core';

import { ConfirmacionCambioCorreo } from '../../domain/seguridad-cuenta.model';
import {
  MI_CUENTA_GATEWAY,
  MiCuentaGateway,
} from '../port/out/mi-cuenta.gateway';

@Injectable()
export class ConfirmarCambioCorreoUseCase {
  private readonly gateway: MiCuentaGateway = inject(MI_CUENTA_GATEWAY);

  execute(input: ConfirmacionCambioCorreo) {
    return this.gateway.confirmEmailChange(input);
  }
}
