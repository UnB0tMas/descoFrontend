import { inject, Injectable } from '@angular/core';

import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class ListarOrganizacionesUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(page: number, size: number, uotId?: number) {
    return this.gateway.list(page, size, uotId);
  }

  areas(page: number, size: number, uotId?: number, empresaId?: number) {
    return this.gateway.listAreas(page, size, uotId, empresaId);
  }

  detail(id: number, uotId?: number) {
    return this.gateway.get(id, uotId);
  }
}
