import { inject, Injectable } from '@angular/core';

import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class DeshabilitarAreaUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(id: number, reason: string) {
    return this.gateway.disableArea(id, reason);
  }
}
