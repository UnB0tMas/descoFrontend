import { inject, Injectable } from '@angular/core';

import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class ListarOrganizacionesUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(page: number, size: number) {
    return this.gateway.list(page, size);
  }

  areas(page: number, size: number, empresaId?: number) {
    return this.gateway.listAreas(page, size, empresaId);
  }

  detail(id: number) {
    return this.gateway.get(id);
  }
}
