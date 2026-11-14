import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { DataTableComponent } from '../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { ListViewSwitchComponent } from '../../../shared/data-display/list-view-switch/list-view-switch';
import { AccessStore } from '../../../core/access/access.store';
import { faArrowLeft, faBan, faBolt, faBoxesStacked, faCalendarDays, faCoins, faEye, faFlagCheckered, faPen, faPlus, faRotate, faRotateLeft, faScaleBalanced, faTrashCan, faUsers, faXmark } from '@fortawesome/free-solid-svg-icons';
import { catchError, concat, debounceTime, distinctUntilChanged, finalize, forkJoin, from, map, mergeMap, of, Subject, switchMap, toArray, Observable } from 'rxjs';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../shared/models/page-result.model';
import { CommercialApiService, CommercialReferences } from '../shared/commercial-api.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { PermissionService } from '../../../core/access/permission.service';
import { ApappssBuyersApiService, ApappssBuyer, ApappssContext } from '../compradores/apappss-buyers-api.service';
import { CampaignCrateOrigin, CampaignPlanDetail, CampaignPlanParticipant, CampaignPlanningApiService, EligiblePartner } from './campaign-planning-api.service';
import { CampaignSaleProcessApiService, SaleGrade, SaleProcessDetail, CalibreTipo, CampaignIndicators, SaleParticipant } from './campaign-sale-process-api.service';
import { CampaignSalePartnerDetailPage } from './campaign-sale-partner-detail';
import { CampaignSanctionsPanel } from './campaign-sanctions-panel';
import { CampaignSanctionsApiService, SaleSanctionTariff } from './campaign-sanctions-api.service';
import { closeOpenCalibreRanges, calibreRangeText } from './campaign-calibre-ranges';

type Editor = 'create' | 'edit' | 'members' | 'crates' | 'history';
interface CampaignSanctionEditorRow { id:number; nombre:string; codigo:string; enabled:boolean; visible:boolean; descuento:string; tarifaId:number|null; socios:number; }
interface EditableGrade { calibreId: number | null; version: number | null; variedadPaltaId: number; calibre: CalibreTipo; gramosDesde: number; gramosHasta: number | null; precioKg: number; }
const EMPTY_REFS: CommercialReferences = { associations: [], buyers: [], producers: [], properties: [], campaigns: [], operations: [], conditions: [], varieties: [], salesModalities: [], zones: [] };
const DEFAULT_BUYER_DOCUMENT_TYPES: readonly { value: string; label: string }[] = [
  { value: 'DNI', label: 'DNI' }, { value: 'RUC', label: 'RUC' },
  { value: 'CE', label: 'Carné de extranjería' }, { value: 'PASAPORTE', label: 'Pasaporte' },
];

function referencesVarieties(options: readonly { value: number; label: string }[], prices: readonly Record<string, unknown>[]) {
  const used = new Set(prices.map(row => Number(row['variedadPaltaId'])));
  return options.filter(option => !used.has(option.value));
}

