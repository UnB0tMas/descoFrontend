import { inject, Injectable } from '@angular/core';

import { EmpresaCreate } from '../../domain/empresa.model';
import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class CrearEmpresaUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(input: EmpresaCreate) {
    return this.gateway.createCompany(input);
  }
}
