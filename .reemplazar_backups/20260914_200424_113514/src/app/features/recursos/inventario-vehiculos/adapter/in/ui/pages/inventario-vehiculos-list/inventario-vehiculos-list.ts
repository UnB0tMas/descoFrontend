import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightArrowLeft,
  faBoxOpen,
  faClockRotateLeft,
  faEye,
  faFilter,
  faPen,
  faPlus,
  faRotate,
  faTriangleExclamation,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ResourceAssetResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetResponse';
import { SupplyMovementResponse } from '../../../../../../../../infrastructure/openapi/generated/model/supplyMovementResponse';
import { SupplySummaryResponse } from '../../../../../../../../infrastructure/openapi/generated/model/supplySummaryResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { SupplyApiService } from '../../../../../../shared/supply-api.service';
import { RecursoFormComponent } from '../recurso-form/recurso-form';
import { SuministroFormComponent } from '../suministro-form/suministro-form';

type InventoryTab = 'assets' | 'supplies';

@Component({
  selector: 'app-inventario-vehiculos-list-page',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    RecursoFormComponent,
    SuministroFormComponent,
  ],
  templateUrl: './inventario-vehiculos-list.html',
  styleUrl: './inventario-vehiculos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioVehiculosListPage implements OnInit {
  @ViewChild(RecursoFormComponent) private assetForm!: RecursoFormComponent;
  @ViewChild(SuministroFormComponent) private supplyForm!: SuministroFormComponent;

  private readonly api = inject(ResourceApiService);
  private readonly suppliesApi = inject(SupplyApiService);
  readonly uot = inject(UotContextStore);

  readonly activeTab = signal<InventoryTab>('assets');
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly assets = signal<readonly ResourceAssetResponse[]>([]);
  readonly supplies = signal<readonly SupplySummaryResponse[]>([]);
  readonly search = signal('');
  readonly stateFilter = signal('');
  readonly unitFilter = signal<number | null>(null);
  readonly kardexSupply = signal<SupplySummaryResponse | null>(null);
  readonly kardex = signal<readonly SupplyMovementResponse[]>([]);
  readonly kardexLoading = signal(false);
  readonly kardexError = signal<string | null>(null);

  readonly pageIcon = faWarehouse;
  readonly addIcon = faPlus;
  readonly refreshIcon = faRotate;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly filterIcon = faFilter;
  readonly incidentIcon = faTriangleExclamation;
  readonly supplyIcon = faBoxOpen;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly historyIcon = faClockRotateLeft;

  readonly isGeneral = computed(() => this.uot.modo() === 'GENERAL');
  readonly availableUnits = computed(() => this.uot.memberships());

  readonly filteredAssets = computed(() => {
    const query = this.search().trim().toLowerCase();
    const state = this.stateFilter().trim().toUpperCase();

    return this.assets().filter((item) => {
      if (state && (item.estadoBien ?? '').toUpperCase() !== state) return false;
      if (!query) return true;
      return [
        item.codigoPatrimonial,
        item.nombre,
        item.marca,
        item.modelo,
        item.serie,
        item.tipoBien,
        item.uotNombre,
      ].some((value) => (value ?? '').toLowerCase().includes(query));
    });
  });

  readonly filteredSupplies = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.supplies();

    return this.supplies().filter((item) =>
      [
        item.codigo,
        item.nombre,
        item.unidadMedida,
        item.uotNombre,
        item.uotCodigo,
      ].some((value) => (value ?? '').toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.unitFilter.set(this.uot.selectedId());
    if (this.isGeneral()) this.unitFilter.set(null);
    this.load();
  }

  setTab(tab: InventoryTab): void {
    this.activeTab.set(tab);
    this.search.set('');
    this.errorMessage.set(null);
    this.load();
  }

  load(): void {
    if (this.activeTab() === 'supplies') {
      this.loadSupplies();
    } else {
      this.loadAssets();
    }
  }

  loadAssets(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api
      .listAssets(this.effectiveUotId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.assets.set(items),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  loadSupplies(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.suppliesApi
      .listAll(this.effectiveUotId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.supplies.set(items);
          const selected = this.kardexSupply();
          if (selected) {
            this.kardexSupply.set(
              items.find(
                (item) =>
                  item.suministroId === selected.suministroId
                  && item.uotId === selected.uotId,
              ) ?? null,
            );
          }
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onUnitChange(value: string): void {
    const parsed = Number(value);
    this.unitFilter.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    this.kardexSupply.set(null);
    this.kardex.set([]);
    this.load();
  }

  async create(): Promise<void> {
    if (this.activeTab() === 'supplies') {
      const result = await this.supplyForm.openCreate(this.effectiveUotId());
      if (result.saved) this.loadSupplies();
      return;
    }

    const result = await this.assetForm.openCreate(this.effectiveUotId());
    if (result.saved) this.loadAssets();
  }

  async editAsset(item: ResourceAssetResponse): Promise<void> {
    const result = await this.assetForm.openEdit(item);
    if (result.saved) this.loadAssets();
  }

  async editSupply(item: SupplySummaryResponse): Promise<void> {
    const result = await this.supplyForm.openEdit(item);
    if (result.saved) this.loadSupplies();
  }

  async movement(item: SupplySummaryResponse): Promise<void> {
    const result = await this.supplyForm.openMovement(item);
    if (result.saved) {
      this.loadSupplies();
      if (this.sameSupply(this.kardexSupply(), item)) this.loadKardex(item);
    }
  }

  toggleKardex(item: SupplySummaryResponse): void {
    if (this.sameSupply(this.kardexSupply(), item)) {
      this.kardexSupply.set(null);
      this.kardex.set([]);
      this.kardexError.set(null);
      return;
    }
    this.loadKardex(item);
  }

  loadKardex(item: SupplySummaryResponse): void {
    if (!item.suministroId) return;

    this.kardexSupply.set(item);
    this.kardexLoading.set(true);
    this.kardexError.set(null);
    this.kardex.set([]);

    this.suppliesApi
      .kardex(Number(item.suministroId), item.uotId)
      .pipe(finalize(() => this.kardexLoading.set(false)))
      .subscribe({
        next: (movements) => this.kardex.set(movements),
        error: (error) => this.kardexError.set(mapOpenApiError(error).message),
      });
  }

  stateLabel(value?: string): string {
    return (value ?? 'SIN ESTADO').replaceAll('_', ' ');
  }

  stateClass(value?: string): string {
    const normalized = (value ?? '').toUpperCase();
    if (normalized === 'DISPONIBLE') return 'resource-status resource-status--ok';
    if (normalized === 'BAJA' || normalized === 'INACTIVO') {
      return 'resource-status resource-status--muted';
    }
    if (
      normalized === 'AVERIADO'
      || normalized === 'MANTENIMIENTO'
      || normalized === 'NO_DISPONIBLE'
    ) {
      return 'resource-status resource-status--warning';
    }
    return 'resource-status resource-status--info';
  }

  sameSupply(
    left: SupplySummaryResponse | null,
    right: SupplySummaryResponse,
  ): boolean {
    return Boolean(
      left
      && left.suministroId === right.suministroId
      && left.uotId === right.uotId,
    );
  }

  supplyKey(item: SupplySummaryResponse): string {
    return `${item.suministroId ?? 0}-${item.uotId ?? 0}`;
  }

  private effectiveUotId(): number | undefined {
    return this.isGeneral()
      ? this.unitFilter() ?? undefined
      : this.uot.selectedId() ?? undefined;
  }
}
