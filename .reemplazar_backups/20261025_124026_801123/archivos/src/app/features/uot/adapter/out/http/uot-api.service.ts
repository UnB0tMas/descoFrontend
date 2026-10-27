import { Injectable, inject } from '@angular/core';
import { map, switchMap, tap } from 'rxjs';

import { IdempotencyKeyService } from '../../../../../core/http/services/idempotency-key.service';
import { UOTService } from '../../../../../infrastructure/openapi/generated/api/uOT.service';
import { UotAssignRoleRequest } from '../../../../../infrastructure/openapi/generated/model/uotAssignRoleRequest';
import { UotAssignUserRequest } from '../../../../../infrastructure/openapi/generated/model/uotAssignUserRequest';
import { UotCreateRequest } from '../../../../../infrastructure/openapi/generated/model/uotCreateRequest';
import { UotDeactivateRequest } from '../../../../../infrastructure/openapi/generated/model/uotDeactivateRequest';
import { UotDeactivationImpactResponse } from '../../../../../infrastructure/openapi/generated/model/uotDeactivationImpactResponse';
import { UotResourceTransferResponse } from '../../../../../infrastructure/openapi/generated/model/uotResourceTransferResponse';
import { UotSelectContextRequest } from '../../../../../infrastructure/openapi/generated/model/uotSelectContextRequest';
import { UotTransferResourcesRequest } from '../../../../../infrastructure/openapi/generated/model/uotTransferResourcesRequest';
import { UotUpdateRequest } from '../../../../../infrastructure/openapi/generated/model/uotUpdateRequest';
import { UotContextResponse } from '../../../../../infrastructure/openapi/generated/model/uotContextResponse';
import { UotUnitResponse } from '../../../../../infrastructure/openapi/generated/model/uotUnitResponse';
import { unwrapApiResponse } from '../../../../../infrastructure/openapi/api-response-unwrapper';
import { ObtenerContextoActualUseCase } from '../../../../acceso/application/use-case/obtener-contexto-actual.use-case';
import {
  UotContext,
  UotDeactivationImpact,
  UotMode,
  UotResourceTransfer,
  UotTransferResources,
  UotUnit,
} from '../../../domain/uot.model';
import { UotContextStore } from '../../../state/uot-context.store';

@Injectable({ providedIn: 'root' })
export class UotApiService {
  private readonly api = inject(UOTService);
  private readonly idempotency = inject(IdempotencyKeyService);
  private readonly accessContext = inject(ObtenerContextoActualUseCase);
  private readonly store = inject(UotContextStore);

  loadContext() {
    return this.api
      .uotContexto({}, 'body', false, { transferCache: false })
      .pipe(
        map((response) => this.mapContext(unwrapApiResponse<UotContextResponse>(response))),
        tap((context) => this.store.set(context)),
      );
  }

  selectContext(mode: UotMode, uotId?: number | null) {
    const body: UotSelectContextRequest = {
      modo: mode,
      uotId: mode === 'ESPECIFICA' ? uotId ?? undefined : undefined,
    };

    return this.api
      .uotSeleccionarContexto(
        {
          xIdempotencyKey: this.idempotency.create(),
          uotSelectContextRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => this.mapContext(unwrapApiResponse<UotContextResponse>(response))),
        switchMap((context) =>
          this.accessContext.execute().pipe(map(() => context)),
        ),
        tap((context) => this.store.set(context)),
      );
  }

  list(includeInactive = false, uotId?: number) {
    return this.api
      .uotListar(
        { incluirInactivas: includeInactive, uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          (unwrapApiResponse<UotUnitResponse[]>(response) ?? []).map((item) =>
            this.mapUnit(item),
          ),
        ),
      );
  }

