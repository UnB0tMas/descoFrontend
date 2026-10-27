import { inject, Injectable } from '@angular/core';
import { RecursoProgramadoFiltro } from '../../domain/recurso-programado-filtro.model';
import { PROGRAMADOS_GATEWAY, ProgramadosGateway } from '../port/out/programados.gateway';

@Injectable()
export class ListarRecursosProgramadosUseCase {
  private readonly gateway: ProgramadosGateway = inject(PROGRAMADOS_GATEWAY);
  execute(filter: RecursoProgramadoFiltro) {
    return this.gateway.list(filter);
  }
}
