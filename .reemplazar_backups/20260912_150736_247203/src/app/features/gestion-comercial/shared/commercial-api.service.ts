import { inject, Injectable } from '@angular/core';
import { forkJoin, map } from 'rxjs';

import { IdempotencyKeyService } from '../../../core/http/services/idempotency-key.service';
import {
  AcopioYEntregasService,
  CampaignCreateRequest,
  CampaignParticipantIncludeRequest,
  CampaignParticipantProgramRequest,
  CampaignParticipantRemoveRequest,
  CampaignTransitionRequest,
  CampaignUpdateRequest,
  CampaasDeVentaService,
  CatlogosService,
  CondicionesYPreciosService,
  ControlDeJabasService,
  CrateAnnulRequest,
  CrateAssignRequest,
  CrateReceiveRequest,
  CrateReturnCratesRequest,
  DeliveryAnnulRequest,
  DeliveryCreateRequest,
  DeliveryUpdatePreliminaryRequest,
  OperativosDeVentaService,
  OrganizacionesService,
  ParticipantesDeCampaaService,
  PrediosService,
  PricingCreateConditionRequest,
  PricingCreatePriceRequest,
  PricingDisableRequest,
  PricingUpdateConditionRequest,
  PricingVersionPriceRequest,
  ProductoresService,
  SalesOperationCreateRequest,
  SalesOperationTransitionRequest,
  SalesOperationUpdateRequest,
  SalesOperationZonesRequest,
} from '../../../infrastructure/openapi/generated';
import { PageResult } from '../../../shared/models/page-result.model';
import { AdminApiMapper } from '../../administracion/shared/admin-api.mapper';

export type CommercialWorkspace =
  | 'campaigns'
  | 'participants'
  | 'operations'
  | 'deliveries'
  | 'crates'
  | 'pricing';

export interface CommercialOption {
  value: number;
  label: string;
  description?: string;
}

export interface CommercialReferences {
  associations: readonly CommercialOption[];
  buyers: readonly CommercialOption[];
  producers: readonly CommercialOption[];
  properties: readonly CommercialOption[];
  campaigns: readonly CommercialOption[];
  operations: readonly CommercialOption[];
  conditions: readonly CommercialOption[];
  varieties: readonly CommercialOption[];
  salesModalities: readonly CommercialOption[];
  zones: readonly CommercialOption[];
}

@Injectable({ providedIn: 'root' })
export class CommercialApiService {
  private readonly campaignsApi = inject(CampaasDeVentaService);
  private readonly participantsApi = inject(ParticipantesDeCampaaService);
  private readonly operationsApi = inject(OperativosDeVentaService);
  private readonly deliveriesApi = inject(AcopioYEntregasService);
  private readonly cratesApi = inject(ControlDeJabasService);
  private readonly pricingApi = inject(CondicionesYPreciosService);
  private readonly organizationsApi = inject(OrganizacionesService);
  private readonly producersApi = inject(ProductoresService);
  private readonly propertiesApi = inject(PrediosService);
  private readonly catalogsApi = inject(CatlogosService);
  private readonly mapper = inject(AdminApiMapper);
  private readonly idempotency = inject(IdempotencyKeyService);

  list(
    workspace: CommercialWorkspace,
    page: number,
    size: number,
    filters: Record<string, unknown> = {},
  ) {
    switch (workspace) {
      case 'campaigns':
        return this.campaignsApi.campaniasListar({
          estadoProceso: this.text(filters['state']),
          asociacionId: this.positive(filters['associationId']),
          empresaCompradoraId: this.positive(filters['buyerId']),
          fechaDesde: this.text(filters['from']),
          fechaHasta: this.text(filters['to']),
          pagina: page,
          tamano: size,
        }, 'body', false, { transferCache: false }).pipe(map((r) => this.page(r, size)));
      case 'participants':
        return this.participantsApi.participantesListar({
          campaniaVentaId: this.positive(filters['campaignId']),
          estadoParticipacion: this.text(filters['state']),
          pagina: page,
          tamano: size,
        }, 'body', false, { transferCache: false }).pipe(map((r) => this.page(r, size)));
      case 'operations':
        return this.operationsApi.operativosListar({
          campaniaVentaId: this.positive(filters['campaignId']),
          estadoProceso: this.text(filters['state']),
          pagina: page,
          tamano: size,
        }, 'body', false, { transferCache: false }).pipe(map((r) => this.page(r, size)));
      case 'deliveries':
        return this.deliveriesApi.entregasListar({
          operativoVentaId: this.positive(filters['operationId']),
          socioId: this.positive(filters['producerId']),
          estadoProceso: this.text(filters['state']),
          estadoControlCalidad: this.text(filters['qualityState']),
          fechaDesde: this.text(filters['from']),
          fechaHasta: this.text(filters['to']),
          pagina: page,
          tamano: size,
        }, 'body', false, { transferCache: false }).pipe(map((r) => this.page(r, size)));
      case 'crates':
        return this.cratesApi.jabasListar({
          operativoVentaId: this.positive(filters['operationId']),
          pagina: page,
          tamano: size,
        }, 'body', false, { transferCache: false }).pipe(map((r) => this.page(r, size)));
      case 'pricing':
        return this.pricingApi.preciosListar({
          campaniaVentaId: this.positive(filters['campaignId']),
          operativoVentaId: this.positive(filters['operationId']),
          variedadPaltaId: this.positive(filters['varietyId']),
          condicionComercialId: this.positive(filters['conditionId']),
          pagina: page,
          tamano: size,
        }, 'body', false, { transferCache: false }).pipe(map((r) => this.page(r, size)));
    }
  }

