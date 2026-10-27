import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  EmployeeCreateRequest,
  EmployeeRetireRequest,
  EmployeeUpdateRequest,
  EmpleadosService,
} from '../../../../../../infrastructure/openapi/generated';
import { EmpleadosGateway } from '../../../application/port/out/empleados.gateway';
import { EmpleadoFiltro } from '../../../domain/empleado-filtro.model';
import {
  EmpleadoCreate,
  EmpleadoUpdate,
} from '../../../domain/empleado.model';
import { EmpleadosHttpMapper } from './empleados-http.mapper';

@Injectable()
export class EmpleadosHttpAdapter implements EmpleadosGateway {
  private readonly api = inject(EmpleadosService);
  private readonly mapper = inject(EmpleadosHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(filter: EmpleadoFiltro) {
    return this.api
      .empleadosListar(
        {
          empresaId: filter.empresaId,
          areaId: filter.areaId,
          activo: filter.activo,
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
      .empleadosVer(
        { id },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.detail(response)));
  }

  create(input: EmpleadoCreate) {
    const employeeCreateRequest = this.compact(input) as unknown as EmployeeCreateRequest;

    return this.api
      .empleadosCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          employeeCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  update(id: number, input: EmpleadoUpdate) {
    const employeeUpdateRequest = this.compact(input) as unknown as EmployeeUpdateRequest;

    return this.api
      .empleadosEditar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          employeeUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  retire(id: number, motivo: string, fechaCese?: string) {
    const employeeRetireRequest: EmployeeRetireRequest = {
      motivo,
      fechaCese,
    };

    return this.api
      .empleadosRetirar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          employeeRetireRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  private compact<T extends object>(value: T): T {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        ([, item]) => item !== undefined && item !== null && item !== '',
      ),
    ) as T;
  }
}
