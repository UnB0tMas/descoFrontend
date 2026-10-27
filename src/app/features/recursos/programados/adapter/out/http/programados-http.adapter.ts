import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  RecursosProgramadosService,
  ResourceProgramCancelRequest,
  ResourceProgramConsumeRequest,
  ResourceProgramProgramRequest,
  ResourceProgramReturnResourceRequest,
  ResourceProgramUpdateRequest,
} from '../../../../../../infrastructure/openapi/generated';
import { ProgramadosGateway } from '../../../application/port/out/programados.gateway';
import { RecursoProgramadoFiltro } from '../../../domain/recurso-programado-filtro.model';
import {
  RecursoProgramadoConsumo,
  RecursoProgramadoCreate,
  RecursoProgramadoDevolucion,
  RecursoProgramadoUpdate,
  TipoDestinoRecurso,
} from '../../../domain/recurso-programado.model';
import { ProgramadosHttpMapper } from './programados-http.mapper';

@Injectable()
export class ProgramadosHttpAdapter implements ProgramadosGateway {
  private readonly api = inject(RecursosProgramadosService);
  private readonly mapper = inject(ProgramadosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: RecursoProgramadoFiltro) {
    return this.api
      .recursosListar(
        {
          estadoProceso: filter.estadoProceso,
          campaniaVentaId: filter.campaniaVentaId,
          operativoVentaId: filter.operativoVentaId,
          salidaCampoId: filter.salidaCampoId,
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
      .recursosVer({ id }, 'body', false, { transferCache: false })
      .pipe(map((response) => this.mapper.detail(response)));
  }

  destinations(uotId?: number, tipo?: TipoDestinoRecurso) {
    return this.api
      .recursosDestinosListar(
        { uotId, tipo },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.destinations(response)));
  }

  availability(uotId: number) {
    return this.api
      .recursosDisponibilidad(
        { uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.availability(response)));
  }

  program(input: RecursoProgramadoCreate) {
    const resourceProgramProgramRequest: ResourceProgramProgramRequest = this.compact(input);
    return this.idempotency.idempotent(
      'recursos-programados:programar',
      resourceProgramProgramRequest,
      (key) =>
        this.api
          .recursosProgramar(
            {
              xIdempotencyKey: key,
              resourceProgramProgramRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.createdId(response))),
    );
  }

  update(id: number, input: RecursoProgramadoUpdate) {
    const resourceProgramUpdateRequest: ResourceProgramUpdateRequest = this.compact(input);
    return this.idempotency.idempotent(
      `recursos-programados:editar:${id}`,
      resourceProgramUpdateRequest,
      (key) =>
        this.api
          .recursosEditar(
            {
              id,
              xIdempotencyKey: key,
              resourceProgramUpdateRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  assign(id: number) {
    return this.idempotency.idempotent(
      `recursos-programados:asignar:${id}`,
      { id },
      (key) =>
        this.api
          .recursosAsignar(
            { id, xIdempotencyKey: key },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  returnResource(id: number, input: RecursoProgramadoDevolucion) {
    const resourceProgramReturnResourceRequest: ResourceProgramReturnResourceRequest = this.compact(input);
    return this.idempotency.idempotent(
      `recursos-programados:devolver:${id}`,
      resourceProgramReturnResourceRequest,
      (key) =>
        this.api
          .recursosRegistrarDevolucion(
            {
              id,
              xIdempotencyKey: key,
              resourceProgramReturnResourceRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  consume(id: number, input: RecursoProgramadoConsumo) {
    const resourceProgramConsumeRequest: ResourceProgramConsumeRequest = this.compact(input);
    return this.idempotency.idempotent(
      `recursos-programados:consumir:${id}`,
      resourceProgramConsumeRequest,
      (key) =>
        this.api
          .recursosRegistrarConsumo(
            {
              id,
              xIdempotencyKey: key,
              resourceProgramConsumeRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  cancel(id: number, motivo: string) {
    const resourceProgramCancelRequest: ResourceProgramCancelRequest = { motivo };
    return this.idempotency.idempotent(
      `recursos-programados:cancelar:${id}`,
      resourceProgramCancelRequest,
      (key) =>
        this.api
          .recursosCancelar(
            {
              id,
              xIdempotencyKey: key,
              resourceProgramCancelRequest,
            },
            'body',
            false,
            { transferCache: false },
          )
          .pipe(map((response) => this.mapper.void(response))),
    );
  }

  private compact<T extends object>(value: T): T {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined && item !== null && item !== ''),
    ) as T;
  }
}
