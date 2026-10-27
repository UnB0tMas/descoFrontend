import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';

import { AccessService } from '../../../../core/access/access.service';
import { AUTH_GATEWAY, AuthGateway } from '../port/out/auth.gateway';

@Injectable()
export class ObtenerContextoActualUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);
  private readonly access = inject(AccessService);

  execute() {
    return this.gateway.currentContext().pipe(
      tap((context) => this.access.hydrate(context)),
    );
  }
}
