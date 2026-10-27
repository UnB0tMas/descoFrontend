import { inject, Injectable } from '@angular/core';
import { RecursoProgramadoDevolucion } from '../../domain/recurso-programado.model';
import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class RegistrarDevolucionRecursoUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(id: number, input: RecursoProgramadoDevolucion) {
    return this.gateway.returnResource(id, input);
  }
}
