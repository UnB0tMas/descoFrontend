import { inject, Injectable } from '@angular/core';

import { PROGRAMADOS_GATEWAY } from '../port/out/programados.gateway';
import { RecursoProgramadoConsumo } from '../../domain/recurso-programado.model';

@Injectable()
export class RegistrarConsumoRecursoUseCase {
  private readonly gateway = inject(PROGRAMADOS_GATEWAY);

  execute(id: number, input: RecursoProgramadoConsumo) {
    return this.gateway.consume(id, input);
  }
}
