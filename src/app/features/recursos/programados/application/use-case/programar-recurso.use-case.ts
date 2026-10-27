import { inject, Injectable } from '@angular/core';
import { RecursoProgramadoCreate } from '../../domain/recurso-programado.model';
import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class ProgramarRecursoUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(input: RecursoProgramadoCreate) {
    return this.gateway.program(input);
  }
}
