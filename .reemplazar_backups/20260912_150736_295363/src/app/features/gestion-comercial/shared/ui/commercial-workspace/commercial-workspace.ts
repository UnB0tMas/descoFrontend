import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRotateLeft,
  faBoxesStacked,
  faCalendarDays,
  faCheck,
  faCoins,
  faEye,
  faFloppyDisk,
  faPen,
  faPlus,
  faReceipt,
  faTruck,
  faUserGroup,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { Observable, finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../infrastructure/openapi/openapi-http-error.mapper';
import {
  DeliveryCreateRequest,
  DeliveryLineRequest,
  DeliveryUpdatePreliminaryRequest,
} from '../../../../../infrastructure/openapi/generated';
import { EmptyStateComponent } from '../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../shared/forms/form-error/form-error';
import {
  localDateTimeInputNow,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  todayLocalIsoDate,
} from '../../../../../shared/forms/validators/desco-input.validators';
import { PageHeaderComponent } from '../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../shared/models/page-result.model';
import { buildSystemCode } from '../../../../administracion/shared/admin-code.util';
import {
  CommercialApiService,
  CommercialOption,
  CommercialReferences,
  CommercialWorkspace,
} from '../../commercial-api.service';

type PricingTab = 'prices' | 'conditions';
type ModalKind =
  | 'campaign'
  | 'participant-include'
  | 'participant-program'
  | 'operation'
  | 'operation-zones'
  | 'delivery'
  | 'crate-receive'
  | 'crate-assign'
  | 'crate-return'
  | 'crate-annul'
  | 'condition'
  | 'price'
  | 'price-version'
  | 'detail';

interface TableColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

const EMPTY_REFS: CommercialReferences = {
  associations: [],
  buyers: [],
  producers: [],
  properties: [],
  campaigns: [],
  operations: [],
  conditions: [],
  varieties: [],
  salesModalities: [],
  zones: [],
};

@Component({
  selector: 'app-commercial-workspace',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FaIconComponent,
    PermissionDirective,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    FormErrorComponent,
  ],
  templateUrl: './commercial-workspace.html',
  styleUrl: './commercial-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommercialWorkspacePage implements OnInit {
  @ViewChild('editorDialog', { static: true }) private editorDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('detailDialog', { static: true }) private detailDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CommercialApiService);
  private readonly toast = inject(ToastService);

  readonly workspace = signal<CommercialWorkspace>('campaigns');
  readonly pricingTab = signal<PricingTab>('prices');
  readonly rows = signal<PageResult<Record<string, unknown>>>(emptyPageResult(20));
  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly saving = signal(false);
  readonly actionKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly modalKind = signal<ModalKind>('campaign');
  readonly editingId = signal<number | null>(null);
  readonly detail = signal<Record<string, unknown> | null>(null);
  readonly detailLoading = signal(false);
  readonly refs = signal<CommercialReferences>(EMPTY_REFS);
  readonly operationPartners = signal<readonly CommercialOption[]>([]);
  readonly crateAssignments = signal<readonly CommercialOption[]>([]);
  readonly selectedZones = signal<readonly number[]>([]);
  readonly nowDateTime = signal(localDateTimeInputNow());
  readonly today = signal(todayLocalIsoDate());

  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;
  readonly refreshIcon = faArrowRotateLeft;
  readonly confirmIcon = faCheck;

  readonly filterForm = this.fb.nonNullable.group({
    state: [''],
    associationId: [0],
    buyerId: [0],
    campaignId: [0],
    operationId: [0],
    producerId: [0],
    qualityState: [''],
    varietyId: [0],
    conditionId: [0],
    from: [''],
    to: [''],
  });

  readonly campaignForm = this.fb.nonNullable.group({
    associationId: [0, [Validators.required, Validators.min(1)]],
    buyerId: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, notBlankValidator, Validators.maxLength(180)]],
    start: ['', [Validators.required]],
    end: ['', [Validators.required]],
    observation: ['', [Validators.maxLength(400)]],
  });

  readonly participantForm = this.fb.nonNullable.group({
    campaignId: [0, [Validators.required, Validators.min(1)]],
    partnerAssociationId: [0, [Validators.required, Validators.min(1)]],
    operationId: [0, [Validators.required, Validators.min(1)]],
  });

  readonly operationForm = this.fb.nonNullable.group({
    campaignId: [0, [Validators.required, Validators.min(1)]],
    start: ['', [Validators.required]],
    end: ['', [Validators.required]],
    observation: ['', [Validators.maxLength(400)]],
  });

  readonly deliveryForm = this.fb.nonNullable.group({
    operationId: [0, [Validators.required, Validators.min(1)]],
    operationPartnerId: [0, [Validators.required, Validators.min(1)]],
    propertyId: [0, [Validators.required, Validators.min(1)]],
    dateTime: ['', [Validators.required]],
    grossKg: [0, [Validators.required, Validators.min(0.001)]],
    tareKg: [0, [Validators.required, Validators.min(0)]],
    rejectedKg: [0, [Validators.required, Validators.min(0)]],
    qualityState: ['PENDIENTE', [Validators.required]],
    ticket: ['', [Validators.maxLength(80)]],
    observation: ['', [Validators.maxLength(400)]],
    details: this.fb.array([this.deliveryLineGroup()]),
  });

  readonly crateForm = this.fb.nonNullable.group({
    operationId: [0, [Validators.required, Validators.min(1)]],
    operationPartnerId: [0, [Validators.required, Validators.min(1)]],
    assignmentId: [0, [Validators.required, Validators.min(1)]],
    deliveryId: [0],
    quantity: [1, [Validators.required, Validators.min(1)]],
    filled: [0, [Validators.required, Validators.min(0)]],
    empty: [0, [Validators.required, Validators.min(0)]],
    reference: ['', [Validators.maxLength(80)]],
    observation: ['', [Validators.maxLength(300)]],
    movementType: ['ASIGNACION', [Validators.required]],
    movementId: [0, [Validators.required, Validators.min(1)]],
    reason: ['', [Validators.required, notBlankValidator, Validators.maxLength(300)]],
  });

  readonly conditionForm = this.fb.nonNullable.group({
    modalityId: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, notBlankValidator, Validators.maxLength(160)]],
    description: ['', [Validators.maxLength(300)]],
    minWeight: [0, [Validators.min(0)]],
    maxWeight: [0, [Validators.min(0)]],
  });

  readonly priceForm = this.fb.nonNullable.group({
    campaignId: [0, [Validators.required, Validators.min(1)]],
    operationId: [0],
    varietyId: [0, [Validators.required, Validators.min(1)]],
    conditionId: [0, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0.0001)]],
    currency: ['PEN', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    unit: ['KG', [Validators.required, notBlankValidator, Validators.maxLength(10)]],
    validFrom: ['', [Validators.required]],
  });

  readonly qualityStates = ['PENDIENTE', 'CONFORME', 'OBSERVADO', 'RECHAZADO'] as const;

  readonly title = computed(() => ({
    campaigns: 'Campañas',
    participants: 'Participantes',
    operations: 'Operativos',
    deliveries: 'Entregas',
    crates: 'Jabas',
    pricing: 'Precios',
  })[this.workspace()]);

  readonly icon = computed(() => ({
    campaigns: faCalendarDays,
    participants: faUserGroup,
    operations: faTruck,
    deliveries: faReceipt,
    crates: faBoxesStacked,
    pricing: faCoins,
  })[this.workspace()]);

  readonly columns = computed<readonly TableColumn[]>(() => {
    if (this.workspace() === 'pricing' && this.pricingTab() === 'conditions') {
      return [
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Condición' },
        { key: 'modalidad', label: 'Modalidad' },
        { key: 'pesoMinimoG', label: 'Mín. g', numeric: true },
        { key: 'pesoMaximoG', label: 'Máx. g', numeric: true },
        { key: 'estado', label: 'Estado' },
      ];
    }
    return ({
      campaigns: [
        { key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Campaña' },
        { key: 'asociacion', label: 'Asociación' }, { key: 'comprador', label: 'Comprador' },
        { key: 'fechaInicio', label: 'Inicio' }, { key: 'fechaFin', label: 'Fin' }, { key: 'estadoProceso', label: 'Estado' },
      ],
      participants: [
        { key: 'numeroDocumento', label: 'Documento' }, { key: 'socioNombre', label: 'Productor' },
        { key: 'campaniaVentaId', label: 'Campaña', numeric: true }, { key: 'estadoParticipacion', label: 'Estado' },
        { key: 'operativos', label: 'Operativos', numeric: true }, { key: 'entregasConfirmadas', label: 'Entregas', numeric: true },
      ],
      operations: [
        { key: 'codigo', label: 'Código' }, { key: 'campania', label: 'Campaña' },
        { key: 'fechaInicioProgramada', label: 'Inicio' }, { key: 'fechaFinProgramada', label: 'Fin' },
        { key: 'participantes', label: 'Participantes', numeric: true }, { key: 'entregas', label: 'Entregas', numeric: true },
        { key: 'estadoProceso', label: 'Estado' },
      ],
      deliveries: [
        { key: 'codigoLote', label: 'Lote' }, { key: 'socioNombre', label: 'Productor' },
        { key: 'operativo', label: 'Operativo' }, { key: 'fechaHora', label: 'Fecha' },
        { key: 'pesoAceptadoKg', label: 'Kg aceptados', numeric: true }, { key: 'estadoControlCalidad', label: 'Calidad' },
        { key: 'estadoProceso', label: 'Estado' },
      ],
      crates: [
        { key: 'codigo', label: 'Operativo' }, { key: 'cantidadJabasRecibidas', label: 'Recibidas', numeric: true },
        { key: 'jabasAsignadas', label: 'Asignadas', numeric: true }, { key: 'jabasDevueltas', label: 'Devueltas', numeric: true },
        { key: 'jabasDisponibles', label: 'Disponibles', numeric: true }, { key: 'jabasPendientes', label: 'Pendientes', numeric: true },
        { key: 'estadoProceso', label: 'Estado' },
      ],
      pricing: [
        { key: 'campania', label: 'Campaña' }, { key: 'operativo', label: 'Operativo' },
        { key: 'variedad', label: 'Variedad' }, { key: 'condicion', label: 'Condición' },
        { key: 'precio', label: 'Precio', numeric: true }, { key: 'moneda', label: 'Moneda' },
        { key: 'fechaVigenciaDesde', label: 'Vigencia' }, { key: 'vigente', label: 'Estado' },
      ],
    } as const)[this.workspace()];
  });

  get deliveryLines(): FormArray { return this.deliveryForm.controls.details; }

  ngOnInit(): void {
    const workspace = this.route.snapshot.data['workspace'] as CommercialWorkspace | undefined;
    if (workspace) this.workspace.set(workspace);
    this.loadReferences();
    this.load(1);
  }

  load(page = this.rows().page, size = this.rows().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const filters = this.filterForm.getRawValue();
    const source = this.workspace() === 'pricing' && this.pricingTab() === 'conditions'
      ? this.api.listConditions(page, size)
      : this.api.list(this.workspace(), page, size, filters);
    source.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (result) => this.rows.set(result),
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }

  loadReferences(): void {
    this.referencesLoading.set(true);
    this.api.references().pipe(finalize(() => this.referencesLoading.set(false))).subscribe({
      next: (refs) => this.refs.set(refs),
      error: () => this.refs.set(EMPTY_REFS),
    });
  }

  applyFilters(): void { this.load(1); }
  clearFilters(): void { this.filterForm.reset(); this.load(1); }
  changePricingTab(tab: PricingTab): void { this.pricingTab.set(tab); this.rows.set(emptyPageResult(this.rows().size)); this.load(1); }

  openCreate(): void {
    this.editingId.set(null);
    switch (this.workspace()) {
      case 'campaigns': this.resetCampaign(); this.openEditor('campaign'); break;
      case 'participants': this.participantForm.reset({ campaignId: 0, partnerAssociationId: 0, operationId: 0 }); this.openEditor('participant-include'); break;
      case 'operations': this.resetOperation(); this.openEditor('operation'); break;
      case 'deliveries': this.resetDelivery(); this.openEditor('delivery'); break;
      case 'crates': this.resetCrate(); this.openEditor('crate-receive'); break;
      case 'pricing':
        if (this.pricingTab() === 'conditions') { this.resetCondition(); this.openEditor('condition'); }
        else { this.resetPrice(); this.openEditor('price'); }
        break;
    }
  }

  openEdit(row: Record<string, unknown>): void {
    const id = this.idOf(row);
    if (id <= 0) return;
    this.editingId.set(id);
    if (this.workspace() === 'campaigns') {
      this.campaignForm.reset({
        associationId: this.number(row['asociacionId']), buyerId: this.number(row['empresaCompradoraId']),
        name: this.string(row['nombre']), start: this.dateValue(row['fechaInicio']), end: this.dateValue(row['fechaFin']),
        observation: this.string(row['observacion']),
      });
      this.campaignForm.controls.associationId.disable({ emitEvent: false });
      this.openEditor('campaign');
      return;
    }
    if (this.workspace() === 'operations') {
      this.operationForm.reset({
        campaignId: this.number(row['campaniaVentaId']), start: this.dateTimeValue(row['fechaInicioProgramada']),
        end: this.dateTimeValue(row['fechaFinProgramada']), observation: this.string(row['observacion']),
      });
      this.operationForm.controls.campaignId.disable({ emitEvent: false });
      this.openEditor('operation');
      return;
    }
    if (this.workspace() === 'deliveries') {
      this.openEditor('delivery');
      this.loadDeliveryForEdit(id);
      return;
    }
    if (this.workspace() === 'pricing' && this.pricingTab() === 'conditions') {
      this.conditionForm.reset({
        modalityId: this.number(row['modalidadVentaId']), name: this.string(row['nombre']),
        description: this.string(row['descripcion']), minWeight: this.number(row['pesoMinimoG']), maxWeight: this.number(row['pesoMaximoG']),
      });
      this.conditionForm.controls.modalityId.disable({ emitEvent: false });
      this.openEditor('condition');
    }
  }

  view(row: Record<string, unknown>): void {
    const id = this.idOf(row);
    if (id <= 0) return;
    const key = `view:${id}`;
    this.actionKey.set(key);
    this.detail.set(null);
    this.detailDialog.nativeElement.showModal();
    this.detailLoading.set(true);
    this.api.detail(this.workspace(), id).pipe(finalize(() => { this.detailLoading.set(false); this.actionKey.set(null); })).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error) => { this.detail.set({ mensaje: mapOpenApiError(error).message }); },
    });
  }

  closeDetail(): void { if (this.detailDialog.nativeElement.open) this.detailDialog.nativeElement.close(); this.detail.set(null); }
  closeEditor(): void { if (!this.saving() && this.editorDialog.nativeElement.open) this.editorDialog.nativeElement.close(); }

  saveEditor(): void {
    if (this.saving()) return;
    switch (this.modalKind()) {
      case 'campaign': this.saveCampaign(); break;
      case 'participant-include': this.saveParticipantInclude(); break;
      case 'participant-program': this.saveParticipantProgram(); break;
      case 'operation': this.saveOperation(); break;
      case 'operation-zones': this.saveOperationZones(); break;
      case 'delivery': this.saveDelivery(); break;
      case 'crate-receive': this.saveCrateReceive(); break;
      case 'crate-assign': this.saveCrateAssign(); break;
      case 'crate-return': this.saveCrateReturn(); break;
      case 'crate-annul': this.saveCrateAnnul(); break;
      case 'condition': this.saveCondition(); break;
      case 'price': this.savePrice(); break;
      case 'price-version': this.savePriceVersion(); break;
      default: break;
    }
  }

  async campaignAction(row: Record<string, unknown>, action: 'activate' | 'close' | 'cancel'): Promise<void> {
    const id = this.idOf(row); if (id <= 0) return;
    const cancel = action === 'cancel';
    const result = await this.confirm.show({
      title: action === 'activate' ? 'Activar campaña' : action === 'close' ? 'Cerrar campaña' : 'Cancelar campaña',
      message: action === 'activate' ? 'La campaña quedará activa.' : action === 'close' ? 'La campaña quedará cerrada.' : 'La campaña quedará cancelada.',
      tone: cancel ? 'danger' : 'primary', confirmLabel: action === 'activate' ? 'Activar' : action === 'close' ? 'Cerrar' : 'Cancelar campaña',
      cancelLabel: 'Volver', requiresReason: cancel, reasonLabel: 'Motivo', minimumReasonLength: cancel ? 3 : 0,
    });
    if (!result.confirmed) return;
    const source = action === 'activate' ? this.api.activateCampaign(id, result.reason ?? undefined)
      : action === 'close' ? this.api.closeCampaign(id, result.reason ?? undefined)
      : this.api.cancelCampaign(id, result.reason ?? undefined);
    this.runRowAction(`${action}:${id}`, source, action === 'activate' ? 'Campaña activada' : action === 'close' ? 'Campaña cerrada' : 'Campaña cancelada');
  }

  openParticipantProgram(row: Record<string, unknown>): void {
    this.editingId.set(this.idOf(row));
    this.participantForm.patchValue({ campaignId: this.number(row['campaniaVentaId']), operationId: 0 });
    this.openEditor('participant-program');
  }

  async removeParticipant(row: Record<string, unknown>): Promise<void> {
    const id = this.idOf(row);
    const result = await this.confirm.show({ title: 'Retirar participante', message: 'El participante dejará la campaña.', tone: 'danger', confirmLabel: 'Retirar', cancelLabel: 'Volver', requiresReason: true, reasonLabel: 'Motivo', minimumReasonLength: 3 });
    if (!result.confirmed || !result.reason) return;
    this.runRowAction(`remove:${id}`, this.api.removeParticipant(id, { motivo: result.reason }), 'Participante retirado');
  }

  openZones(row: Record<string, unknown>): void {
    this.editingId.set(this.idOf(row)); this.selectedZones.set([]); this.openEditor('operation-zones');
  }
  toggleZone(id: number, checked: boolean): void {
    this.selectedZones.update((values) => checked ? [...new Set([...values, id])] : values.filter((value) => value !== id));
  }

  async operationAction(row: Record<string, unknown>, action: 'start' | 'close' | 'cancel'): Promise<void> {
    const id = this.idOf(row); const cancel = action === 'cancel';
    const result = await this.confirm.show({ title: action === 'start' ? 'Iniciar recepción' : action === 'close' ? 'Cerrar operativo' : 'Cancelar operativo', message: action === 'start' ? 'El operativo iniciará recepción.' : action === 'close' ? 'El operativo quedará cerrado.' : 'El operativo quedará cancelado.', tone: cancel ? 'danger' : 'primary', confirmLabel: action === 'start' ? 'Iniciar' : action === 'close' ? 'Cerrar' : 'Cancelar', cancelLabel: 'Volver', requiresReason: cancel, reasonLabel: 'Motivo', minimumReasonLength: cancel ? 3 : 0 });
    if (!result.confirmed) return;
    const source = action === 'start' ? this.api.startOperation(id, result.reason ?? undefined) : action === 'close' ? this.api.closeOperation(id, result.reason ?? undefined) : this.api.cancelOperation(id, result.reason ?? undefined);
    this.runRowAction(`${action}:${id}`, source, action === 'start' ? 'Recepción iniciada' : action === 'close' ? 'Operativo cerrado' : 'Operativo cancelado');
  }

  onDeliveryOperationChange(): void {
    const operationId = Number(this.deliveryForm.controls.operationId.value);
    this.deliveryForm.controls.operationPartnerId.setValue(0);
    this.operationPartners.set([]);
    if (operationId <= 0) return;
    this.api.operationPartners(operationId).subscribe({ next: (items) => this.operationPartners.set(items), error: () => this.operationPartners.set([]) });
  }

  addDeliveryLine(): void { this.deliveryLines.push(this.deliveryLineGroup()); }
  removeDeliveryLine(index: number): void { if (this.deliveryLines.length > 1) this.deliveryLines.removeAt(index); }

  async confirmDelivery(row: Record<string, unknown>): Promise<void> {
    const id = this.idOf(row);
    const result = await this.confirm.show({ title: 'Confirmar entrega', message: 'La entrega quedará confirmada.', tone: 'primary', confirmLabel: 'Confirmar', cancelLabel: 'Volver' });
    if (!result.confirmed) return;
    this.runRowAction(`confirm:${id}`, this.api.confirmDelivery(id), 'Entrega confirmada');
  }
  async annulDelivery(row: Record<string, unknown>): Promise<void> {
    const id = this.idOf(row);
    const result = await this.confirm.show({ title: 'Anular entrega', message: 'La entrega quedará anulada.', tone: 'danger', confirmLabel: 'Anular', cancelLabel: 'Volver', requiresReason: true, reasonLabel: 'Motivo', minimumReasonLength: 3 });
    if (!result.confirmed || !result.reason) return;
    this.runRowAction(`annul:${id}`, this.api.annulDelivery(id, { motivo: result.reason }), 'Entrega anulada');
  }

  openCrate(mode: 'crate-receive' | 'crate-assign' | 'crate-return' | 'crate-annul'): void {
    this.resetCrate(); this.openEditor(mode);
  }
  onCrateOperationChange(): void {
    const operationId = Number(this.crateForm.controls.operationId.value);
    this.operationPartners.set([]); this.crateAssignments.set([]);
    if (operationId <= 0) return;
    this.api.operationPartners(operationId).subscribe({ next: (items) => this.operationPartners.set(items), error: () => this.operationPartners.set([]) });
    this.api.crateAssignmentOptions(operationId).subscribe({ next: (items) => this.crateAssignments.set(items), error: () => this.crateAssignments.set([]) });
  }
  showCrateHistory(row: Record<string, unknown>): void {
    const operationId = this.number(row['operativoVentaId']); if (operationId <= 0) return;
    this.actionKey.set(`history:${operationId}`); this.detailDialog.nativeElement.showModal(); this.detailLoading.set(true);
    this.api.cratesHistory(operationId).pipe(finalize(() => { this.detailLoading.set(false); this.actionKey.set(null); })).subscribe({
      next: (items) => this.detail.set({ movimientos: items }),
      error: (error) => this.detail.set({ mensaje: mapOpenApiError(error).message }),
    });
  }

  openPriceVersion(row: Record<string, unknown>): void {
    this.editingId.set(this.idOf(row)); this.priceForm.reset({ campaignId: this.number(row['campaniaVentaId']), operationId: this.number(row['operativoVentaId']), varietyId: this.number(row['variedadPaltaId']), conditionId: this.number(row['condicionComercialId']), price: this.number(row['precio']), currency: this.string(row['moneda']) || 'PEN', unit: this.string(row['unidadMedida']) || 'KG', validFrom: this.nowDateTime() }); this.openEditor('price-version');
  }
  async disableCondition(row: Record<string, unknown>): Promise<void> {
    const id = this.idOf(row);
    const result = await this.confirm.show({ title: 'Deshabilitar condición', message: 'La condición dejará de estar disponible.', tone: 'danger', confirmLabel: 'Deshabilitar', cancelLabel: 'Volver', requiresReason: true, reasonLabel: 'Motivo', minimumReasonLength: 3 });
    if (!result.confirmed || !result.reason) return;
    this.runRowAction(`disable:${id}`, this.api.disableCondition(id, { motivo: result.reason }), 'Condición deshabilitada');
  }

  idOf(row: Record<string, unknown>): number {
    const key = this.workspace() === 'campaigns' ? 'campaniaVentaId'
      : this.workspace() === 'participants' ? 'participacionId'
      : this.workspace() === 'operations' ? 'operativoVentaId'
      : this.workspace() === 'deliveries' ? 'entregaSocioId'
      : this.workspace() === 'crates' ? 'operativoVentaId'
      : this.pricingTab() === 'conditions' ? 'condicionComercialId' : 'precioComercialId';
    return this.number(row[key]);
  }

  cell(row: Record<string, unknown>, column: TableColumn): string {
    const value = row[column.key];
    if (typeof value === 'boolean') return value ? 'Activo' : 'Inactivo';
    if (value === null || value === undefined || value === '') return '—';
    if (column.numeric) return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(this.number(value));
    const text = this.string(value);
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      const date = new Date(text); if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(date);
    }
    return text;
  }

  detailPairs(): readonly { label: string; value: string }[] {
    const raw = this.detail(); if (!raw) return [];
    const nested = ['campania', 'operativo', 'entrega'].map((key) => raw[key]).find((value) => value && typeof value === 'object' && !Array.isArray(value));
    const source = nested ? nested as Record<string, unknown> : raw;
    return Object.entries(source)
      .filter(([, value]) => !Array.isArray(value) && (typeof value !== 'object' || value === null))
      .slice(0, 18)
      .map(([key, value]) => ({ label: this.label(key), value: this.cell({ [key]: value }, { key, label: key, numeric: typeof value === 'number' }) }));
  }

  detailLists(): readonly { label: string; count: number }[] {
    const raw = this.detail(); if (!raw) return [];
    return Object.entries(raw).filter(([, value]) => Array.isArray(value)).map(([key, value]) => ({ label: this.label(key), count: (value as unknown[]).length }));
  }

  primaryPermission(): string {
    return ({ campaigns: 'CAMPANIAS_CREAR', participants: 'PARTICIPANTES_CREAR', operations: 'OPERATIVOS_CREAR', deliveries: 'ENTREGAS_CREAR', crates: 'JABAS_CREAR', pricing: 'PRECIOS_CREAR' })[this.workspace()];
  }

  modalTitle(): string {
    const editing = this.editingId() !== null;
    return ({
      campaign: editing ? 'Editar campaña' : 'Registrar campaña',
      'participant-include': 'Incluir participante', 'participant-program': 'Programar participante',
      operation: editing ? 'Editar operativo' : 'Registrar operativo', 'operation-zones': 'Asignar zonas',
      delivery: editing ? 'Editar entrega' : 'Registrar entrega', 'crate-receive': 'Registrar recepción',
      'crate-assign': 'Asignar jabas', 'crate-return': 'Registrar devolución', 'crate-annul': 'Anular movimiento',
      condition: editing ? 'Editar condición' : 'Registrar condición', price: 'Registrar precio', 'price-version': 'Nueva versión de precio', detail: 'Detalle',
    } as Record<ModalKind, string>)[this.modalKind()];
  }

  private openEditor(kind: ModalKind): void { this.modalKind.set(kind); this.editorDialog.nativeElement.showModal(); }

  private saveCampaign(): void {
    this.campaignForm.markAllAsTouched(); if (this.campaignForm.invalid) return;
    const raw = this.campaignForm.getRawValue(); if (raw.end < raw.start) { this.toast.error('Revise las fechas', 'La fecha final debe ser igual o posterior a la inicial.'); return; }
    const id = this.editingId(); this.saving.set(true);
    const source = id
      ? this.api.updateCampaign(id, { empresaCompradoraId: Number(raw.buyerId), nombre: normalizeText(raw.name), fechaInicio: raw.start, fechaFin: raw.end, observacion: normalizeOptionalText(raw.observation) })
      : this.api.createCampaign({ asociacionId: Number(raw.associationId), empresaCompradoraId: Number(raw.buyerId), codigo: buildSystemCode('CAM', raw.name, 40), nombre: normalizeText(raw.name), fechaInicio: raw.start, fechaFin: raw.end, observacion: normalizeOptionalText(raw.observation) });
    source.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved(id ? 'Campaña actualizada' : 'Campaña registrada'), error: (e) => this.editorError(e) });
  }

  private saveParticipantInclude(): void {
    this.participantForm.controls.campaignId.markAsTouched(); this.participantForm.controls.partnerAssociationId.markAsTouched();
    if (this.participantForm.controls.campaignId.invalid || this.participantForm.controls.partnerAssociationId.invalid) return;
    const raw = this.participantForm.getRawValue(); this.saving.set(true);
    this.api.includeParticipant({ campaniaVentaId: Number(raw.campaignId), socioAsociacionId: Number(raw.partnerAssociationId) }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Participante incluido'), error: (e) => this.editorError(e) });
  }

  private saveParticipantProgram(): void {
    const id = this.editingId(); this.participantForm.controls.operationId.markAsTouched(); if (!id || this.participantForm.controls.operationId.invalid) return;
    this.saving.set(true); this.api.programParticipant(id, { operativoVentaId: Number(this.participantForm.controls.operationId.value) }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Participante programado'), error: (e) => this.editorError(e) });
  }

  private saveOperation(): void {
    this.operationForm.markAllAsTouched(); if (this.operationForm.invalid) return;
    const raw = this.operationForm.getRawValue(); if (raw.end <= raw.start) { this.toast.error('Revise las fechas', 'La fecha final debe ser posterior a la inicial.'); return; }
    const id = this.editingId(); this.saving.set(true);
    const source = id
      ? this.api.updateOperation(id, { fechaInicioProgramada: new Date(raw.start).toISOString(), fechaFinProgramada: new Date(raw.end).toISOString(), observacion: normalizeOptionalText(raw.observation) })
      : this.api.createOperation({ campaniaVentaId: Number(raw.campaignId), codigo: buildSystemCode('OP', `${raw.campaignId}-${raw.start}`, 40), fechaInicioProgramada: new Date(raw.start).toISOString(), fechaFinProgramada: new Date(raw.end).toISOString(), observacion: normalizeOptionalText(raw.observation) });
    source.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved(id ? 'Operativo actualizado' : 'Operativo registrado'), error: (e) => this.editorError(e) });
  }

  private saveOperationZones(): void {
    const id = this.editingId(); const zones = [...this.selectedZones()]; if (!id || zones.length === 0) { this.toast.error('Seleccione una zona'); return; }
    this.saving.set(true); this.api.setOperationZones(id, { zonas: zones }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Zonas actualizadas'), error: (e) => this.editorError(e) });
  }

  private saveDelivery(): void {
    this.deliveryForm.markAllAsTouched(); if (this.deliveryForm.invalid) return;
    const raw = this.deliveryForm.getRawValue();
    const accepted = Number(raw.grossKg) - Number(raw.tareKg) - Number(raw.rejectedKg);
    if (accepted <= 0) { this.toast.error('Revise los pesos', 'El peso aceptado debe ser mayor que cero.'); return; }
    const details: DeliveryLineRequest[] = raw.details.map((line) => ({ variedadPaltaId: Number(line.varietyId), condicionComercialId: Number(line.conditionId), kilogramos: Number(line.kg) }));
    const detailKg = details.reduce((sum, line) => sum + line.kilogramos, 0);
    if (detailKg > accepted + 0.001) { this.toast.error('Revise el detalle', 'Los kilogramos del detalle superan el peso aceptado.'); return; }
    const id = this.editingId(); this.saving.set(true);
    const common = { pesoBrutoKg: Number(raw.grossKg), taraKg: Number(raw.tareKg), pesoRechazadoKg: Number(raw.rejectedKg), estadoControlCalidad: raw.qualityState, ticketBalanza: normalizeOptionalText(raw.ticket), observacion: normalizeOptionalText(raw.observation), detalles: details };
    const source = id
      ? this.api.updateDelivery(id, common satisfies DeliveryUpdatePreliminaryRequest)
      : this.api.createDelivery({ operativoSocioId: Number(raw.operationPartnerId), predioId: Number(raw.propertyId), codigoLote: buildSystemCode('LOT', `${raw.operationPartnerId}-${raw.dateTime}`, 60), fechaHora: new Date(raw.dateTime).toISOString(), ...common } satisfies DeliveryCreateRequest);
    source.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved(id ? 'Entrega actualizada' : 'Entrega registrada'), error: (e) => this.editorError(e) });
  }

  private saveCrateReceive(): void {
    const raw = this.crateForm.getRawValue(); if (Number(raw.operationId) <= 0 || Number(raw.quantity) <= 0) { this.crateForm.markAllAsTouched(); return; }
    this.saving.set(true); this.api.receiveCrates({ operativoVentaId: Number(raw.operationId), cantidad: Number(raw.quantity), referencia: normalizeOptionalText(raw.reference), observacion: normalizeOptionalText(raw.observation) }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Recepción registrada'), error: (e) => this.editorError(e) });
  }
  private saveCrateAssign(): void {
    const raw = this.crateForm.getRawValue(); if (Number(raw.operationPartnerId) <= 0 || Number(raw.quantity) <= 0) { this.crateForm.markAllAsTouched(); return; }
    this.saving.set(true); this.api.assignCrates({ operativoSocioId: Number(raw.operationPartnerId), cantidad: Number(raw.quantity), observacion: normalizeOptionalText(raw.observation) }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Jabas asignadas'), error: (e) => this.editorError(e) });
  }
  private saveCrateReturn(): void {
    const raw = this.crateForm.getRawValue(); if (Number(raw.assignmentId) <= 0 || Number(raw.filled) + Number(raw.empty) <= 0) { this.toast.error('Revise la devolución', 'Ingrese al menos una jaba devuelta.'); return; }
    this.saving.set(true); this.api.returnCrates({ jabaAsignacionId: Number(raw.assignmentId), entregaSocioId: Number(raw.deliveryId) > 0 ? Number(raw.deliveryId) : undefined, cantidadLlenas: Number(raw.filled), cantidadVacias: Number(raw.empty), observacion: normalizeOptionalText(raw.observation) }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Devolución registrada'), error: (e) => this.editorError(e) });
  }
  private saveCrateAnnul(): void {
    const raw = this.crateForm.getRawValue(); this.crateForm.controls.movementId.markAsTouched(); this.crateForm.controls.reason.markAsTouched(); if (this.crateForm.controls.movementId.invalid || this.crateForm.controls.reason.invalid) return;
    this.saving.set(true); this.api.annulCrateMovement({ tipo: raw.movementType, movimientoId: Number(raw.movementId), motivo: normalizeText(raw.reason) }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Movimiento anulado'), error: (e) => this.editorError(e) });
  }

  private saveCondition(): void {
    this.conditionForm.markAllAsTouched(); if (this.conditionForm.invalid) return;
    const raw = this.conditionForm.getRawValue(); if (raw.maxWeight > 0 && raw.minWeight > raw.maxWeight) { this.toast.error('Revise los pesos', 'El peso máximo debe ser mayor o igual al mínimo.'); return; }
    const id = this.editingId(); this.saving.set(true);
    const source = id
      ? this.api.updateCondition(id, { nombre: normalizeText(raw.name), descripcion: normalizeOptionalText(raw.description), pesoMinimoG: raw.minWeight > 0 ? Number(raw.minWeight) : undefined, pesoMaximoG: raw.maxWeight > 0 ? Number(raw.maxWeight) : undefined })
      : this.api.createCondition({ modalidadVentaId: Number(raw.modalityId), codigo: buildSystemCode('COND', raw.name, 40), nombre: normalizeText(raw.name), descripcion: normalizeOptionalText(raw.description), pesoMinimoG: raw.minWeight > 0 ? Number(raw.minWeight) : undefined, pesoMaximoG: raw.maxWeight > 0 ? Number(raw.maxWeight) : undefined });
    source.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved(id ? 'Condición actualizada' : 'Condición registrada'), error: (e) => this.editorError(e) });
  }

  private savePrice(): void {
    this.priceForm.markAllAsTouched(); if (this.priceForm.invalid) return; const raw = this.priceForm.getRawValue(); this.saving.set(true);
    this.api.createPrice({ campaniaVentaId: Number(raw.campaignId), operativoVentaId: Number(raw.operationId) > 0 ? Number(raw.operationId) : undefined, variedadPaltaId: Number(raw.varietyId), condicionComercialId: Number(raw.conditionId), precio: Number(raw.price), moneda: raw.currency.trim().toUpperCase(), unidadMedida: normalizeText(raw.unit).toUpperCase(), fechaVigenciaDesde: new Date(raw.validFrom).toISOString() }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Precio registrado'), error: (e) => this.editorError(e) });
  }
  private savePriceVersion(): void {
    const id = this.editingId(); this.priceForm.controls.price.markAsTouched(); this.priceForm.controls.validFrom.markAsTouched(); if (!id || this.priceForm.controls.price.invalid || this.priceForm.controls.validFrom.invalid) return; const raw = this.priceForm.getRawValue(); this.saving.set(true);
    this.api.versionPrice(id, { precio: Number(raw.price), fechaVigenciaDesde: new Date(raw.validFrom).toISOString() }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => this.saved('Versión registrada'), error: (e) => this.editorError(e) });
  }

  private loadDeliveryForEdit(id: number): void {
    this.detailLoading.set(true); this.api.detail('deliveries', id).pipe(finalize(() => this.detailLoading.set(false))).subscribe({
      next: (detail) => {
        const header = this.record(detail['entrega']); const lines = Array.isArray(detail['detalles']) ? detail['detalles'] as Record<string, unknown>[] : [];
        this.deliveryLines.clear(); for (const line of lines) this.deliveryLines.push(this.deliveryLineGroup(this.number(line['variedadPaltaId']), this.number(line['condicionComercialId']), this.number(line['kilogramos']))); if (this.deliveryLines.length === 0) this.deliveryLines.push(this.deliveryLineGroup());
        this.deliveryForm.reset({ operationId: this.number(header['operativoVentaId']), operationPartnerId: 0, propertyId: this.number(header['predioId']), dateTime: this.dateTimeValue(header['fechaHora']), grossKg: this.number(header['pesoBrutoKg']), tareKg: this.number(header['taraKg']), rejectedKg: this.number(header['pesoRechazadoKg']), qualityState: this.string(header['estadoControlCalidad']) || 'PENDIENTE', ticket: this.string(header['ticketBalanza']), observation: this.string(header['observacion']), details: this.deliveryLines.getRawValue() });
        this.deliveryForm.controls.operationId.disable({ emitEvent: false }); this.deliveryForm.controls.operationPartnerId.disable({ emitEvent: false }); this.deliveryForm.controls.propertyId.disable({ emitEvent: false }); this.deliveryForm.controls.dateTime.disable({ emitEvent: false });
      },
      error: (e) => this.editorError(e),
    });
  }

  private deliveryLineGroup(varietyId = 0, conditionId = 0, kg = 0) {
    return this.fb.nonNullable.group({ varietyId: [varietyId, [Validators.required, Validators.min(1)]], conditionId: [conditionId, [Validators.required, Validators.min(1)]], kg: [kg, [Validators.required, Validators.min(0.001)]] });
  }
  private resetCampaign(): void { this.campaignForm.controls.associationId.enable({ emitEvent: false }); this.campaignForm.reset({ associationId: 0, buyerId: 0, name: '', start: this.today(), end: this.today(), observation: '' }); }
  private resetOperation(): void { this.operationForm.controls.campaignId.enable({ emitEvent: false }); const now = this.nowDateTime(); this.operationForm.reset({ campaignId: 0, start: now, end: now, observation: '' }); }
  private resetDelivery(): void { this.deliveryForm.enable({ emitEvent: false }); this.deliveryLines.clear(); this.deliveryLines.push(this.deliveryLineGroup()); this.deliveryForm.reset({ operationId: 0, operationPartnerId: 0, propertyId: 0, dateTime: this.nowDateTime(), grossKg: 0, tareKg: 0, rejectedKg: 0, qualityState: 'PENDIENTE', ticket: '', observation: '', details: this.deliveryLines.getRawValue() }); this.operationPartners.set([]); }
  private resetCrate(): void { this.crateForm.reset({ operationId: 0, operationPartnerId: 0, assignmentId: 0, deliveryId: 0, quantity: 1, filled: 0, empty: 0, reference: '', observation: '', movementType: 'ASIGNACION', movementId: 0, reason: '' }); this.operationPartners.set([]); this.crateAssignments.set([]); }
  private resetCondition(): void { this.conditionForm.controls.modalityId.enable({ emitEvent: false }); this.conditionForm.reset({ modalityId: 0, name: '', description: '', minWeight: 0, maxWeight: 0 }); }
  private resetPrice(): void { this.priceForm.enable({ emitEvent: false }); this.priceForm.reset({ campaignId: 0, operationId: 0, varietyId: 0, conditionId: 0, price: 0, currency: 'PEN', unit: 'KG', validFrom: this.nowDateTime() }); }
  private saved(message: string): void { this.toast.success(message); this.closeEditor(); this.load(); this.loadReferences(); }
  private editorError(error: unknown): void { this.toast.error('No se pudo completar la acción', mapOpenApiError(error).message); }
  private runRowAction(key: string, source: Observable<unknown>, message: string): void {
    this.actionKey.set(key);
    source.pipe(finalize(() => this.actionKey.set(null))).subscribe({
      next: () => {
        this.toast.success(message);
        this.load();
        this.loadReferences();
      },
      error: (error: unknown) =>
        this.toast.error('No se pudo completar la acción', mapOpenApiError(error).message),
    });
  }
  private number(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  private string(value: unknown): string { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
  private record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
  private label(key: string): string { return key.replace(/Id$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase()); }
  private dateValue(value: unknown): string { return this.string(value).slice(0, 10); }
  private dateTimeValue(value: unknown): string { const text = this.string(value); if (!text) return ''; const date = new Date(text); if (Number.isNaN(date.getTime())) return text.slice(0, 16); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
}
