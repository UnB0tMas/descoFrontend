import { inject, Injectable } from '@angular/core';

import { SolicitudCambioCorreo } from '../../domain/seguridad-cuenta.model';
import {
  MI_CUENTA_GATEWAY,
  MiCuentaGateway,
} from '../port/out/mi-cuenta.gateway';

@Injectable()
export class SolicitarCambioCorreoUseCase {
  private readonly gateway: MiCuentaGateway = inject(MI_CUENTA_GATEWAY);

  execute(input: SolicitudCambioCorreo) {
    return this.gateway.requestEmailChange(input);
  }
}
