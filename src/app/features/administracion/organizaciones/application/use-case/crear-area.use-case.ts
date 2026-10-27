import { inject, Injectable } from '@angular/core';

import { AreaCreate } from '../../domain/area.model';
import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class CrearAreaUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(input: AreaCreate) {
    return this.gateway.createArea(input);
  }
}
