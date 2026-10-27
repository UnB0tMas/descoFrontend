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
  faCoins,
  faEye,
  faGrip,
  faImage,
  faList,
  faMagnifyingGlass,
  faPen,
  faPlus,
  faPowerOff,
  faRotate,
  faRotateLeft,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { LocalFilePanelComponent } from '../../../../../../../../shared/files/local-file-panel/local-file-panel';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { ResourceImageComponent } from '../../../../../../shared/resource-image/resource-image';
import { ProductoFormComponent } from '../producto-form/producto-form';

type ProductViewMode = 'table' | 'cards';

@Component({
  selector: 'app-productos-list-page',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    LocalFilePanelComponent,
    PageHeaderComponent,
    ProductoFormComponent,
    ResourceImageComponent,
  ],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosListPage implements OnInit {
  @ViewChild(ProductoFormComponent) private form!: ProductoFormComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;

  private readonly api = inject(ResourceApiService);
  private readonly refs = inject(ReferenceDataService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(false);
  readonly actionLoadingKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<PageResult<ResourceProductListItemResponse>>(emptyPageResult(20));
  readonly search = signal('');
  readonly unitFilter = signal<number | null>(null);
  readonly categoryFilter = signal('');
  readonly stateFilter = signal('ACTIVE');
  readonly categories = signal<readonly { code: string; label: string }[]>([]);
  readonly viewMode = signal<ProductViewMode>('table');
  readonly selectedForImages = signal<ResourceProductListItemResponse | null>(null);

  readonly pageIcon = faTags;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly priceIcon = faCoins;
  readonly imageIcon = faImage;
  readonly refreshIcon = faRotate;
  readonly searchIcon = faMagnifyingGlass;
  readonly viewIcon = faEye;
  readonly tableIcon = faList;
  readonly cardsIcon = faGrip;
  readonly deactivateIcon = faPowerOff;
  readonly reactivateIcon = faRotateLeft;

  readonly isGeneral = computed(() => this.uot.modo() === 'GENERAL');
  readonly units = computed(() => this.uot.memberships());
  readonly contextUotId = computed(() => this.isGeneral() ? this.unitFilter() : this.uot.selectedId());
  readonly contextUotName = computed(() => {
    const id = this.contextUotId();
    return id ? this.units().find((unit) => unit.uotId === id)?.nombre ?? 'UOT' : 'Todas mis UOT';
  });

  ngOnInit(): void {
    this.unitFilter.set(this.isGeneral() ? null : this.uot.selectedId());
    this.refs.catalog('CATEGORIA_PRODUCTO').subscribe({
      next: (items) => this.categories.set(items.map((item) => ({ code: item.code, label: item.label }))),
    });
    this.load(1);
  }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const active = this.stateFilter() === 'ALL' ? undefined : this.stateFilter() === 'ACTIVE';
    this.api.listProducts({
      uotId: this.contextUotId() ?? undefined,
      search: this.search(),
      category: this.categoryFilter() || undefined,
      active,
      page,
      size,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (result) => {
        this.result.set(result);
        const selected = this.selectedForImages();
        if (selected) this.selectedForImages.set(result.items.find((item) => this.sameRow(item, selected)) ?? null);
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }

  applyFilters(): void { this.selectedForImages.set(null); this.load(1); }
  onUnitChange(value: string): void { const id = Number(value); this.unitFilter.set(Number.isFinite(id) && id > 0 ? id : null); this.applyFilters(); }
  setView(mode: ProductViewMode): void { this.viewMode.set(mode); }

  async create(): Promise<void> {
    const result = await this.form.openCreate(this.contextUotId() ?? undefined);
    if (result.saved) this.load(1);
  }

  async edit(item: ResourceProductListItemResponse): Promise<void> {
    const uotId = this.rowUotId(item);
    if (!uotId) return;
    const result = await this.form.openEdit(item, uotId);
    if (result.saved) this.load();
  }

  async price(item: ResourceProductListItemResponse): Promise<void> {
    const uotId = this.rowUotId(item);
    if (!uotId) return;
    const result = await this.form.openPrice(item, uotId);
    if (result.saved) this.load();
  }

  async toggleState(item: ResourceProductListItemResponse): Promise<void> {
    const productId = Number(item.productoId ?? 0);
    const uotId = this.rowUotId(item);
    if (!productId || !uotId || this.actionLoadingKey()) return;
    const active = item.estado !== false;
    const confirmation = await this.confirm.show({
      title: active ? 'Desactivar producto' : 'Reactivar producto',
      message: active
        ? `El producto “${item.nombre ?? item.codigo ?? productId}” dejará de aparecer entre los activos. No se eliminará físicamente.`
        : `El producto “${item.nombre ?? item.codigo ?? productId}” volverá a estar disponible.`,
      confirmLabel: active ? 'Desactivar' : 'Reactivar',
      cancelLabel: 'Cancelar',
      tone: active ? 'danger' : 'warning',
    });
    if (!confirmation.confirmed) return;

    const key = this.rowKey(item);
    this.actionLoadingKey.set(key);
    const operation = active
      ? this.api.deactivateProduct(productId, uotId)
      : this.api.reactivateProduct(productId, uotId);
    operation.pipe(finalize(() => this.actionLoadingKey.set(null))).subscribe({
      next: () => {
        this.toast.success(active ? 'Producto desactivado' : 'Producto reactivado');
        this.selectedForImages.set(null);
        this.load();
      },
      error: (error) => this.toast.error('No se pudo cambiar el estado del producto', mapOpenApiError(error).message),
    });
  }

  selectImages(item: ResourceProductListItemResponse): void {
    this.selectedForImages.set(this.sameRow(this.selectedForImages(), item) ? null : item);
  }

  canUploadImages(): boolean { return this.permissions.has('PRODUCTOS_IMAGENES') && this.permissions.has('ARCHIVOS_CREAR'); }
  imageIds(item: ResourceProductListItemResponse): readonly number[] { return item.archivoPrincipalId ? [item.archivoPrincipalId] : []; }
  rowKey(item: ResourceProductListItemResponse): string { return `${item.productoId ?? 0}-${item.uotId ?? 0}`; }
  isImagesSelected(item: ResourceProductListItemResponse): boolean { return this.sameRow(this.selectedForImages(), item); }
  detailQuery(item: ResourceProductListItemResponse): { uotId: number } { return { uotId: this.rowUotId(item) }; }
  rowBusy(item: ResourceProductListItemResponse): boolean { return this.actionLoadingKey() === this.rowKey(item); }

  private rowUotId(item: ResourceProductListItemResponse): number {
    return Number(item.uotId ?? this.contextUotId() ?? 0);
  }

  private sameRow(left: ResourceProductListItemResponse | null, right: ResourceProductListItemResponse): boolean {
    return Boolean(left && left.productoId === right.productoId && left.uotId === right.uotId);
  }
}
