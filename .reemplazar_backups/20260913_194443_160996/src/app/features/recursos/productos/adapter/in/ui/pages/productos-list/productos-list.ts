import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faClockRotateLeft,
  faCoins,
  faImage,
  faPlus,
  faRotate,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

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
  readonly products = signal<readonly ResourceProductResponse[]>([]);
  readonly search = signal('');
  readonly selectedForImages = signal<ResourceProductResponse | null>(null);
  readonly historyProduct = signal<ResourceProductResponse | null>(null);
  readonly historyLoading = signal(false);
  readonly historyError = signal<string | null>(null);
  readonly priceHistory = signal<readonly ResourceProductPriceHistory[]>([]);

  readonly pageIcon = faTags;
  readonly addIcon = faPlus;
  readonly priceIcon = faCoins;
  readonly historyIcon = faClockRotateLeft;
  readonly imageIcon = faImage;
  readonly refreshIcon = faRotate;

  readonly hasSpecificUot = computed(
    () => this.uot.modo() === 'ESPECIFICA' && (this.uot.selectedId() ?? 0) > 0,
  );
  readonly uotName = computed(() => this.uot.selected()?.nombre ?? 'UOT no seleccionada');

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.products();
    return this.products().filter((item) =>
      [item.codigo, item.nombre, item.categoria, item.unidadMedida].some(
        (value) => (value ?? '').toLowerCase().includes(query),
      ),
    );
  });

  ngOnInit(): void {
    if (this.hasSpecificUot()) this.load();
  }

  load(): void {
    const uotId = this.selectedUnitId();
    if (!uotId) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.api.listProducts(uotId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.products.set(items);
          const imageId = this.selectedForImages()?.productoId;
          if (imageId) this.selectedForImages.set(items.find((item) => item.productoId === imageId) ?? null);
          const historyId = this.historyProduct()?.productoId;
          if (historyId) this.historyProduct.set(items.find((item) => item.productoId === historyId) ?? null);
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  async create(): Promise<void> {
    if (!this.hasSpecificUot()) return;
    const result = await this.form.openCreate();
    if (result.saved) this.load();
  }

  async price(item: ResourceProductResponse): Promise<void> {
    if (!this.hasSpecificUot()) return;
    const result = await this.form.openPrice(item);
    if (result.saved) {
      this.load();
      if (this.historyProduct()?.productoId === item.productoId) this.loadHistory(item);
    }
  }

  toggleHistory(item: ResourceProductResponse): void {
    if (this.historyProduct()?.productoId === item.productoId) {
      this.historyProduct.set(null);
      this.priceHistory.set([]);
      this.historyError.set(null);
      return;
    }
    this.loadHistory(item);
  }

  loadHistory(item: ResourceProductResponse): void {
    const productId = item.productoId;
    const uotId = this.selectedUnitId();
    if (!productId || !uotId) return;

    this.historyProduct.set(item);
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.priceHistory.set([]);

    this.api.listProductPriceHistory(productId, uotId)
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: (items) => this.priceHistory.set(items),
        error: (error) => this.historyError.set(mapOpenApiError(error).message),
      });
  }

  selectImages(item: ResourceProductResponse): void {
    this.selectedForImages.set(
      this.selectedForImages()?.productoId === item.productoId ? null : item,
    );
  }

  imageIds(item: ResourceProductResponse): readonly number[] {
    return item.archivoPrincipalId ? [item.archivoPrincipalId] : [];
  }

  selectedUnitId(): number {
    return this.uot.selectedId() ?? 0;
  }
}
