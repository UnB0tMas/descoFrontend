import { inject, Injectable } from '@angular/core';

import { INVENTARIO_VEHICULOS_GATEWAY } from '../port/out/inventario-vehiculos.gateway';

@Injectable()
export class AnularMovimientoSuministroUseCase {
  private readonly gateway = inject(INVENTARIO_VEHICULOS_GATEWAY);

  execute(id: number, motivo: string) {
    return this.gateway.annulMovement(id, motivo);
  }
}
