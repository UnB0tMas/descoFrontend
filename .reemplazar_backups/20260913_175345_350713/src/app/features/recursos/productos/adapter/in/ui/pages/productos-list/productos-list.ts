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
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
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

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly products = signal<readonly ResourceProductResponse[]>([]);
  readonly search = signal('');
  readonly unitFilter = signal<number | null>(null);
  readonly selectedForImages = signal<ResourceProductResponse | null>(null);

  readonly pageIcon = faTags;
  readonly addIcon = faPlus;
  readonly priceIcon = faCoins;
  readonly imageIcon = faImage;
  readonly refreshIcon = faRotate;

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
    this.unitFilter.set(this.uot.selectedId());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const unitId =
      this.uot.modo() === 'GENERAL'
        ? this.unitFilter() ?? undefined
        : this.uot.selectedId() ?? undefined;

    this.api
      .listProducts(unitId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.products.set(items);
          const selectedId = this.selectedForImages()?.productoId;
          if (selectedId) {
            this.selectedForImages.set(
              items.find((item) => item.productoId === selectedId) ?? null,
            );
          }
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onUnitChange(value: string): void {
    const parsed = Number(value);
    this.unitFilter.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    this.selectedForImages.set(null);
    this.load();
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate();
    if (result.saved) this.load();
  }

  async price(item: ResourceProductResponse): Promise<void> {
    const result = await this.form.openPrice(item);
    if (result.saved) this.load();
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
    return (
      this.unitFilter() ??
      this.uot.selectedId() ??
      this.uot.memberships()[0]?.uotId ??
      0
    );
  }
}
