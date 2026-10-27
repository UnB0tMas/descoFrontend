import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faFilter, faGrip, faList, faMagnifyingGlass, faPen, faPlus, faRotate, faTags } from '@fortawesome/free-solid-svg-icons';
import { Subscription, finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
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
    PageHeaderComponent,
    ProductoFormComponent,
    ResourceImageComponent,
  ],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosListPage implements OnInit, OnDestroy {
  @ViewChild(ProductoFormComponent) private form!: ProductoFormComponent;

  private readonly api = inject(ResourceApiService);
  private readonly refs = inject(ReferenceDataService);
  readonly uot = inject(UotContextStore);
  private listRequest?: Subscription;
  private categoriesRequest?: Subscription;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<PageResult<ResourceProductListItemResponse>>(emptyPageResult(10));
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly unitFilter = signal<number | null>(null);
  readonly categoryFilter = signal('');
  readonly stateFilter = signal('ACTIVE');
  readonly categories = signal<readonly { code: string; label: string }[]>([]);
  readonly viewMode = signal<ProductViewMode>('table');
  readonly dataVersion = signal(0);
  readonly visibleItems = computed(() => this.result().items.slice(0, this.pageSize()));
  readonly totalPages = computed(() => Math.ceil(this.result().totalRecords / this.pageSize()));

  readonly pageIcon = faTags;
  readonly addIcon = faPlus;
  readonly refreshIcon = faRotate;
  readonly searchIcon = faMagnifyingGlass;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly filterIcon = faFilter;
  readonly tableIcon = faList;
  readonly cardsIcon = faGrip;

  readonly isGeneral = computed(() => this.uot.modo() === 'GENERAL');
  readonly units = computed(() => this.uot.memberships());
  readonly contextUotId = computed(() => this.isGeneral() ? this.unitFilter() : this.uot.selectedId());
  readonly contextUotName = computed(() => {
    const id = this.contextUotId();
    return id ? this.units().find((unit) => unit.uotId === id)?.nombre ?? 'UOT' : 'Todas mis UOT';
  });

  ngOnInit(): void {
    this.unitFilter.set(this.isGeneral() ? null : this.uot.selectedId());
    this.categoriesRequest = this.refs.catalog('CATEGORIA_PRODUCTO').subscribe({
      next: (items) => this.categories.set(items.map((item) => ({ code: item.code, label: item.label }))),
    });
    this.load(1, 10);
  }

  ngOnDestroy(): void {
    this.listRequest?.unsubscribe();
    this.categoriesRequest?.unsubscribe();
  }

  load(page = this.currentPage(), size = this.pageSize()): void {
    const requestedPage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
    const requestedSize = [10, 20, 50, 100].includes(size) ? size : 10;

    // La petición anterior no puede sobrescribir el tamaño ni la página elegidos.
    this.listRequest?.unsubscribe();
    this.currentPage.set(requestedPage);
    this.pageSize.set(requestedSize);
    this.loading.set(true);
    this.errorMessage.set(null);

    const active = this.stateFilter() === 'ALL' ? undefined : this.stateFilter() === 'ACTIVE';
    this.listRequest = this.api.listProducts({
      uotId: this.contextUotId() ?? undefined,
      search: this.search(),
      category: this.categoryFilter() || undefined,
      active,
      page: requestedPage,
      size: requestedSize,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => {
        const totalRecords = Math.max(0, Number(response.totalRecords) || 0);
        this.result.set({
          items: response.items.slice(0, requestedSize),
          page: requestedPage,
          size: requestedSize,
          totalRecords,
          totalPages: Math.ceil(totalRecords / requestedSize),
        });
        this.dataVersion.update((version) => version + 1);
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }

  applyFilters(): void {
    this.load(1, this.pageSize());
  }

  onUnitChange(value: string): void {
    const id = Number(value);
    this.unitFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.applyFilters();
  }

  changePageSize(size: number): void {
    this.load(1, size);
  }

  setView(mode: ProductViewMode): void {
    this.viewMode.set(mode);
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate(this.contextUotId() ?? undefined);
    if (result.saved) this.load(1);
  }

  async edit(item: ResourceProductListItemResponse): Promise<void> {
    const result = await this.form.openEdit(item, Number(item.uotId ?? this.contextUotId() ?? 0));
    if (result.saved) this.load();
  }

  rowKey(item: ResourceProductListItemResponse): string {
    return `${this.dataVersion()}-${item.productoId ?? 0}-${item.uotId ?? 0}`;
  }

  detailQuery(item: ResourceProductListItemResponse): { uotId: number } {
    return { uotId: Number(item.uotId ?? this.contextUotId() ?? 0) };
  }
}
