import { inject, Injectable } from '@angular/core';
import { finalize } from 'rxjs';

import { AccessService } from '../../../../core/access/access.service';
import { ConveniosModulesStore } from '../../../convenios/state/convenios-modules.store';
import { UotContextStore } from '../../../uot/state/uot-context.store';
import { SessionStore } from '../../../../core/session/session.store';
import { AUTH_GATEWAY, AuthGateway } from '../port/out/auth.gateway';

@Injectable()
export class CerrarSesionUseCase {
  private readonly gateway: AuthGateway = inject(AUTH_GATEWAY);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessService);
  private readonly convenios = inject(ConveniosModulesStore);
  private readonly uot = inject(UotContextStore);

  execute() {
    return this.gateway.logout().pipe(
      finalize(() => {
        this.session.clear();
        this.access.clear();
        this.convenios.clear();
        this.uot.clear();
      }),
    );
  }

  clearLocal(): void {
    this.session.clear();
    this.access.clear();
    this.convenios.clear();
    this.uot.clear();
  }
}
