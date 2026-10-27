import { inject, Injectable } from '@angular/core';

import { AreaUpdate } from '../../domain/area.model';
import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class EditarAreaUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(id: number, input: AreaUpdate) {
    return this.gateway.updateArea(id, input);
  }
}