  listConditions(page: number, size: number) {
    return this.pricingApi.preciosCondicionesListar({ pagina: page, tamano: size }, 'body', false, { transferCache: false })
      .pipe(map((r) => this.page(r, size)));
  }

  detail(workspace: CommercialWorkspace, id: number) {
    switch (workspace) {
      case 'campaigns': return this.campaignsApi.campaniasVer({ id }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataRecord(r)));
      case 'participants': return this.participantsApi.participantesVer({ id }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataRecord(r)));
      case 'operations': return this.operationsApi.operativosVer({ id }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataRecord(r)));
      case 'deliveries': return this.deliveriesApi.entregasVer({ id }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataRecord(r)));
      case 'crates': return this.cratesBalance(id);
      case 'pricing': return this.priceHistory(id).pipe(map((items) => ({ historial: items })));
    }
  }

  createCampaign(request: CampaignCreateRequest) {
    return this.campaignsApi.campaniasCrear({ xIdempotencyKey: this.key(), campaignCreateRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'campaniaVentaId')));
  }
  updateCampaign(id: number, request: CampaignUpdateRequest) {
    return this.campaignsApi.campaniasEditar({ id, xIdempotencyKey: this.key(), campaignUpdateRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  activateCampaign(id: number, motivo?: string) { return this.campaignTransition('activate', id, { motivo }); }
  closeCampaign(id: number, motivo?: string) { return this.campaignTransition('close', id, { motivo }); }
  cancelCampaign(id: number, motivo?: string) { return this.campaignTransition('cancel', id, { motivo }); }

  includeParticipant(request: CampaignParticipantIncludeRequest) {
    return this.participantsApi.participantesIncluir({ xIdempotencyKey: this.key(), campaignParticipantIncludeRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  programParticipant(id: number, request: CampaignParticipantProgramRequest) {
    return this.participantsApi.participantesProgramarOperativo({ id, xIdempotencyKey: this.key(), campaignParticipantProgramRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  removeParticipant(id: number, request: CampaignParticipantRemoveRequest) {
    return this.participantsApi.participantesRetirar({ id, xIdempotencyKey: this.key(), campaignParticipantRemoveRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }

  createOperation(request: SalesOperationCreateRequest) {
    return this.operationsApi.operativosCrear({ xIdempotencyKey: this.key(), salesOperationCreateRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'operativoVentaId')));
  }
  updateOperation(id: number, request: SalesOperationUpdateRequest) {
    return this.operationsApi.operativosEditar({ id, xIdempotencyKey: this.key(), salesOperationUpdateRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  setOperationZones(id: number, request: SalesOperationZonesRequest) {
    return this.operationsApi.operativosAsignarZonas({ id, xIdempotencyKey: this.key(), salesOperationZonesRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  startOperation(id: number, motivo?: string) { return this.operationTransition('start', id, { motivo }); }
  closeOperation(id: number, motivo?: string) { return this.operationTransition('close', id, { motivo }); }
  cancelOperation(id: number, motivo?: string) { return this.operationTransition('cancel', id, { motivo }); }

  createDelivery(request: DeliveryCreateRequest) {
    return this.deliveriesApi.entregasCrear({ xIdempotencyKey: this.key(), deliveryCreateRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'entregaSocioId')));
  }
  updateDelivery(id: number, request: DeliveryUpdatePreliminaryRequest) {
    return this.deliveriesApi.entregasEditarPreliminar({ id, xIdempotencyKey: this.key(), deliveryUpdatePreliminaryRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  confirmDelivery(id: number) {
    return this.deliveriesApi.entregasConfirmar({ id, xIdempotencyKey: this.key() }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  annulDelivery(id: number, request: DeliveryAnnulRequest) {
    return this.deliveriesApi.entregasAnular({ id, xIdempotencyKey: this.key(), deliveryAnnulRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }

  receiveCrates(request: CrateReceiveRequest) {
    return this.cratesApi.jabasRegistrarRecepcion({ xIdempotencyKey: this.key(), crateReceiveRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  assignCrates(request: CrateAssignRequest) {
    return this.cratesApi.jabasAsignar({ xIdempotencyKey: this.key(), crateAssignRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  returnCrates(request: CrateReturnCratesRequest) {
    return this.cratesApi.jabasRegistrarDevolucion({ xIdempotencyKey: this.key(), crateReturnCratesRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  annulCrateMovement(request: CrateAnnulRequest) {
    return this.cratesApi.jabasAnularMovimiento({ xIdempotencyKey: this.key(), crateAnnulRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  cratesBalance(operationId: number, operationPartnerId?: number) {
    return this.cratesApi.jabasSaldo({ operativoVentaId: operationId, operativoSocioId: operationPartnerId }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataRecord(r)));
  }
  cratesHistory(operationId?: number, operationPartnerId?: number) {
    return this.cratesApi.jabasHistorial({ operativoVentaId: operationId, operativoSocioId: operationPartnerId }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataArray(r)));
  }

  createCondition(request: PricingCreateConditionRequest) {
    return this.pricingApi.preciosCondicionesCrear({ xIdempotencyKey: this.key(), pricingCreateConditionRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  updateCondition(id: number, request: PricingUpdateConditionRequest) {
    return this.pricingApi.preciosCondicionesEditar({ id, xIdempotencyKey: this.key(), pricingUpdateConditionRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  disableCondition(id: number, request: PricingDisableRequest) {
    return this.pricingApi.preciosCondicionesDeshabilitar({ id, xIdempotencyKey: this.key(), pricingDisableRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.mapper.void(r)));
  }
  createPrice(request: PricingCreatePriceRequest) {
    return this.pricingApi.preciosCrear({ xIdempotencyKey: this.key(), pricingCreatePriceRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  versionPrice(id: number, request: PricingVersionPriceRequest) {
    return this.pricingApi.preciosVersionar({ id, xIdempotencyKey: this.key(), pricingVersionPriceRequest: request }, 'body', false, { transferCache: false }).pipe(map((r) => this.createdId(r, 'id')));
  }
  priceHistory(id: number) {
    return this.pricingApi.preciosHistorial({ id }, 'body', false, { transferCache: false }).pipe(map((r) => this.dataArray(r)));
  }

  operationPartners(operationId: number) {
    return this.operationsApi
      .operativosVer({ id: operationId }, 'body', false, { transferCache: false })
      .pipe(
        map((response) => {
          const detail = this.dataRecord(response);
          const participants = this.mapper.array(detail['participantes']);
          return participants
            .map((value) => this.mapper.record(value))
            .map((row) => ({
              value: this.num(row['operativoSocioId']),
              label: this.str(row['socioNombre']),
              description: this.str(row['numeroDocumento']) || undefined,
            }))
            .filter((item) => item.value > 0);
        }),
      );
  }

  crateAssignmentOptions(operationId: number) {
    return this.cratesHistory(operationId).pipe(
      map((rows) => {
        const seen = new Set<number>();
        return rows
          .filter((row) => this.str(row['tipoMovimiento']) === 'ASIGNACION')
          .map((row) => ({
            value: this.num(row['jabaAsignacionId']),
            label: `Asignación #${this.num(row['jabaAsignacionId'])}`,
            description: this.str(row['usuario']) || undefined,
          }))
          .filter((item) => {
            if (item.value <= 0 || seen.has(item.value)) return false;
            seen.add(item.value);
            return true;
          });
      }),
    );
  }

  references() {
    return forkJoin({
      organizations: this.organizationsApi.organizacionesListar({ pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      producers: this.producersApi.productoresListar({ pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      properties: this.propertiesApi.prediosListar({ soloActivos: true, pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      campaigns: this.campaignsApi.campaniasListar({ pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      operations: this.operationsApi.operativosListar({ pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      conditions: this.pricingApi.preciosCondicionesListar({ pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      varieties: this.catalogsApi.catalogosListar({ catalogo: 'VARIEDAD_PALTA', pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      modalities: this.catalogsApi.catalogosListar({ catalogo: 'MODALIDAD_VENTA', pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
      zones: this.catalogsApi.catalogosListar({ catalogo: 'ZONA_PRODUCTIVA', pagina: 1, tamano: 100 }, 'body', false, { transferCache: false }),
    }).pipe(map((result): CommercialReferences => {
      const organizations = this.page(result.organizations, 100).items;
      return {
        associations: organizations.filter((row) => this.bool(row['esAsociacion'])).map((row) => this.option(row, 'empresaId', 'razonSocial', 'ruc')),
        buyers: organizations.filter((row) => !this.bool(row['esAsociacion'])).map((row) => this.option(row, 'empresaId', 'razonSocial', 'ruc')),
        producers: this.page(result.producers, 100).items
          .filter((row) => this.num(row['socioAsociacionId']) > 0)
          .map((row) => ({ value: this.num(row['socioAsociacionId']), label: `${this.str(row['nombres'])} ${this.str(row['apellidoPaterno'])}`.trim(), description: this.str(row['numeroDocumento']) })),
        properties: this.page(result.properties, 100).items.map((row) => this.option(row, 'predioId', 'nombre', 'codigo')),
        campaigns: this.page(result.campaigns, 100).items.map((row) => this.option(row, 'campaniaVentaId', 'nombre', 'codigo')),
        operations: this.page(result.operations, 100).items.map((row) => this.option(row, 'operativoVentaId', 'codigo', 'campania')),
        conditions: this.page(result.conditions, 100).items.map((row) => this.option(row, 'condicionComercialId', 'nombre', 'codigo')),
        varieties: this.catalogOptions(result.varieties),
        salesModalities: this.catalogOptions(result.modalities),
        zones: this.catalogOptions(result.zones),
      };
    }));
  }

  private campaignTransition(action: 'activate' | 'close' | 'cancel', id: number, request: CampaignTransitionRequest) {
    const params = { id, xIdempotencyKey: this.key(), campaignTransitionRequest: request };
    const call = action === 'activate'
      ? this.campaignsApi.campaniasActivar(params, 'body', false, { transferCache: false })
      : action === 'close'
        ? this.campaignsApi.campaniasCerrar(params, 'body', false, { transferCache: false })
        : this.campaignsApi.campaniasCancelar(params, 'body', false, { transferCache: false });
    return call.pipe(map((r) => this.mapper.void(r)));
  }

  private operationTransition(action: 'start' | 'close' | 'cancel', id: number, request: SalesOperationTransitionRequest) {
    const params = { id, xIdempotencyKey: this.key(), salesOperationTransitionRequest: request };
    const call = action === 'start'
      ? this.operationsApi.operativosIniciarRecepcion(params, 'body', false, { transferCache: false })
      : action === 'close'
        ? this.operationsApi.operativosCerrar(params, 'body', false, { transferCache: false })
        : this.operationsApi.operativosCancelar(params, 'body', false, { transferCache: false });
    return call.pipe(map((r) => this.mapper.void(r)));
  }

  private page(response: unknown, size: number): PageResult<Record<string, unknown>> {
    return this.mapper.page(response, (row) => row, size);
  }
  private dataRecord(response: unknown): Record<string, unknown> { return this.mapper.record(this.mapper.data<unknown>(response)); }
  private dataArray(response: unknown): readonly Record<string, unknown>[] { return this.mapper.array(this.mapper.data<unknown>(response)).map((row) => this.mapper.record(row)); }
  private createdId(response: unknown, key: string): number { return this.num(this.mapper.record(this.mapper.data<unknown>(response))[key]); }
  private key(): string { return this.idempotency.create(); }
  private text(value: unknown): string | undefined { const result = this.str(value); return result || undefined; }
  private positive(value: unknown): number | undefined { const result = this.num(value); return result > 0 ? result : undefined; }
  private num(value: unknown): number { const result = Number(value); return Number.isFinite(result) ? result : 0; }
  private str(value: unknown): string { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
  private bool(value: unknown): boolean { return value === true || value === 1 || value === '1' || value === 'true'; }
  private option(row: Record<string, unknown>, idKey: string, labelKey: string, descriptionKey: string): CommercialOption {
    return { value: this.num(row[idKey]), label: this.str(row[labelKey]), description: this.str(row[descriptionKey]) || undefined };
  }
  private catalogOptions(response: unknown): readonly CommercialOption[] {
    return this.page(response, 100).items.map((row) => ({ value: this.num(row['id']), label: this.str(row['nombre']), description: this.str(row['codigo']) || undefined })).filter((item) => item.value > 0);
  }
}