@Component({
  selector: 'app-campaigns-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FaIconComponent, PermissionDirective, CampaignSalePartnerDetailPage, CampaignSanctionsPanel,
    PageHeaderComponent, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent,
    DataTableComponent, RecordCardComponent, ListViewSwitchComponent,
    PaginatorComponent, ActionConfirmDialogComponent],
  templateUrl: './campaigns-page.html',
  styleUrl: './campaigns-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignsPage implements OnInit {
  @ViewChild('editorDialog', { static: true }) private editorDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly api = inject(CommercialApiService);
  private readonly uot = inject(UotContextStore);
  private readonly buyersApi = inject(ApappssBuyersApiService);
  readonly permission = inject(PermissionService);
  private readonly access = inject(AccessStore);
  private buyerDocumentRequest = 0;
  private readonly destroyRef = inject(DestroyRef);
  private readonly buyerTerms = new Subject<string>();
  private readonly planning = inject(CampaignPlanningApiService);
  private readonly saleApi = inject(CampaignSaleProcessApiService);
  private readonly sanctionsApi = inject(CampaignSanctionsApiService);
  private readonly toast = inject(ToastService);

  readonly activateIcon = faBolt;
  readonly finishIcon = faFlagCheckered;
  readonly cancelIcon = faBan;
  readonly calendarIcon = faCalendarDays;
  readonly closeIcon = faXmark;
  readonly removeIcon = faTrashCan;
  readonly plusIcon = faPlus;
  readonly eyeIcon = faEye;
  readonly editIcon = faPen;
  readonly reloadIcon = faRotate;
  readonly backIcon = faArrowLeft;
  readonly usersIcon = faUsers;
  readonly cratesIcon = faBoxesStacked;
  readonly returnIcon = faRotateLeft;
  readonly pricesIcon = faCoins;
  readonly scaleIcon = faScaleBalanced;
  readonly campaignId = signal<number | null>(null);
  readonly listView = signal<'table' | 'cards'>('cards');
  readonly memberView = signal<'table' | 'cards'>('table');
  readonly participantsView = signal<'table' | 'cards'>('table');
  readonly participantsSearch = signal('');
  readonly activeTab = signal<'general' | 'participantes' | 'venta'>('general');
  readonly saleSearch = signal('');
  readonly saleStatus = signal<'todos' | 'pendientes' | 'completos'>('todos');
  readonly selectedSalePartnerId = signal<number | null>(null);
  readonly indicatorStart = signal('');
  readonly indicatorEnd = signal('');
  readonly indicatorVariety = signal<number | null>(null);
  private indicatorRequest = 0;
  readonly indicators = signal<CampaignIndicators | null>(null);
  readonly indicatorsLoading = signal(false);
  readonly indicatorsError = signal<string | null>(null);
  readonly editingCampaignId = signal<number | null>(null);
  readonly listGrades = signal<Record<number, SaleGrade[]>>({});
  private initialCampaignEdit: string | null = null;
  private initialGradesEdit: string | null = null;
  readonly editGrades = signal<EditableGrade[]>([]);
  readonly editorSanctions = signal<CampaignSanctionEditorRow[]>([]);
  readonly sanctionSearch = signal('');
  readonly selectedSanctionId = signal<number | null>(null);
  readonly selectedEditorSanctions = computed(() => this.editorSanctions().filter(row => row.visible));
  readonly availableEditorSanctions = computed(() => {
    const term = this.sanctionSearch().trim().toLocaleLowerCase('es');
    return this.editorSanctions().filter(row => !row.visible && !row.enabled && row.socios === 0 &&
      (!term || `${row.nombre} ${row.codigo}`.toLocaleLowerCase('es').includes(term)));
  });
  readonly sanctionsLoading = signal(false);
  readonly sanctionsError = signal<string | null>(null);
  private initialSanctionsEdit: string | null = null;
  private initialQuotaEdit: string | null = null;
  private initialCratesCount: number | null = null;
  private initialPriceValue: number | null = null;
  readonly listColumns: readonly DataTableColumn<Record<string, unknown>>[] = [
    { key: 'nombre', label: 'Campaña' }, { key: 'fechaInicio', label: 'Inicio', format: v => this.date(v) },
    { key: 'fechaFin', label: 'Fin', format: v => this.date(v) },
    { key: 'calibres', label: 'Variedades y calibres' },
    { key: 'estadoProceso', label: 'Estado' }, { key: 'acciones', label: 'Acciones', align: 'right' },
  ];
  readonly list = signal<PageResult<Record<string, unknown>>>(emptyPageResult(12));
  readonly loading = signal(false);
  readonly refsLoading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly references = signal<CommercialReferences>(EMPTY_REFS);
  readonly apappss = signal<ApappssContext | null>(null);
  readonly buyers = signal<ApappssBuyer[]>([]);
  readonly buyerSearch = signal("");
  readonly buyerLoading = signal(false);
  readonly buyerDocumentTypes = signal<readonly { value: string; label: string }[]>(DEFAULT_BUYER_DOCUMENT_TYPES);
  readonly buyerDocumentType = signal('DNI');
  readonly buyerDocumentNumber = signal('');
  readonly buyerDocumentLoading = signal(false);
  readonly buyerDocumentMatches = signal<ApappssBuyer[]>([]);
  readonly campaignBuyer = signal<ApappssBuyer | null>(null);
  readonly buyerDocumentMessage = signal<string | null>(null);
  readonly buyerDocumentNotFound = signal(false);
  readonly campaignSearch = signal('');
  readonly campaignState = signal('');
  readonly filteredCampaigns = computed(() => this.list().items.filter(row => {
    const query = this.campaignSearch().trim().toLocaleLowerCase('es');
    const state = this.campaignState();
    return (!state || this.effectiveStatus(row) === state)
      && (!query || [row['nombre'], row['codigo']].some(v => String(v ?? '').toLocaleLowerCase('es').includes(query)));
  }));
  readonly campaign = signal<Record<string, unknown> | null>(null);
  readonly plan = signal<CampaignPlanDetail | null>(null);
  readonly prices = signal<readonly Record<string, unknown>[]>([]);
  readonly saleConfig = signal<SaleProcessDetail | null>(null);
  readonly grades = computed(() => this.saleConfig()?.calibres ?? []);
  readonly saleParticipants = computed(() => (this.saleConfig()?.socios ?? []).filter(s => {
    const query = this.saleSearch().trim().toLocaleLowerCase('es');
    const match = !query || `${s.socioNombre} ${s.documento}`.toLocaleLowerCase('es').includes(query);
    const filter = this.saleStatus();
    return match && (filter === 'todos' || filter === 'completos' && s.devueltas >= s.asignadas
      || filter === 'pendientes' && s.devueltas < s.asignadas);
  }));
  readonly selectedSalePartner = computed(() => (this.saleConfig()?.socios ?? [])
    .find(s => s.participacionId === this.selectedSalePartnerId()) ?? null);
  readonly dailyMax = computed(() => Math.max(1, ...(this.indicators()?.porDia ?? []).map(p => Number(p.pesoNetoKg))));
  readonly varietyMax = computed(() => Math.max(1, ...(this.indicators()?.porVariedad ?? []).map(p => Number(p.pesoNetoKg))));
  readonly totalAssigned = computed(() => (this.saleConfig()?.socios ?? []).reduce((total,s) => total+s.asignadas,0));
  readonly totalReceived = computed(() => (this.saleConfig()?.socios ?? []).reduce((total,s) => total+s.devueltas,0));
  readonly totalNet = computed(() => (this.saleConfig()?.socios ?? []).reduce((total,s) => total+Number(s.pesoNetoKg),0));
  readonly filteredParticipants = computed(() => (this.plan()?.participantes ?? []).filter(p =>
    `${p.socioNombre} ${p.documento}`.toLocaleLowerCase('es').includes(this.participantsSearch().trim().toLocaleLowerCase('es'))));
  readonly discountInitial = signal<number | null>(null);
  readonly selectedParticipant = signal<number | null>(null);
  readonly editor = signal<Editor>('create');
  readonly eligible = signal<EligiblePartner[]>([]);
  readonly selection = signal<readonly number[]>([]);
  readonly memberSearch = signal('');
  readonly priceEditId = signal<number | null>(null);
  readonly history = signal<readonly Record<string, unknown>[]>([]);
  readonly editingPrice = signal(false);
  readonly cartPartners = computed(() => this.eligible().filter(person => this.selection().includes(person.socioAsociacionId)));
  readonly priceCandidates = computed(() => referencesVarieties(this.references().varieties, this.prices()));
  readonly chosenPartner = computed(() => (this.plan()?.participantes ?? []).find(p => p.participacionId === this.selectedParticipant()) ?? null);
  readonly filteredEligible = computed(() => this.eligible().filter(p => `${p.nombre} ${p.numeroDocumento}`.toLocaleLowerCase().includes(this.memberSearch().toLocaleLowerCase())));
  readonly availableQuota = computed(() => Math.max(0, (this.plan()?.cupoJabas ?? 0) - (this.plan()?.jabasComprometidas ?? 0) - (this.plan()?.jabasOperativo ?? 0)));
  readonly hasQuota = computed(() => (this.plan()?.cupoJabas ?? 0) > 0);
  readonly withinCampaignDates = computed(() => {
    const start = this.date(this.campaign()?.['fechaInicio']);
    const end = this.date(this.campaign()?.['fechaFin']);
    const today = this.today();
    return !!start && !!end && start <= today && today <= end;
  });
  readonly canManageParticipants = computed(() => this.canEdit() && this.withinCampaignDates());
  readonly canAddMembers = computed(() => this.canManageParticipants() && this.permission.has('JABAS_CREAR'));
  readonly canEdit = computed(() => (this.effectiveStatus(this.campaign()) === 'PLANIFICACION' && this.date(this.campaign()?.['fechaFin']) >= this.today()) || (this.effectiveStatus(this.campaign()) === 'ACTIVA' && this.withinCampaignDates()));
  readonly canChangeCrateOrigin = computed(() => this.str(this.campaign()?.['estadoProceso']) === 'PLANIFICACION'
    && (this.plan()?.jabasOperativo ?? 0) === 0
    && !(this.plan()?.participantes ?? []).some(p => p.estadoJabas === 'ENTREGADA' || p.estadoJabas === 'DEVUELTA'
      || p.estadoJabas === 'PENDIENTE_DEVOLUCION' || (p.cantidadAjustePendiente ?? 0) > 0));

  readonly form = this.fb.nonNullable.group({
    associationId: [0, [Validators.required, Validators.min(1)]],
    buyerId: [0, [Validators.required, Validators.min(1)]],
    modalityId: [0, [Validators.required, Validators.min(1)]],
    crateOrigin: ['UOT' as CampaignCrateOrigin, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(180)]],
    start: ['', Validators.required],
    end: ['', Validators.required],
    observation: ['', Validators.maxLength(400)],
    discount: [null as number | null, [Validators.min(0), Validators.max(9.999)]],
    quota: [0, Validators.min(0)],
    lines: this.fb.array([this.priceLine()]),
  });
  readonly quotaForm = this.fb.nonNullable.group({ count: [1, [Validators.required, Validators.min(1), Validators.max(100000)]], tare: [0, [Validators.min(0), Validators.max(9.999)]] });
  readonly cratesForm = this.fb.nonNullable.group({ count: [1, [Validators.required, Validators.min(0), Validators.max(100000)]],
    comment: ['', Validators.maxLength(500)] });
  readonly priceForm = this.fb.nonNullable.group({ variety: [0, [Validators.min(1)]], price: [0, [Validators.required, Validators.min(.0001)]] });

  get lines() { return this.form.controls.lines; }
  priceLine() { return this.fb.nonNullable.group({
    variety: [0, [Validators.min(1)]],
    grade: ['PRIMERA' as CalibreTipo, [Validators.required]],
    gramsFrom: [180, [Validators.required, Validators.min(0)]],
    gramsTo: [null as number | null, [Validators.min(0)]],
    price: [0, [Validators.required, Validators.min(.0001)]],
  }); }
  addLine() { if (this.lines.length < 20) this.lines.push(this.priceLine()); }
  removeLine(index: number) { if (this.lines.length > 1) this.lines.removeAt(index); }

  ngOnInit(): void {
    this.refsLoading.set(true);
    this.api.campaignReferences().pipe(finalize(() => this.refsLoading.set(false))).subscribe({
      next: (value) => this.references.set(value),
      error: (err: unknown) => this.toast.error('No se pudieron cargar los catálogos', mapOpenApiError(err).message),
    });
    this.buyerTerms.pipe(
      debounceTime(250), distinctUntilChanged(),
      switchMap(term => {
        const selectedUot = this.uot.selectedId();
        if (!selectedUot) return of([] as ApappssBuyer[]);
        this.buyerLoading.set(true);
        return this.buyersApi.list(selectedUot, 1, 100, term, '').pipe(
          switchMap(page => of(page.items ?? [])),
          catchError((err: unknown) => {
            this.toast.warning('No se pudieron consultar compradores', mapOpenApiError(err).message);
            return of([] as ApappssBuyer[]);
          }),
          finalize(() => this.buyerLoading.set(false)),
        );
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe(rows => this.buyers.set(rows));
    const uotId = this.uot.selectedId();
    if (uotId) {
      this.buyersApi.context(uotId).subscribe({
        next: contexto => this.apappss.set(contexto),
        error: err => this.toast.warning(mapOpenApiError(err).message),
      });
      this.searchBuyers('');
    }
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.campaignId.set(Number.isSafeInteger(id) && id > 0 ? id : null);
      this.selectedParticipant.set(null);
      ++this.indicatorRequest;
      this.indicators.set(null);
      this.indicatorStart.set('');
      this.indicatorEnd.set('');
      this.indicatorVariety.set(null);
      const tab = this.route.snapshot.queryParamMap.get('tab');
      this.activeTab.set(tab === 'venta' ? 'venta' : tab === 'participantes' ? 'participantes' : 'general');
      const partner = Number(this.route.snapshot.queryParamMap.get('socio'));
      this.selectedSalePartnerId.set(Number.isSafeInteger(partner) && partner > 0 ? partner : null);
      this.participantsSearch.set('');
      this.editingPrice.set(false);
      this.load();
    });
  }

  searchBuyers(term: string): void {
    if (term !== this.buyerSearch()) this.form.controls.buyerId.setValue(0);
    this.buyerSearch.set(term);
    this.buyerTerms.next(term.trim());
  }
  buyerDocumentMaxLength(): number {
    const type = this.buyerDocumentType();
    return type === 'DNI' ? 8 : type === 'RUC' ? 11 : type === 'CE' ? 20 : 30;
  }
  buyerDocumentInputMode(): 'numeric' | 'text' {
    return ['DNI', 'RUC'].includes(this.buyerDocumentType()) ? 'numeric' : 'text';
  }
  buyerDocumentHint(): string {
    const type = this.buyerDocumentType();
    return type === 'DNI' ? '8 dígitos' : type === 'RUC' ? '11 dígitos' : 'Ingrese número de documento';
  }
  validBuyerDocument(): boolean {
    const type = this.buyerDocumentType(), number = this.buyerDocumentNumber();
    if (type === 'DNI') return /^\d{8}$/.test(number);
    if (type === 'RUC') return /^\d{11}$/.test(number);
    if (type === 'CE') return /^[A-Z0-9]{6,20}$/.test(number);
    return /^[A-Z0-9]{5,30}$/.test(number);
  }
  private clearCampaignBuyer(): void {
    ++this.buyerDocumentRequest;
    this.buyerDocumentLoading.set(false);
    this.buyerDocumentMessage.set(null);
    this.buyerDocumentNotFound.set(false);
    this.buyerDocumentMatches.set([]);
    this.campaignBuyer.set(null);
    this.form.controls.buyerId.setValue(0);
  }
  changeBuyerDocumentType(type: string): void {
    if (!this.buyerDocumentTypes().some(option => option.value === type)) return;
    this.clearCampaignBuyer();
    this.buyerDocumentType.set(type);
    this.buyerDocumentNumber.set('');
  }
  changeBuyerDocumentNumber(input: HTMLInputElement): void {
    const type = this.buyerDocumentType();
    const value = input.value.toUpperCase().replace(type === 'DNI' || type === 'RUC' ? /\D/g : /[^A-Z0-9]/g, '')
      .slice(0, this.buyerDocumentMaxLength());
    input.value = value;
    if (value !== this.buyerDocumentNumber()) {
      this.clearCampaignBuyer();
      this.buyerDocumentNumber.set(value);
    }
  }
  selectCampaignBuyer(value: number | string): void {
    const id = Number(value);
    const buyer = this.buyerDocumentMatches().find(row => row.compradorId === id) ?? null;
    this.campaignBuyer.set(buyer);
    this.form.controls.buyerId.setValue(buyer?.compradorId ?? 0);
    if (buyer) this.buyerDocumentMessage.set(null);
  }
  lookupCampaignBuyer(): void {
    if (this.buyerDocumentLoading() || this.busy()) return;
    if (!this.validBuyerDocument()) {
      this.buyerDocumentMessage.set('Ingrese un número de documento válido.'); return;
    }
    const uotId = this.uot.selectedId();
    if (!uotId) {
      this.buyerDocumentMessage.set('Seleccione una UOT para buscar compradores.'); return;
    }
    this.clearCampaignBuyer();
    const type = this.buyerDocumentType(), number = this.buyerDocumentNumber();
    const request = ++this.buyerDocumentRequest;
    this.buyerDocumentLoading.set(true);
    // Reutiliza el listado existente: no requiere permiso de CREAR compradores
    // ni confunde compradorId con personaId o empresaId.
    this.buyersApi.list(uotId, 1, 100, number, '')
      .pipe(finalize(() => { if (request === this.buyerDocumentRequest) this.buyerDocumentLoading.set(false); }))
      .subscribe({
        next: page => {
          if (request !== this.buyerDocumentRequest || this.editor() !== 'create') return;
          const matches = (page.items ?? []).filter(buyer =>
            buyer.tipoDocumento.toUpperCase() === type && buyer.documento.toUpperCase().trim() === number);
          this.buyerDocumentMatches.set(matches);
          if (matches.length === 1) {
            this.selectCampaignBuyer(matches[0].compradorId);
          } else if (matches.length > 1) {
            this.buyerDocumentMessage.set('Se encontraron varios registros. Seleccione el comprador correcto.');
          } else {
            this.buyerDocumentNotFound.set(true);
            this.buyerDocumentMessage.set('No se encontró un comprador registrado con ese documento.');
          }
        },
        error: err => {
          if (request === this.buyerDocumentRequest) {
            this.buyerDocumentMessage.set(this.errorOf(err));
          }
        },
      });
  }
  private prepareBuyerDocument(): void {
    this.clearCampaignBuyer();
    this.buyerDocumentType.set('DNI');
    this.buyerDocumentNumber.set('');
    this.buyerDocumentTypes.set(DEFAULT_BUYER_DOCUMENT_TYPES);
    const uotId = this.uot.selectedId();
    // Igual que el registro de compradores: catálogo oficial cuando el rol lo permite.
    if (!uotId || !this.permission.has('APAPPSS_COMPRADORES_CREAR')) return;
    this.buyersApi.documentTypes(uotId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: types => {
        if (this.editor() !== 'create' || !types.length) return;
        const options = types.map(type => ({ value: type.codigo, label: type.nombre }));
        this.buyerDocumentTypes.set(options);
        if (!options.some(option => option.value === this.buyerDocumentType())) {
          this.changeBuyerDocumentType(options[0].value);
        }
      },
      error: () => { /* Se conserva el catálogo usado por la pantalla Compradores. */ },
    });
  }
  buyerListed(id: number): boolean { return this.buyers().some(b => b.compradorId === id); }
  num(value: unknown): number { return Number(value) || 0; }
  str(value: unknown): string { return value == null ? '' : String(value); }
  date(value: unknown): string { return this.str(value).substring(0, 10); }
  today(): string {
    // Date local evita la diferencia UTC al comparar con el calendario del usuario.
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  title(): string { return this.str(this.campaign()?.['nombre']) || 'Campañas de venta'; }
  label(options: readonly { value: number; label: string }[], id: unknown): string { return options.find(x => x.value === this.num(id))?.label ?? `#${this.num(id)}`; }
  errorOf(err: unknown): string { return mapOpenApiError(err).message; }
  findId(row: Record<string, unknown>): number { return this.num(row['campaniaVentaId']); }
  readonly gradeSummary = (row: Record<string, unknown>): SaleGrade[] => this.listGrades()[this.findId(row)] ?? [];
  /** Los calibres se cargan por página y se agrupan por campaña, no por cada tarjeta. */
  private loadListGrades(rows: readonly Record<string, unknown>[]): void {
    if (!this.permission.has('JABAS_LISTAR') || !this.permission.has('CAMPANIAS_VER') || !rows.length) {
      this.listGrades.set({}); return;
    }
    from(rows.map(row => this.findId(row)).filter(id => id > 0)).pipe(
      mergeMap(id => this.saleApi.detail(id).pipe(
        map(value => ({ id, grades: value.calibres ?? [] })),
        catchError(() => of({ id, grades: [] as SaleGrade[] }))), 3),
      toArray(), takeUntilDestroyed(this.destroyRef),
    ).subscribe(entries => {
      const byId: Record<number, SaleGrade[]> = {};
      for (const entry of entries) byId[entry.id] = entry.grades;
      this.listGrades.set(byId);
    });
  }
  varietiesSummary(row: Record<string, unknown>): string {
    const grades = this.gradeSummary(row);
    if (!grades.length) return 'Sin calibres registrados';
    return grades.map(g => `${this.label(this.references().varieties,g.variedadPaltaId)} · ${g.calibre.toLowerCase()}`)
      .filter((value,index,all) => all.indexOf(value)===index).join(' · ');
  }

  load(page = this.list().page): void {
    const id = this.campaignId();
    this.loading.set(true); this.error.set(null);
    if (id) {
      forkJoin({ detail: this.api.detail('campaigns', id), plan: this.planning.plan(id), sale: this.saleApi.detail(id).pipe(catchError(() => of(null))) })
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: ({ detail, plan, sale }) => {
            this.applyDetail(detail, plan, sale);
            if (this.activeTab() === 'general') this.loadIndicators();
            if (this.route.snapshot.queryParamMap.get('accion') === 'editar' &&
                this.permission.has('CAMPANIAS_EDITAR') && this.canEdit()) {
              this.open('edit');
              void this.router.navigate([], { relativeTo: this.route, queryParams: { accion: null },
                queryParamsHandling: 'merge', replaceUrl: true });
            }
          },
          error: (err: unknown) => this.error.set(this.errorOf(err)),
        });
    } else {
      this.api.list('campaigns', page, this.list().size).pipe(finalize(() => this.loading.set(false)))
        .subscribe({ next: (result) => { this.list.set(result); this.loadListGrades(result.items); }, error: (err: unknown) => this.error.set(this.errorOf(err)) });
    }
  }

  private applyDetail(detail: Record<string, unknown>, plan: CampaignPlanDetail, sale: SaleProcessDetail | null): void {
    this.campaign.set((detail['campania'] as Record<string, unknown> | null) ?? detail);
    this.prices.set(Array.isArray(detail['precios']) ? detail['precios'] as Record<string, unknown>[] : []);
    this.plan.set(plan);
    this.saleConfig.set(sale);
    if (this.selectedSalePartnerId() && !sale?.socios.some(p => p.participacionId === this.selectedSalePartnerId())) {
      this.selectedSalePartnerId.set(null);
    }
    if (this.selectedParticipant() && !plan.participantes.some(p => p.participacionId === this.selectedParticipant())) {
      this.closePartner();
    }
  }
  private refreshDetail(): void {
    const id = this.campaignId();
    if (!id) return;
    forkJoin({ detail: this.api.detail('campaigns', id), plan: this.planning.plan(id), sale: this.saleApi.detail(id).pipe(catchError(() => of(null))) }).subscribe({
      next: ({ detail, plan, sale }) => this.applyDetail(detail, plan, sale),
      error: err => this.toast.error('No se pudo actualizar el detalle', this.errorOf(err)),
    });
  }
  editFromList(row: Record<string, unknown>): void {
    const id = this.findId(row);
    if (!id || this.busy() || !this.permission.has('CAMPANIAS_EDITAR')) return;
    this.busy.set(true);
    forkJoin({
      detail: this.api.detail('campaigns', id),
      plan: this.planning.plan(id),
      sale: this.saleApi.detail(id).pipe(catchError(() => of(null))),
    }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: ({detail,plan,sale}) => {
        this.editingCampaignId.set(id);
        this.applyDetail(detail, plan, sale);
        if (this.canEdit()) this.open('edit');
        else this.toast.warning('Esta campaña ya no permite modificaciones.');
      },
      error: err => this.toast.error('No se pudo abrir la campaña',this.errorOf(err)),
    });
  }
  private targetCampaignId(): number | null { return this.campaignId() ?? this.editingCampaignId(); }
  private sanctionSnapshot(rows: readonly CampaignSanctionEditorRow[]): string {
    return JSON.stringify(rows.filter(row => row.enabled)
      .map(row => ({ sancionId:row.id, descuentoKg:Number(row.descuento) }))
      .sort((a,b)=>a.sancionId-b.sancionId));
  }
  sanctionsChanged(): boolean {
    return this.initialSanctionsEdit !== null &&
      this.sanctionSnapshot(this.editorSanctions()) !== this.initialSanctionsEdit;
  }
  toggleEditorSanction(id: number, enabled: boolean): void {
    this.editorSanctions.update(rows => rows.map(row => row.id===id && !row.socios
      ? { ...row, enabled, visible:true } : row));
  }
  addEditorSanction(): void {
    const id = this.selectedSanctionId();
    if (id === null || this.busy() || !this.permission.has('SANCIONES_CONFIGURAR')) return;
    if (!this.editorSanctions().some(row => row.id === id && !row.enabled && row.socios === 0)) return;
    this.toggleEditorSanction(id, true);
    this.selectedSanctionId.set(null);
    this.sanctionSearch.set('');
  }
  changeEditorSanctionAmount(id: number, value: string): void {
    this.editorSanctions.update(rows => rows.map(row => row.id===id && !row.socios
      ? { ...row, descuento:value } : row));
  }
  private selectedSanctionTariffs(): { sancionId:number; descuentoKg:number }[] {
    return this.editorSanctions().filter(row => row.enabled)
      .map(row => ({ sancionId:row.id, descuentoKg:Number(row.descuento) }));
  }
  private sanctionsValid(): boolean {
    if (this.sanctionsLoading() || this.sanctionsError()) return false;
    const selected=this.editorSanctions().filter(row => row.enabled);
    const grades=this.editor()==='edit' ? this.normalizedEditGrades() : this.normalizedCreateGrades();
    const prices=grades.map(grade => Number(grade.precioKg)).filter(price => Number.isFinite(price) && price>0);
    if (!selected.length) return true;
    if (!prices.length) return false;
    const minPrice=Math.min(...prices);
    return selected.every(row => /^\d+(?:\.\d{1,4})?$/.test(row.descuento) &&
      Number(row.descuento)>0 && Number(row.descuento)<minPrice);
  }
  private loadEditorSanctions(kind: 'create'|'edit'): void {
    if (!this.permission.has('SANCIONES_LISTAR') || !this.permission.has('SANCIONES_CONFIGURAR')) {
      this.editorSanctions.set([]);
      this.initialSanctionsEdit = this.sanctionSnapshot([]);
      return;
    }
    const id=this.targetCampaignId();
    this.sanctionsLoading.set(true);
    const rates$: Observable<{items:SaleSanctionTariff[];disponibles:{id:number;nombre:string}[]}|null> =
      kind==='edit' && id ? this.sanctionsApi.rates(id) : of(null);
    forkJoin({catalog:this.sanctionsApi.catalog(),rates:rates$})
      .pipe(finalize(() => this.sanctionsLoading.set(false))).subscribe({
      next: ({catalog,rates}) => {
        if (this.editor()!==kind) return;
        const configured=new Map<number,SaleSanctionTariff>((rates?.items ?? [])
          .map((rate:SaleSanctionTariff) => [rate.sancionId,rate]));
        const rows: CampaignSanctionEditorRow[] = (catalog.items ?? [])
          .filter(item => item.activo || configured.has(item.id))
          .map(item => {
            const existing=configured.get(item.id);
            return {id:item.id,nombre:item.nombre,codigo:item.codigo,
              enabled:existing?.activo ?? false, visible:!!existing?.activo || (existing?.socios ?? 0)>0,
              descuento:existing ? String(existing.descuentoKg) : '',
              tarifaId:existing?.tarifaId ?? null,socios:existing?.socios ?? 0};
          });
        this.editorSanctions.set(rows);
        this.initialSanctionsEdit=this.sanctionSnapshot(rows);
      },
      error: err => this.sanctionsError.set(this.errorOf(err)),
    });
  }
  open(kind: Editor): void {
    this.editor.set(kind);
    this.initialCampaignEdit = null;
    this.initialQuotaEdit = null;
    this.initialGradesEdit = null;
    this.initialCratesCount = null;
    this.initialSanctionsEdit = null;
    this.editorSanctions.set([]);
    this.sanctionSearch.set('');
    this.selectedSanctionId.set(null);
    this.sanctionsError.set(null);
    if (kind === 'create') {
      this.form.controls.buyerId.enable({ emitEvent:false });
      this.form.controls.crateOrigin.enable({ emitEvent:false });
      this.prepareBuyerDocument();
      this.searchBuyers('');
      this.form.reset({ associationId: this.apappss()?.asociacionId ?? 0, buyerId: 0, modalityId: 0,
        name: '', start: this.today(), end: this.today(), observation: '', discount: null, quota: 0, crateOrigin: 'UOT' });
      this.lines.clear(); this.addLine();
      this.loadEditorSanctions('create');
    } else if (kind === 'edit') {
      this.editingPrice.set(false);
      const c = this.campaign();
      this.searchBuyers('');
      this.form.patchValue({ crateOrigin: this.plan()?.origenJabas ?? 'UOT', modalityId: this.plan()?.modalidadVentaId ?? 0, buyerId: this.plan()?.compradorId ?? 0, name: this.str(c?.['nombre']), start: this.date(c?.['fechaInicio']), end: this.date(c?.['fechaFin']), observation: this.str(c?.['observacion']), discount: this.plan()?.taraKg ?? this.saleConfig()?.descuentoJabaKg ?? null });
      // Angular maneja el atributo disabled a través del FormControl, sin advertencias.
      if (c?.['estadoProceso'] === 'ACTIVA') this.form.controls.buyerId.disable({ emitEvent:false });
      else this.form.controls.buyerId.enable({ emitEvent:false });
      if (this.canChangeCrateOrigin()) this.form.controls.crateOrigin.enable({ emitEvent:false });
      else this.form.controls.crateOrigin.disable({ emitEvent:false });
      this.quotaForm.setValue({ count: this.plan()?.cupoJabas ?? 0, tare: this.plan()?.taraKg ?? 0 });
      this.initialQuotaEdit = JSON.stringify(this.quotaForm.getRawValue());
      this.editGrades.set(this.grades().map(g => ({ calibreId:g.calibreId, version:g.version, variedadPaltaId:g.variedadPaltaId,
        calibre:g.calibre, gramosDesde:Number(g.gramosDesde), gramosHasta:g.gramosHasta ?? null, precioKg:Number(g.precioKg) })));
      this.initialGradesEdit = JSON.stringify(this.editGrades());
      this.initialCampaignEdit = this.snapshotCampaignEdit();
      this.loadEditorSanctions('edit');
    } else if (kind === 'crates') {
      const person = this.chosenPartner();
      const delivered = person?.estadoJabas === 'ENTREGADA' || person?.estadoJabas === 'PENDIENTE_DEVOLUCION'
        || (person?.estadoJabas === 'PENDIENTE_RECOJO' && (person?.cantidadAjustePendiente ?? 0) > 0);
      this.cratesForm.controls.count.setValidators([Validators.required, Validators.min(delivered ? 0 : 1), Validators.max(100000)]);
      this.cratesForm.controls.count.setValue(person?.cantidadObjetivo ?? person?.cantidadJabas ?? 0);
      this.cratesForm.controls.count.updateValueAndValidity();
      this.cratesForm.controls.comment.setValue('');
      this.initialCratesCount = this.cratesForm.controls.count.value;
    }
    if (!this.editorDialog.nativeElement.open) this.editorDialog.nativeElement.showModal();
  }
  private snapshotCampaignEdit(): string {
    const v = this.form.getRawValue();
    return JSON.stringify({ compradorId: Number(v.buyerId), nombre: v.name,
      fechaInicio: v.start, fechaFin: v.end, observacion: v.observation, descuentoJabaKg: v.discount, origenJabas: v.crateOrigin });
  }
  private campaignFieldsChanged(): boolean {
    return this.initialCampaignEdit !== null && this.snapshotCampaignEdit() !== this.initialCampaignEdit;
  }
  normalizedCreateGrades() {
    return closeOpenCalibreRanges(this.lines.getRawValue().map(row => ({
      variedadPaltaId: Number(row.variety), calibre: row.grade,
      gramosDesde: Number(row.gramsFrom), gramosHasta: row.gramsTo == null ? null : Number(row.gramsTo),
      precioKg: Number(row.price),
    })));
  }
  normalizedEditGrades(): EditableGrade[] { return closeOpenCalibreRanges(this.editGrades()); }
  rangeText(grade: { gramosDesde:number; gramosHasta:number|null }): string {
    return calibreRangeText(grade.gramosDesde, grade.gramosHasta);
  }
  createRangeText(index: number): string {
    const row = this.normalizedCreateGrades()[index];
    return row ? this.rangeText(row) : '';
  }
  editRangeText(index: number): string {
    const row = this.normalizedEditGrades()[index];
    return row ? this.rangeText(row) : '';
  }
  gradeLabel(grade: EditableGrade): string {
    const variedad = this.label(this.references().varieties, grade.variedadPaltaId);
    return `${variedad} · ${grade.calibre.toLowerCase()} (${this.rangeText(grade)})`;
  }
  gradeEditChanged(): boolean {
    return this.initialGradesEdit !== null && JSON.stringify(this.editGrades()) !== this.initialGradesEdit;
  }
  campaignEditChanged(): boolean {
    return this.campaignFieldsChanged() || this.quotaEditChanged() || this.gradeEditChanged() || this.sanctionsChanged();
  }
  addEditGrade(): void {
    if (this.editGrades().length >= 20 || !this.permission.has('PRECIOS_CREAR')) return;
    this.editGrades.update(rows => [...rows, { calibreId:null, version:null, variedadPaltaId:0, calibre:'PRIMERA',
      gramosDesde:180, gramosHasta:null, precioKg:0 }]);
  }
  updateEditGrade(index: number, field: keyof EditableGrade, value: number | string | null): void {
    this.editGrades.update(rows => rows.map((r, i) => i === index ? { ...r, [field]:value } as EditableGrade : r));
  }
  removeEditGrade(index: number): void {
    if (this.editGrades().length < 2) return;
    const grade = this.editGrades()[index];
    if (grade?.calibreId && !this.permission.has('PRECIOS_RETIRAR')) return;
    this.editGrades.update(rows => rows.filter((_, i) => i !== index));
  }
  gradesEditValid(): boolean {
    const rows = this.normalizedEditGrades();
    if (!rows.length || rows.length > 20) return false;
    if (rows.some(g => !Number.isInteger(g.variedadPaltaId) || g.variedadPaltaId < 1 ||
      !['PRIMERA','SEGUNDA','DESCARTE'].includes(g.calibre) || !Number.isInteger(g.gramosDesde) || g.gramosDesde < 0 ||
      (g.gramosHasta !== null && (!Number.isInteger(g.gramosHasta) || g.gramosHasta < g.gramosDesde)) ||
      !Number.isFinite(g.precioKg) || g.precioKg <= 0)) return false;
    if (rows.some((a, i) => rows.some((b, j) => j > i && a.variedadPaltaId === b.variedadPaltaId &&
      (a.calibre === b.calibre || (a.gramosDesde <= (b.gramosHasta ?? Infinity) && b.gramosDesde <= (a.gramosHasta ?? Infinity)))))) return false;
    const prior = this.grades();
    if (rows.some(g => g.calibreId && prior.some(p => p.calibreId === g.calibreId && p.precioKg !== g.precioKg) && !this.permission.has('PRECIOS_EDITAR'))) return false;
    return true;
  }
  quotaEditChanged(): boolean {
    return this.initialQuotaEdit !== null && JSON.stringify(this.quotaForm.getRawValue()) !== this.initialQuotaEdit;
  }
  cratesEditChanged(): boolean {
    return this.initialCratesCount !== null && this.cratesForm.controls.count.value !== this.initialCratesCount;
  }
  priceEditChanged(): boolean {
    return this.priceEditId() === null || (this.initialPriceValue !== null && Number(this.priceForm.controls.price.value) !== this.initialPriceValue);
  }
  close(): void { if (!this.busy()) { ++this.buyerDocumentRequest; this.editorDialog.nativeElement.close(); if (!this.campaignId()) this.editingCampaignId.set(null); } }
  private done(message: string, refresh = true): void { this.busy.set(false); this.close(); this.toast.success(message); if (refresh) this.campaignId() ? this.refreshDetail() : this.load(); }
  private failed(err: unknown): void { this.toast.error('No se pudo completar la operación', this.errorOf(err)); }

  saveCampaign(): void {
    this.form.markAllAsTouched();
    const edit = this.editor() === 'edit';
    if (this.sanctionsLoading()) return;
    if (!this.sanctionsValid()) {
      this.toast.warning(this.sanctionsError() || 'El descuento de cada sanción debe ser positivo y menor que el precio de todos los calibres.');
      return;
    }
    if (edit) {
      if (!this.campaignEditChanged() || this.form.controls.discount.invalid || !this.gradesEditValid()) return;
      if (this.quotaEditChanged() && this.quotaForm.invalid) return;
      if (this.form.controls.name.invalid || this.form.controls.start.invalid || this.form.controls.end.invalid || this.form.controls.buyerId.invalid) return;
    } else if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (!raw.start || !raw.end || raw.end < this.today() || (!edit && raw.start < this.today())) {
      this.toast.warning('Revise la vigencia de la campaña.'); return;
    }
    if (edit && raw.start < this.today() && raw.start !== this.date(this.campaign()?.['fechaInicio'])) {
      this.toast.warning('No puede cambiar la fecha de inicio por una fecha pasada.'); return;
    }
    if (raw.end < raw.start) { this.toast.warning('La fecha final no puede ser anterior al inicio.'); return; }
    const id = this.targetCampaignId();
    if (edit && !id) { this.toast.warning('No se encontró la campaña para editar.'); return; }
    if (edit && id) {
      const operations: Observable<unknown>[] = [];
      if (this.quotaEditChanged()) {
        const q = this.quotaForm.getRawValue();
        if (!Number.isInteger(q.count) || q.count < 1) { this.toast.warning('Revise el cupo de jabas.'); return; }
        operations.push(this.planning.configure(id, q.count, q.tare));
      }
      if (this.gradeEditChanged()) {
        if (this.editGrades().some(g => !g.calibreId) && !this.permission.has('PRECIOS_CREAR') ||
            this.grades().some(g => !this.editGrades().some(row => row.calibreId === g.calibreId)) && !this.permission.has('PRECIOS_RETIRAR')) {
          this.toast.warning('No tiene permiso para modificar estos calibres.'); return;
        }
        operations.push(this.saleApi.saveGrades(id, this.normalizedEditGrades()));
      }
      if (this.campaignFieldsChanged()) {
        operations.push(this.planning.update(id, { compradorId:Number(raw.buyerId), nombre:raw.name.trim(),
          fechaInicio:raw.start, fechaFin:raw.end, observacion:raw.observation.trim(), descuentoJabaKg:this.quotaEditChanged() ? this.quotaForm.getRawValue().tare : raw.discount, origenJabas:raw.crateOrigin }));
      }
      if (this.sanctionsChanged()) {
        operations.push(this.sanctionsApi.saveBatch(id,{tarifas:this.selectedSanctionTariffs()}));
      }
      if (!operations.length) return;
      this.busy.set(true);
      concat(...operations).pipe(finalize(() => this.busy.set(false))).subscribe({
        complete: () => this.done('Campaña actualizada'),
        error: err => {
          this.failed(err);
          this.close();
          this.campaignId() ? this.refreshDetail() : this.load();
        },
      });
      return;
    }
    const calibresNormalizados = this.normalizedCreateGrades();
    const keys = calibresNormalizados.map(x => `${x.variedadPaltaId}:${x.calibre}`);
    if (keys.length !== new Set(keys).size) { this.toast.warning('No repita un calibre para la misma variedad.'); return; }
    if (calibresNormalizados.some(x => x.gramosHasta !== null && x.gramosHasta < x.gramosDesde)) {
      this.toast.warning('El límite superior en gramos debe ser mayor o igual al inferior.'); return;
    }
    if (calibresNormalizados.some((a, i) => calibresNormalizados.some((b, j) => j > i && a.variedadPaltaId === b.variedadPaltaId
      && a.gramosDesde <= (b.gramosHasta ?? Infinity)
      && b.gramosDesde <= (a.gramosHasta ?? Infinity)))) {
      this.toast.warning('Los rangos de calibres de una misma variedad se superponen.'); return;
    }
    // El campo numérico vacío puede devolver null aunque el FormControl sea nonNullable.
    // El cupo es opcional al crear y se configura obligatoriamente antes de repartir jabas.
    const quota = raw.quota == null || raw.quota === 0 ? undefined : Number(raw.quota);
    if (quota !== undefined && (!Number.isInteger(quota) || quota < 1 || quota > 100000)) {
      this.toast.warning('El cupo debe ser entero entre 1 y 100000, o dejarse vacío.'); return;
    }
    if (Number(raw.discount ?? 0) > 0 && quota === undefined) {
      this.toast.warning('Para aplicar tara debe definir primero el cupo de jabas.'); return;
    }
    this.busy.set(true);
    const uotId = this.uot.selectedId();
    if (!uotId || !this.apappss() || Number(raw.associationId) !== this.apappss()!.asociacionId) {
      this.busy.set(false);
      this.toast.warning('Seleccione una UOT con convenio APAPPSS habilitado.'); return;
    }
    this.planning.create({ uotId, asociacionId: Number(raw.associationId), compradorId: Number(raw.buyerId), nombre: raw.name.trim(),
      fechaInicio: raw.start, fechaFin: raw.end, observacion: raw.observation.trim(), cupoJabas: quota,
      modalidadVentaId: Number(raw.modalityId), origenJabas: raw.crateOrigin, descuentoJabaKg: raw.discount,
      precios: [...new Map(raw.lines.map(x => [Number(x.variety), {
        variedadPaltaId: Number(x.variety), precio: Number(x.price),
      }])).values()],
      calibres: calibresNormalizados })
      .pipe(switchMap(created => {
        const tariffs=this.selectedSanctionTariffs();
        if (!tariffs.length) return of({created, sanctionsSaved:true, sanctionError:''});
        return this.sanctionsApi.saveBatch(created.campaniaVentaId,{tarifas:tariffs}).pipe(
          map(() => ({created, sanctionsSaved:true, sanctionError:''})),
          catchError(err => of({created, sanctionsSaved:false, sanctionError:this.errorOf(err)})));
      }),finalize(() => this.busy.set(false)))
      .subscribe({ next: ({created,sanctionsSaved,sanctionError}) => {
          this.close();
          if (sanctionsSaved) this.toast.success('Campaña registrada');
          else this.toast.warning(`Campaña creada; sanciones pendientes: ${sanctionError}`);
          void this.router.navigate(['/gestion-comercial/campanias', created.campaniaVentaId]);
        }, error: (err: unknown) => this.failed(err) });
  }

  openMembers(): void {
    const id = this.campaignId(); if (!id) return;
    if (!this.canAddMembers()) { this.toast.warning('Se requieren permisos y vigencia activa para incorporar socios con jabas.'); return; }
    this.memberSearch.set(''); this.busy.set(true);
    this.planning.eligible(id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: partners => { this.eligible.set(partners); this.restoreCart(partners); this.open('members'); },
      error: (err: unknown) => this.failed(err),
    });
  }
  private cartKey(): string | null {
    const camp = this.campaignId();
    const uot = this.uot.selectedId();
    const user = this.access.user()?.usuarioId;
    return camp && uot && user ? `desco:campanias:carrito:${user}:${uot}:${camp}` : null;
  }
  private restoreCart(eligible: readonly EligiblePartner[]): void {
    const key = this.cartKey();
    if (!key || typeof localStorage === 'undefined') { this.selection.set([]); return; }
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      const allowed = new Set(eligible.map(person => person.socioAsociacionId));
      const valid = Array.isArray(stored) ? [...new Set(stored.filter((v): v is number =>
        Number.isSafeInteger(v) && v > 0 && allowed.has(v)))].slice(0, 100) : [];
      this.selection.set(valid);
      this.persistCart();
    } catch { this.selection.set([]); this.persistCart(); }
  }
  private persistCart(): void {
    const key = this.cartKey();
    if (!key || typeof localStorage === 'undefined') return;
    try {
      if (this.selection().length) localStorage.setItem(key, JSON.stringify(this.selection()));
      else localStorage.removeItem(key);
    } catch { this.toast.warning('No se pudo conservar la selección de socios.'); }
  }
  clearCart(): void { this.selection.set([]); this.persistCart(); }
  isSelected(id: number): boolean { return this.selection().includes(id); }
  toggleMember(id: number, checked: boolean): void {
    this.selection.update(current => {
      if (!checked) return current.filter(value => value !== id);
      if (current.includes(id) || current.length >= 100) return current;
      return [...current, id];
    });
    this.persistCart();
  }
  toggleAll(checked: boolean): void {
    if (!checked) { this.clearCart(); return; }
    // Mantener los socios seleccionados al cambiar el filtro de búsqueda.
    this.selection.update(current => {
      const selected = new Set(current);
      for (const partner of this.filteredEligible()) {
        if (selected.size >= 100) break;
        selected.add(partner.socioAsociacionId);
      }
      return [...selected];
    });
    this.persistCart();
  }
  saveMembers(): void {
    const id = this.campaignId(); if (!id || !this.canAddMembers() || !this.hasQuota() ||
      this.selection().length < 1 || this.selection().length > 100) return;
    this.busy.set(true);
    this.planning.include(id, [...this.selection()]).pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: (r) => { this.clearCart(); this.done(`${r.incorporados} socio(s) incorporados con 1 jaba inicial`); }, error: (err: unknown) => this.failed(err) });
  }

  selectPartner(person: CampaignPlanParticipant): void {
    this.selectedParticipant.set(person.participacionId);
  }
  editPartnerCrates(person: CampaignPlanParticipant): void {
    if (!this.canManageParticipants() || person.estadoJabas === 'DEVUELTA' || !this.permission.has('JABAS_CREAR')) return;
    this.selectPartner(person);
    this.open('crates');
  }
  closePartner(): void { this.selectedParticipant.set(null); }
  participantStatus(person: CampaignPlanParticipant): string {
    return person.estadoJabas === 'DEVUELTA' ? 'Devueltas'
      : person.estadoJabas === 'PENDIENTE_DEVOLUCION' ? 'Pendientes de devolución'
      : person.estadoJabas === 'ENTREGADA' ? 'Entregadas'
      : person.estadoJabas === 'PENDIENTE_RECOJO' ? 'Pendientes de recojo' : 'Sin asignación';
  }
  saleStatusLabel(person: SaleParticipant): string {
    if (person.recepcionConfirmada || person.estadoJabas === 'DEVUELTA') return 'Devueltas';
    if (person.devueltas >= person.asignadas) return 'Por confirmar';
    return person.estadoJabas === 'PENDIENTE_RECOJO' ? 'Pendientes de recojo' : 'En recepción';
  }
  selectTab(tab: 'general' | 'participantes' | 'venta'): void {
    this.activeTab.set(tab);
    if (tab !== 'venta') this.selectedSalePartnerId.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab, socio: null },
      queryParamsHandling: 'merge', replaceUrl: true });
    if (tab === 'general' && !this.indicators() && !this.indicatorsLoading()) this.loadIndicators();
  }
  selectSalePartner(person: SaleParticipant): void {
    this.selectedSalePartnerId.set(person.participacionId);
    void this.router.navigate([], { relativeTo: this.route,
      queryParams: { tab: 'venta', socio: person.participacionId }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  closeSalePartner(): void {
    this.selectedSalePartnerId.set(null);
    void this.router.navigate([], { relativeTo: this.route,
      queryParams: { socio: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  saleChanged(): void { this.refreshDetail(); if (this.indicators()) this.loadIndicators(); }
  percent(value: number, maximum: number): number {
    if (!maximum || !Number.isFinite(value) || value <= 0) return 0;
    return Math.max(3, Math.min(100, Number(value) / maximum * 100));
  }
  shortDate(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-');
    return day && month ? `${day}/${month}` : value;
  }
  loadIndicators(): void {
    const id = this.campaignId();
    const start = this.indicatorStart() || this.date(this.campaign()?.['fechaInicio']);
    const end = this.indicatorEnd() || this.date(this.campaign()?.['fechaFin']);
    if (!id || !start || !end) return;
    if (start > end) { this.indicatorsError.set('La fecha inicial no puede ser posterior a la final.'); return; }
    const days = Math.floor((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000);
    if (!Number.isFinite(days) || days > 366) {
      this.indicatorsError.set('Seleccione un periodo máximo de 366 días.'); return;
    }
    this.indicatorStart.set(start); this.indicatorEnd.set(end);
    const request = ++this.indicatorRequest;
    this.indicatorsLoading.set(true); this.indicatorsError.set(null);
    this.saleApi.indicators(id, start, end, this.indicatorVariety())
      .pipe(finalize(() => { if (request === this.indicatorRequest) this.indicatorsLoading.set(false); })).subscribe({
        next: data => {
          if (request !== this.indicatorRequest) return;
          this.indicators.set({ ...data, porDia: data.porDia ?? [],
            porVariedad: data.porVariedad ?? [], porEstado: data.porEstado ?? [] });
        },
        error: err => {
          if (request !== this.indicatorRequest) return;
          this.indicatorsError.set(this.errorOf(err)); this.indicators.set(null);
        },
      });
  }
  saveCrates(): void {
    const id = this.campaignId(); const partner = this.chosenPartner();
    this.cratesForm.markAllAsTouched();
    if (!id || !partner || !this.cratesEditChanged() || !this.canManageParticipants() || !this.hasQuota() || this.cratesForm.invalid) return;
    const count = Number(this.cratesForm.controls.count.value);
    const delivered = partner.estadoJabas === 'ENTREGADA' || partner.estadoJabas === 'PENDIENTE_DEVOLUCION'
      || (partner.estadoJabas === 'PENDIENTE_RECOJO' && (partner.cantidadAjustePendiente ?? 0) > 0);
    const comment = this.cratesForm.controls.comment.value.trim();
    const currentCommitted = (partner.cantidadJabas ?? 0) + Math.max(0, partner.cantidadAjustePendiente ?? 0);
    if (!Number.isInteger(count) || count < (delivered ? 0 : 1) || count > this.availableQuota() + currentCommitted) {
      this.toast.warning('La cantidad supera el cupo disponible.'); return;
    }
    if (delivered && (comment.length < 5 || comment.length > 500)) {
      this.toast.warning('Ingrese un comentario de al menos 5 caracteres.'); return;
    }
    this.busy.set(true);
    this.planning.assign(id, partner.participacionId, count, partner.versionJabas, delivered ? comment : undefined)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: () => this.done('Ajuste de jabas registrado'), error: (err: unknown) => this.failed(err) });
  }

  async deliverPartner(partner: CampaignPlanParticipant): Promise<void> {
    const id = this.campaignId(); if (!id || this.busy() || !this.canManageParticipants() || partner.estadoJabas !== 'PENDIENTE_RECOJO') return;
    const qty = (partner.cantidadAjustePendiente ?? 0) > 0 ? partner.cantidadAjustePendiente : partner.cantidadJabas;
    const answer = await this.confirm.show({ title: 'Confirmar entrega de jabas', message: `¿Se entregaron físicamente ${qty} jabas a ${partner.socioNombre}?`, confirmLabel: 'Confirmar entrega', tone: 'primary' });
    if (!answer.confirmed) return;
    this.busy.set(true);
    this.planning.deliver(id, partner.participacionId).pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: () => { this.toast.success('Entrega de jabas registrada'); this.refreshDetail(); }, error: (err: unknown) => this.failed(err) });
  }

  async returnPartnerCrates(partner: CampaignPlanParticipant): Promise<void> {
    const id = this.campaignId();
    if (!id || this.busy() || !this.canManageParticipants() || partner.estadoJabas !== 'PENDIENTE_DEVOLUCION') return;
    const count = Math.abs(partner.cantidadAjustePendiente ?? 0);
    const answer = await this.confirm.show({ title: 'Confirmar devolución',
      message: `¿Se recibieron físicamente ${count} jabas de ${partner.socioNombre}?`,
      confirmLabel: 'Confirmar devolución', tone: 'primary' });
    if (!answer.confirmed) return;
    this.busy.set(true);
    this.planning.returnCrates(id, partner.participacionId).pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: () => { this.toast.success('Devolución registrada'); this.refreshDetail(); },
        error: (err: unknown) => this.failed(err) });
  }

  async removePartner(partner: CampaignPlanParticipant): Promise<void> {
    if (this.busy() || !this.canManageParticipants() || partner.estadoJabas !== 'PENDIENTE_RECOJO') return;
    const answer = await this.confirm.show({ title: 'Retirar participante', message: `Se retirará a ${partner.socioNombre} y se liberará su reserva pendiente de jabas. No se permite si hubo entrega física u operaciones.`, tone: 'danger', confirmLabel: 'Retirar', requiresReason: true, reasonLabel: 'Motivo', minimumReasonLength: 5 });
    if (!answer.confirmed || !answer.reason) return;
    this.busy.set(true);
    const id = this.campaignId(); if (!id) { this.busy.set(false); return; }
    this.planning.remove(id, partner.participacionId, answer.reason).pipe(finalize(() => this.busy.set(false)))
      .subscribe({ next: () => { this.closePartner(); this.toast.success('Participante retirado y reserva liberada'); this.refreshDetail(); }, error: (err: unknown) => this.failed(err) });
  }

  startNewPrice(): void {
    this.priceEditId.set(null);
    this.initialPriceValue = null;
    this.priceForm.reset({ variety: 0, price: 0 });
    this.editingPrice.set(true);
  }
  startPriceVersion(row: Record<string, unknown>): void {
    this.priceEditId.set(this.num(row['precioComercialId']) || this.num(row['id']));
    this.priceForm.setValue({ variety: this.num(row['variedadPaltaId']), price: this.num(row['precio']) });
    this.initialPriceValue = this.num(row['precio']);
    this.editingPrice.set(true);
  }
  savePriceInline(): void {
    const id = this.campaignId();
    this.priceForm.markAllAsTouched();
    if (!id || !this.canEdit() || !this.priceEditChanged() || this.priceForm.invalid) return;
    const p = this.priceForm.getRawValue();
    const conditionId = this.plan()?.condicionComercialId;
    const versionId = this.priceEditId();
    if (!versionId && (!conditionId || !this.priceCandidates().some(v => v.value === Number(p.variety)))) {
      this.toast.warning('Seleccione una variedad disponible para esta campaña.'); return;
    }
    this.busy.set(true);
    const validFrom = new Date().toISOString();
    const call = versionId
      ? this.api.versionPrice(versionId, { precio: Number(p.price), fechaVigenciaDesde: validFrom })
      : this.api.createPrice({ campaniaVentaId: id, variedadPaltaId: Number(p.variety),
          condicionComercialId: Number(conditionId), precio: Number(p.price), moneda: 'PEN',
          unidadMedida: 'KG', fechaVigenciaDesde: validFrom });
    call.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.editingPrice.set(false); this.toast.success(versionId ? 'Precio versionado' : 'Variedad agregada'); this.refreshDetail(); },
      error: err => this.failed(err),
    });
  }
  openHistory(row: Record<string, unknown>): void {
    const id = this.num(row['precioComercialId']) || this.num(row['id']);
    if (!id) return;
    this.busy.set(true);
    this.api.priceHistory(id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: rows => { this.history.set(rows); this.open('history'); }, error: err => this.failed(err),
    });
  }

  /** Estado comercial efectivo mientras el programador confirma el vencimiento en SQL Server. */
  effectiveStatus(row: Record<string, unknown> | null): string {
    const state = this.str(row?.['estadoProceso']);
    const end = this.date(row?.['fechaFin']);
    return state === 'ACTIVA' && !!end && end < this.today() ? 'VENCIDA' : state;
  }
  canTransition(row: Record<string, unknown> | null, action: 'activar' | 'cerrar' | 'cancelar'): boolean {
    if (!row || !this.findId(row)) return false;
    const state = this.effectiveStatus(row);
    if (action === 'activar') {
      return state === 'PLANIFICACION' && this.date(row['fechaFin']) >= this.today()
        && (this.permission.has('CAMPANIAS_CONFIRMAR') || this.permission.has('CAMPANIAS_APROBAR'));
    }
    if (action === 'cerrar') {
      return state === 'ACTIVA' && (this.permission.has('CAMPANIAS_CONFIRMAR') || this.permission.has('CAMPANIAS_APROBAR'));
    }
    return state === 'PLANIFICACION' && this.date(row['fechaFin']) >= this.today() && this.permission.has('CAMPANIAS_RETIRAR');
  }
  async changeCampaignState(row: Record<string, unknown> | null, action: 'activar' | 'cerrar' | 'cancelar'): Promise<void> {
    if (!this.canTransition(row, action) || this.busy()) return;
    const id = this.findId(row!);
    const title = action === 'activar' ? 'Activar campaña' : action === 'cerrar' ? 'Cerrar campaña' : 'Cancelar campaña';
    const message = action === 'activar'
      ? 'Se validarán los socios, precios y la producción disponible. ¿Desea activar la campaña?'
      : action === 'cerrar' ? 'No se permitirán nuevas operaciones comerciales. Las liquidaciones y pagos pendientes seguirán disponibles.'
      : 'La campaña dejará de estar disponible. Esta acción requiere un motivo.';
    const answer = await this.confirm.show({ title, message, confirmLabel: title,
      tone: action === 'cancelar' ? 'danger' : 'primary', requiresReason: action === 'cancelar',
      minimumReasonLength: 5 });
    if (!answer.confirmed || !this.canTransition(row, action) || this.busy()) return;
    this.busy.set(true);
    const request = action === 'activar' ? this.api.activateCampaign(id, answer.reason ?? undefined)
      : action === 'cerrar' ? this.api.closeCampaign(id, answer.reason ?? undefined)
      : this.api.cancelCampaign(id, answer.reason ?? undefined);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.toast.success(action === 'activar' ? 'Campaña activada.' : action === 'cerrar' ? 'Campaña cerrada.' : 'Campaña cancelada.');
        if (this.campaignId()) this.refreshDetail(); else this.load();
      },
      error: err => this.failed(err),
    });
  }

  /** Acceso por acción en campañas, sin entrada de menú duplicada. */
  saleEnabled(row: Record<string, unknown> | null): boolean {
    if (!row || this.effectiveStatus(row) !== 'ACTIVA') return false;
    const start = this.date(row['fechaInicio']);
    const end = this.date(row['fechaFin']);
    return !!start && !!end && start <= this.today() && this.today() <= end;
  }
}
