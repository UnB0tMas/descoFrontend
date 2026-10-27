import { inject, Injectable } from '@angular/core';

import { AsociacionUpdate } from '../../domain/asociacion.model';
import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class EditarAsociacionUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(id: number, input: AsociacionUpdate) {
    return this.gateway.updateAssociation(id, input);
  }
}
