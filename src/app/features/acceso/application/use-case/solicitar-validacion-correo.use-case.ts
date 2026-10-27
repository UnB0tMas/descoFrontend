import { inject, Injectable } from '@angular/core';

import { AUTH_GATEWAY, AuthGateway } from '../port/out/auth.gateway';

@Injectable()
export class SolicitarValidacionCorreoUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);

  execute(nombreUsuario: string) {
    return this.gateway.requestEmailVerification(nombreUsuario);
  }
}
