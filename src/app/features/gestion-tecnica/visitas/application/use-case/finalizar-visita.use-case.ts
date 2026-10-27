import { inject, Injectable } from '@angular/core';

import {
  VISITAS_GATEWAY,
  VisitasGateway,
} from '../port/out/visitas.gateway';

@Injectable()
export class FinalizarVisitaUseCase {
  private readonly gateway: VisitasGateway = inject(VISITAS_GATEWAY);

  execute(
    id: number,
    fechaHoraFin: string,
    resumen: string,
    recomendaciones: string,
  ) {
    return this.gateway.finish(
      id,
      fechaHoraFin,
      resumen,
      recomendaciones,
    );
  }
}
