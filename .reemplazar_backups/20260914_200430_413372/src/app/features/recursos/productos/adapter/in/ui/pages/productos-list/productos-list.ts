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
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faClockRotateLeft,
  faCoins,
  faImage,
  faPlus,
  faRotate,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, map, of } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ResourceProductResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { LocalFilePanelComponent } from '../../../../../../../../shared/files/local-file-panel/local-file-panel';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import {
  ResourceApiService,
  ResourceProductPriceHistory,
} from '../../../../../../shared/resource-api.service';
import { ProductoFormComponent } from '../producto-form/producto-form';

interface ProductRow extends ResourceProductResponse {
  contextUotId: number;
  contextUotCodigo: string;
  contextUotNombre: string;
}

@Component({
  selector: 'app-productos-list-page',
  standalone: true,
  imports: [
    DecimalPipe,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    LocalFilePanelComponent,
    PageHeaderComponent,
    ProductoFormComponent,
  ],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosListPage implements OnInit {
  @ViewChild(ProductoFormComponent) private form!: ProductoFormComponent;

  private readonly api = inject(ResourceApiService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly products = signal<readonly ProductRow[]>([]);
  readonly search = signal('');
  readonly unitFilter = signal<number | null>(null);
  readonly selectedForImages = signal<ProductRow | null>(null);
  readonly historyProduct = signal<ProductRow | null>(null);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly priceHistory = signal<readonly ResourceProductPriceHistory[]>([]);

  readonly pageIcon = faTags;
  readonly addIcon = faPlus;
  readonly priceIcon = faCoins;
  readonly historyIcon = faClockRotateLeft;
  readonly imageIcon = faImage;
  readonly refreshIcon = faRotate;

  readonly isGeneral = computed(() => this.uot.modo() === 'GENERAL');
  readonly units = computed(() => this.uot.memberships());
  readonly contextUotId = computed(() =>
    this.isGeneral() ? this.unitFilter() : this.uot.selectedId(),
  );
  readonly contextUotName = computed(() => {
    const id = this.contextUotId();
    return id
      ? this.units().find((unit) => unit.uotId === id)?.nombre ?? 'UOT'
      : 'Todas mis UOT';
  });

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.products();

    return this.products().filter((item) =>
      [
        item.codigo,
        item.nombre,
        item.categoria,
        item.unidadMedida,
        item.contextUotNombre,
        item.contextUotCodigo,
      ].some((value) => (value ?? '').toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.unitFilter.set(this.uot.modo() === 'ESPECIFICA' ? this.uot.selectedId() : null);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const selectedId = this.contextUotId();
    const units = selectedId
      ? this.units().filter((unit) => unit.uotId === selectedId)
      : this.units();

    const request = units.length === 0
      ? of([] as ProductRow[])
      : forkJoin(
          units.map((unit) =>
            this.api.listProducts(unit.uotId).pipe(
              map((items) =>
                items.map((item) => ({
                  ...item,
                  contextUotId: unit.uotId,
                  contextUotCodigo: unit.codigo,
                  contextUotNombre: unit.nombre,
                }) satisfies ProductRow),
              ),
            ),
          ),
        ).pipe(map((groups) => groups.flat()));

    request
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.products.set(items);
          this.reconcileExpandedRows(items);
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onUnitChange(value: string): void {
    const id = Number(value);
    this.unitFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.historyProduct.set(null);
    this.selectedForImages.set(null);
    this.priceHistory.set([]);
    this.load();
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate(this.contextUotId() ?? undefined);
    if (result.saved) this.load();
  }

  async price(item: ProductRow): Promise<void> {
    const result = await this.form.openPrice(item, item.contextUotId);
    if (result.saved) {
      this.load();
      if (this.sameRow(this.historyProduct(), item)) this.loadHistory(item);
    }
  }

  toggleHistory(item: ProductRow): void {
    if (this.sameRow(this.historyProduct(), item)) {
      this.historyProduct.set(null);
      this.priceHistory.set([]);
      this.historyError.set(null);
      return;
    }
    this.loadHistory(item);
  }

  loadHistory(item: ProductRow): void {
    const productId = item.productoId;
    if (!productId || !item.contextUotId) return;

    this.historyProduct.set(item);
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.priceHistory.set([]);

    this.api.listProductPriceHistory(productId, item.contextUotId)
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: (items) => this.priceHistory.set(items),
        error: (error) => this.historyError.set(mapOpenApiError(error).message),
      });
  }

  selectImages(item: ProductRow): void {
    this.selectedForImages.set(
      this.sameRow(this.selectedForImages(), item) ? null : item,
    );
  }

  imageIds(item: ResourceProductResponse): readonly number[] {
    return item.archivoPrincipalId ? [item.archivoPrincipalId] : [];
  }

  rowKey(item: ProductRow): string {
    return `${item.productoId ?? 0}-${item.contextUotId}`;
  }

  sameRow(left: ProductRow | null, right: ProductRow): boolean {
    return Boolean(
      left
      && left.productoId === right.productoId
      && left.contextUotId === right.contextUotId,
    );
  }

  private reconcileExpandedRows(items: readonly ProductRow[]): void {
    const images = this.selectedForImages();
    if (images) {
      this.selectedForImages.set(
        items.find((item) => this.sameRow(images, item)) ?? null,
      );
    }

    const history = this.historyProduct();
    if (history) {
      this.historyProduct.set(
        items.find((item) => this.sameRow(history, item)) ?? null,
      );
    }
  }
}
