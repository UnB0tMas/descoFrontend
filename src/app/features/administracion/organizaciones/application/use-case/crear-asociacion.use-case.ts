import { inject, Injectable } from '@angular/core';

import { AsociacionCreate } from '../../domain/asociacion.model';
import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class CrearAsociacionUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(input: AsociacionCreate) {
    return this.gateway.createAssociation(input);
  }
}
