import { inject, Injectable } from '@angular/core';

import { AUTH_GATEWAY, AuthGateway } from '../port/out/auth.gateway';

@Injectable()
export class CerrarOtrasSesionesUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);

  execute() {
    return this.gateway.logoutOthers();
  }
}
