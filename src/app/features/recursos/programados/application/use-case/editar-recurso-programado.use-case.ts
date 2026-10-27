import { inject, Injectable } from '@angular/core';
import { RecursoProgramadoUpdate } from '../../domain/recurso-programado.model';
import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class EditarRecursoProgramadoUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(id: number, input: RecursoProgramadoUpdate) {
    return this.gateway.update(id, input);
  }
}
