import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  VisitAnnulRequest,
  VisitFinishRequest,
  VisitStartRequest,
  VisitUpdateRequest,
  VisitasTcnicasService,
} from '../../../../../../infrastructure/openapi/generated';
import { VisitasGateway } from '../../../application/port/out/visitas.gateway';
import { VisitaFiltro } from '../../../domain/visita-filtro.model';
import { VisitaStart, VisitaUpdate } from '../../../domain/visita-tecnica.model';
import { VisitasHttpMapper } from './visitas-http.mapper';

@Injectable()
export class VisitasHttpAdapter implements VisitasGateway {
  private readonly api = inject(VisitasTcnicasService);
  private readonly mapper = inject(VisitasHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: VisitaFiltro) {
    return this.api
      .visitasListar(
        {
          predioId: filter.predioId,
          empleadoId: filter.empleadoId,
          salidaCampoId: filter.salidaCampoId,
          estadoProceso: filter.estadoProceso,
          fechaDesde: filter.fechaDesde,
          fechaHasta: filter.fechaHasta,
          buscar: filter.buscar,
          pagina: filter.page,
          tamano: filter.size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.page(response, filter.size)));
  }

  get(id: number) {
    return this.api
      .visitasVer({ id }, 'body', false, { transferCache: false })
      .pipe(map((response) => this.mapper.detail(response)));
  }

  start(input: VisitaStart) {
    const visitStartRequest: VisitStartRequest = input;
    return this.api
      .visitasIniciar(
        {
          xIdempotencyKey: this.idempotency.create(),
          visitStartRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.created(response)));
  }

  update(id: number, input: VisitaUpdate) {
    const visitUpdateRequest: VisitUpdateRequest = input;
    return this.api
      .visitasEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          visitUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  finish(
    id: number,
    fechaHoraFin: string,
    resumen: string,
    recomendaciones: string,
  ) {
    const visitFinishRequest: VisitFinishRequest = {
      fechaHoraFin,
      resumen,
      recomendaciones,
    };

    return this.api
      .visitasFinalizar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          visitFinishRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  annul(id: number, motivo: string, fechaHoraFin: string) {
    const visitAnnulRequest: VisitAnnulRequest = {
      motivo,
      fechaHoraFin,
    };

    return this.api
      .visitasAnular(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          visitAnnulRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }
}
