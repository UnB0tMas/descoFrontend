import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../../core/http/services/idempotency-key.service';
import {
  AreaCreateRequest,
  AreaUpdateRequest,
  AssociationCreateRequest,
  AssociationUpdateRequest,
  CompanyCreateRequest,
  CompanyUpdateRequest,
  OrganizacionesService,
  OrganizationDisableRequest,
} from '../../../../../../infrastructure/openapi/generated';
import { OrganizacionesGateway } from '../../../application/port/out/organizaciones.gateway';
import {
  AsociacionCreate,
  AsociacionUpdate,
} from '../../../domain/asociacion.model';
import { AreaCreate, AreaUpdate } from '../../../domain/area.model';
import {
  EmpresaCreate,
  EmpresaUpdate,
} from '../../../domain/empresa.model';
import { OrganizacionesHttpMapper } from './organizaciones-http.mapper';

@Injectable()
export class OrganizacionesHttpAdapter implements OrganizacionesGateway {
  private readonly api = inject(OrganizacionesService);
  private readonly mapper = inject(OrganizacionesHttpMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(page: number, size: number, uotId?: number) {
    return this.api
      .organizacionesListar(
        { uotId, pagina: page, tamano: size },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.organizationsPage(response, size)));
  }

  get(id: number, uotId?: number) {
    return this.api
      .organizacionesVer(
        { id, uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.detail(response)));
  }

  createCompany(input: EmpresaCreate) {
    const companyCreateRequest = this.compact(input) as unknown as CompanyCreateRequest;

    return this.api
      .organizacionesCrearEmpresa(
        {
          xIdempotencyKey: this.idempotency.create(),
          companyCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  updateCompany(id: number, input: EmpresaUpdate) {
    const companyUpdateRequest = this.compact(input) as unknown as CompanyUpdateRequest;

    return this.api
      .organizacionesEditarEmpresa(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          companyUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  createAssociation(input: AsociacionCreate) {
    const associationCreateRequest = this.compact(input) as unknown as AssociationCreateRequest;

    return this.api
      .organizacionesCrearAsociacion(
        {
          xIdempotencyKey: this.idempotency.create(),
          associationCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  updateAssociation(id: number, input: AsociacionUpdate) {
    const associationUpdateRequest = this.compact(input) as unknown as AssociationUpdateRequest;

    return this.api
      .organizacionesEditarAsociacion(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          associationUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  disableOrganization(id: number, uotId: number, reason: string) {
    const organizationDisableRequest: OrganizationDisableRequest = {
      uotId,
      motivo: reason.trim(),
    };

    return this.api
      .organizacionesDeshabilitar(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          organizationDisableRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  listAreas(page: number, size: number, uotId?: number, empresaId?: number) {
    return this.api
      .organizacionesListarAreas(
        {
          uotId,
          empresaId,
          pagina: page,
          tamano: size,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.areasPage(response, size)));
  }

  createArea(input: AreaCreate) {
    const areaCreateRequest = this.compact(input) as unknown as AreaCreateRequest;

    return this.api
      .organizacionesCrearArea(
        {
          xIdempotencyKey: this.idempotency.create(),
          areaCreateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.createdId(response)));
  }

  updateArea(id: number, input: AreaUpdate) {
    const areaUpdateRequest = this.compact(input) as unknown as AreaUpdateRequest;

    return this.api
      .organizacionesEditarArea(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          areaUpdateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => this.mapper.void(response)));
  }

  disableArea(id: number, uotId: number, reason: string) {
    const organizationDisableRequest: OrganizationDisableRequest = {
      uotId,
      motivo: reason.trim(),
    };

    return this.api
      .organizacionesDeshabilitarArea(
        {
          id,
          xIdempotencyKey: this.idempotency.create(),
          organizationDisableRequest,
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
