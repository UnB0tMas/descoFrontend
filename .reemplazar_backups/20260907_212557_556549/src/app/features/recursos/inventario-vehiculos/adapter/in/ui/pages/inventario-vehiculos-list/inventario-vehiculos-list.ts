import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBookOpen,
  faBoxesStacked,
  faEye,
  faPen,
  faPlus,
  faRotate,
  faTrashCan,
  faTruck,
  faWarehouse,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { forkJoin, finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarCatalogosUseCase } from '../../../../../../../administracion/catalogos/application/use-case/listar-catalogos.use-case';
import { ListarOrganizacionesUseCase } from '../../../../../../../administracion/organizaciones/application/use-case/listar-organizaciones.use-case';
import { ConsultarKardexSuministroUseCase } from '../../../../../application/use-case/consultar-kardex-suministro.use-case';
import { ListarBienesUseCase } from '../../../../../application/use-case/listar-bienes.use-case';
import { ListarSuministrosUseCase } from '../../../../../application/use-case/listar-suministros.use-case';
import { RetirarBienUseCase } from '../../../../../application/use-case/retirar-bien.use-case';
import { BienInventario } from '../../../../../domain/bien-inventario.model';
import { MovimientoSuministro } from '../../../../../domain/movimiento-suministro.model';
import { Suministro } from '../../../../../domain/suministro.model';
import { RecursoFormComponent } from '../recurso-form/recurso-form';

type InventoryTab = 'assets' | 'supplies';

@Component({
  selector: 'app-inventario-vehiculos-list-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    PageHeaderComponent,
    RecursoFormComponent,
  ],
  templateUrl: './inventario-vehiculos-list.html',
  styleUrl: './inventario-vehiculos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioVehiculosListPage implements OnInit {
  @ViewChild(RecursoFormComponent) private form!: RecursoFormComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;

  private readonly listAssetsUseCase = inject(ListarBienesUseCase);
  private readonly listSuppliesUseCase = inject(ListarSuministrosUseCase);
  private readonly kardexUseCase = inject(ConsultarKardexSuministroUseCase);
  private readonly retireUseCase = inject(RetirarBienUseCase);
  private readonly organizationsUseCase = inject(ListarOrganizacionesUseCase);
  private readonly catalogsUseCase = inject(ListarCatalogosUseCase);
  private readonly toast = inject(ToastService);

  readonly tab = signal<InventoryTab>('assets');
  readonly loading = signal(true);
  readonly suppliesLoading = signal(true);
  readonly referencesLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly suppliesError = signal<string | null>(null);
  readonly retiringId = signal<number | null>(null);

  readonly kardexSupply = signal<Suministro | null>(null);
  readonly kardexLoading = signal(false);
  readonly kardexError = signal<string | null>(null);
  readonly kardexItems = signal<readonly MovimientoSuministro[]>([]);

  readonly assets = signal<PageResult<BienInventario>>(emptyPageResult(20));
  readonly supplies = signal<PageResult<Suministro>>(emptyPageResult(20));
  readonly companies = signal<readonly AdminSelectOption[]>([]);
  readonly types = signal<readonly AdminSelectOption[]>([]);
  readonly companyFilter = signal<number | null>(null);
  readonly typeFilter = signal<number | null>(null);
  readonly stateFilter = signal('');

  readonly pageIcon = faWarehouse;
  readonly assetIcon = faBoxesStacked;
  readonly supplyIcon = faWarehouse;
  readonly truckIcon = faTruck;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly viewIcon = faEye;
  readonly retireIcon = faTrashCan;
  readonly refreshIcon = faRotate;
  readonly kardexIcon = faBookOpen;
  readonly closeIcon = faXmark;

  ngOnInit(): void {
    this.loadReferences();
    this.loadAssets(1);
    this.loadSupplies(1);
  }

  setTab(tab: InventoryTab): void { this.tab.set(tab); }

  loadReferences(): void {
    this.referencesLoading.set(true);
    forkJoin({
      companies: this.organizationsUseCase.execute(1, 100),
      types: this.catalogsUseCase.execute({ catalogo: 'TIPO_BIEN', page: 1, size: 100 }),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ companies, types }) => {
          this.companies.set(companies.items.map((item) => ({ value: item.empresaId, label: item.razonSocial, description: item.ruc })));
          this.types.set(types.items.filter((item) => item.estado).map((item) => ({ value: item.id, label: item.nombre, description: item.codigo })));
        },
        error: () => { this.companies.set([]); this.types.set([]); },
      });
  }

  loadAssets(page = this.assets().page, size = this.assets().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.listAssetsUseCase
      .execute({
        empresaId: this.companyFilter() ?? undefined,
        tipoBienId: this.typeFilter() ?? undefined,
        estadoBien: this.stateFilter() || undefined,
        page,
        size,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.assets.set(result),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  loadSupplies(page = this.supplies().page, size = this.supplies().size): void {
    this.suppliesLoading.set(true);
    this.suppliesError.set(null);
    this.listSuppliesUseCase.execute(page, size)
      .pipe(finalize(() => this.suppliesLoading.set(false)))
      .subscribe({
        next: (result) => this.supplies.set(result),
        error: (error) => this.suppliesError.set(mapOpenApiError(error).message),
      });
  }

  async createAsset(): Promise<void> {
    const result = await this.form.open('createAsset', { companies: this.companies(), assetTypes: this.types() });
    if (result.saved) this.loadAssets(1);
  }

  async editAsset(asset: BienInventario): Promise<void> {
    const result = await this.form.open('editAsset', { asset });
    if (result.saved) this.loadAssets();
  }

  async createSupply(): Promise<void> {
    const result = await this.form.open('createSupply');
    if (result.saved) this.loadSupplies(1);
  }

  async editSupply(supply: Suministro): Promise<void> {
    const result = await this.form.open('editSupply', { supply });
    if (result.saved) this.loadSupplies();
  }

  async movement(supply: Suministro): Promise<void> {
    const result = await this.form.open('movement', { supply });
    if (result.saved) {
      this.loadSupplies();
      if (this.kardexSupply()?.suministroId === supply.suministroId) this.openKardex(supply);
    }
  }

  openKardex(supply: Suministro): void {
    this.kardexSupply.set(supply);
    this.kardexItems.set([]);
    this.kardexError.set(null);
    this.kardexLoading.set(true);
    this.kardexUseCase.execute(supply.suministroId)
      .pipe(finalize(() => this.kardexLoading.set(false)))
      .subscribe({
        next: (items) => this.kardexItems.set(items),
        error: (error) => this.kardexError.set(mapOpenApiError(error).message),
      });
  }

  closeKardex(): void {
    this.kardexSupply.set(null);
    this.kardexItems.set([]);
    this.kardexError.set(null);
  }

  async retire(asset: BienInventario): Promise<void> {
    if (this.retiringId()) return;
    const confirmation = await this.confirm.show({
      title: 'Dar de baja el bien',
      message: `El bien “${asset.nombre}” quedará fuera de uso.`,
      tone: 'danger',
      confirmLabel: 'Dar de baja',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo de la baja.',
      minimumReasonLength: 5,
    });
    if (!confirmation.confirmed || !confirmation.reason) return;

    this.retiringId.set(asset.bienInventarioId);
    this.retireUseCase.execute(asset.bienInventarioId, confirmation.reason)
      .pipe(finalize(() => this.retiringId.set(null)))
      .subscribe({
        next: () => { this.toast.success('Bien dado de baja'); this.loadAssets(); },
        error: (error) => this.toast.error('No se pudo dar de baja el bien', mapOpenApiError(error).message),
      });
  }
}
