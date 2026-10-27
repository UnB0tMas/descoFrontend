import { inject, Injectable } from '@angular/core';
import { finalize } from 'rxjs';

import { AccessService } from '../../../../core/access/access.service';
import { SessionStore } from '../../../../core/session/session.store';
import { AUTH_GATEWAY, AuthGateway } from '../port/out/auth.gateway';

@Injectable()
export class CerrarSesionUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessService);

  execute() {
    return this.gateway.logout().pipe(
      finalize(() => {
        this.session.clear();
        this.access.clear();
      }),
    );
  }

  clearLocal(): void {
    this.session.clear();
    this.access.clear();
  }
}
