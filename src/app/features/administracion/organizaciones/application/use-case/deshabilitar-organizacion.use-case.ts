import { inject, Injectable } from '@angular/core';

import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class DeshabilitarOrganizacionUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(id: number, uotId: number, reason: string) {
    return this.gateway.disableOrganization(id, uotId, reason);
  }
}
