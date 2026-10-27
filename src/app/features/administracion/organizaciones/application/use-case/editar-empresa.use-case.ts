import { inject, Injectable } from '@angular/core';

import { EmpresaUpdate } from '../../domain/empresa.model';
import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class EditarEmpresaUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(id: number, input: EmpresaUpdate) {
    return this.gateway.updateCompany(id, input);
  }
}