  create(body: UotCreateRequest) {
    return this.api
      .uotCrear(
        {
          xIdempotencyKey: this.idempotency.create(),
          uotCreateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  update(uotId: number, body: UotUpdateRequest) {
    return this.api
      .uotEditar(
        {
          uotId,
          xIdempotencyKey: this.idempotency.create(),
          uotUpdateRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  impact(uotId: number) {
    return this.api
      .uotImpactoBaja(
        { uotId },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          this.mapImpact(
            unwrapApiResponse<UotDeactivationImpactResponse>(response),
          ),
        ),
      );
  }

  transferResources(uotId: number, input: UotTransferResources) {
    const uotTransferResourcesRequest: UotTransferResourcesRequest = {
      uotDestinoId: input.uotDestinoId,
      almacenOrigenId: input.almacenOrigenId,
      almacenDestinoId: input.almacenDestinoId,
      transferirStock: input.transferirStock,
      bienIds: input.bienIds ? [...input.bienIds] : undefined,
      suministroIds: input.suministroIds ? [...input.suministroIds] : undefined,
      motivo: input.motivo.trim(),
    };

    return this.api
      .uotTransferirRecursos(
        {
          uotId,
          xIdempotencyKey: this.idempotency.create(),
          uotTransferResourcesRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) =>
          this.mapTransfer(
            unwrapApiResponse<UotResourceTransferResponse>(response),
          ),
        ),
      );
  }

  deactivate(uotId: number, reason: string) {
    const uotDeactivateRequest: UotDeactivateRequest = {
      motivo: reason.trim(),
    };

    return this.api
      .uotDeshabilitar(
        {
          uotId,
          xIdempotencyKey: this.idempotency.create(),
          uotDeactivateRequest,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  assignUser(uotId: number, body: UotAssignUserRequest) {
    return this.api
      .uotAsignarUsuario(
        {
          uotId,
          xIdempotencyKey: this.idempotency.create(),
          uotAssignUserRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  assignRole(uotId: number, body: UotAssignRoleRequest) {
    return this.api
      .uotAsignarRol(
        {
          uotId,
          xIdempotencyKey: this.idempotency.create(),
          uotAssignRoleRequest: body,
        },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(map((response) => unwrapApiResponse(response)));
  }

  private mapContext(value: UotContextResponse | undefined): UotContext {
    const uots = (value?.uots ?? [])
      .filter((item) => Number(item.uotId) > 0)
      .map((item) => ({
        usuarioUotId: item.usuarioUotId ?? null,
        uotId: Number(item.uotId),
        codigo: item.codigo?.trim() ?? '',
        nombre: item.nombre?.trim() || `UOT ${item.uotId}`,
        predeterminada: item.predeterminada === true,
        roles: [...(item.roles ?? [])],
      }));

    const selected = Number(value?.uotSeleccionadaId);
    const mode: UotMode = value?.modo === 'GENERAL' ? 'GENERAL' : 'ESPECIFICA';

    return {
      modo: mode,
      uotSeleccionadaId:
        Number.isFinite(selected) && selected > 0 ? selected : null,
      requiereSeleccion: value?.requiereSeleccion === true,
      permiteModoGeneral: value?.permiteModoGeneral === true,
      uots,
    };
  }

  private mapUnit(value: UotUnitResponse): UotUnit {
    return {
      uotId: Number(value.uotId ?? 0),
      uotPadreId: value.uotPadreId ?? null,
      ubicacionId: value.ubicacionId ?? null,
      codigo: value.codigo?.trim() ?? '',
      nombre: value.nombre?.trim() ?? '',
      descripcion: value.descripcion?.trim() || null,
      esRaiz: value.esRaiz === true,
      fechaInicio: value.fechaInicio ?? null,
      fechaFin: value.fechaFin ?? null,
      estado: value.estado !== false,
      asignada: value.asignada === true,
      predeterminada: value.predeterminada === true,
    };
  }

  private mapImpact(
    value: UotDeactivationImpactResponse | undefined,
  ): UotDeactivationImpact {
    return {
      uotId: Number(value?.uotId ?? 0),
      uotIncluidas: Number(value?.uotIncluidas ?? 0),
      usuariosActivos: Number(value?.usuariosActivos ?? 0),
      usuariosExclusivos: Number(value?.usuariosExclusivos ?? 0),
      empleadosActivos: Number(value?.empleadosActivos ?? 0),
      areasActivas: Number(value?.areasActivas ?? 0),
      organizacionesActivas: Number(value?.organizacionesActivas ?? 0),
      prediosActivos: Number(value?.prediosActivos ?? 0),
      almacenesActivos: Number(value?.almacenesActivos ?? 0),
      productosConStock: Number(value?.productosConStock ?? 0),
      stockReservado: Number(value?.stockReservado ?? 0),
      suministrosConStock: Number(value?.suministrosConStock ?? 0),
      suministrosReservados: Number(value?.suministrosReservados ?? 0),
      bienesActivos: Number(value?.bienesActivos ?? 0),
      ventasAbiertas: Number(value?.ventasAbiertas ?? 0),
      campaniasAbiertas: Number(value?.campaniasAbiertas ?? 0),
      operativosAbiertos: Number(value?.operativosAbiertos ?? 0),
      salidasAbiertas: Number(value?.salidasAbiertas ?? 0),
      recursosAbiertos: Number(value?.recursosAbiertos ?? 0),
      puedeDeshabilitar: value?.puedeDeshabilitar === true,
      bloqueos: [...(value?.bloqueos ?? [])],
    };
  }

  private mapTransfer(
    value: UotResourceTransferResponse | undefined,
  ): UotResourceTransfer {
    return {
      movimientoSalidaId: value?.movimientoSalidaId ?? null,
      movimientoEntradaId: value?.movimientoEntradaId ?? null,
      productosTransferidos: Number(value?.productosTransferidos ?? 0),
      bienesTransferidos: Number(value?.bienesTransferidos ?? 0),
      suministrosTransferidos: Number(value?.suministrosTransferidos ?? 0),
    };
  }
}
