import { DatePipe, DecimalPipe } from '@angular/common';
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
  faArrowRightArrowLeft,
  faBoxOpen,
  faBoxesStacked,
  faBookOpen,
  faPlus,
  faRotate,
  faShareNodes,
  faWarehouse,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ResourceKardexResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceKardexResponse';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { ResourceStockResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import {
  AlmacenOperationFormComponent,
  WarehouseOperationOptions,
} from '../almacen-operation-form/almacen-operation-form';

type WarehouseTab = 'warehouses' | 'stock' | 'kardex';

@Component({
  selector: 'app-almacenes-list-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    AlmacenOperationFormComponent,
  ],
  templateUrl: './almacenes-list.html',
  styleUrl: './almacenes-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenesListPage implements OnInit {
  @ViewChild(AlmacenOperationFormComponent)
  private form!: AlmacenOperationFormComponent;

  private readonly api = inject(ResourceApiService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly activeTab = signal<WarehouseTab>('warehouses');
  readonly unitFilter = signal<number | null>(null);
  readonly warehouseFilter = signal<number | null>(null);
  readonly productFilter = signal<number | null>(null);

  readonly warehouses = signal<readonly ResourceWarehouseResponse[]>([]);
  readonly products = signal<readonly ResourceProductListItemResponse[]>([]);
  readonly stock = signal<readonly ResourceStockResponse[]>([]);
  readonly kardex = signal<readonly ResourceKardexResponse[]>([]);

  readonly pageIcon = faWarehouse;
  readonly warehouseIcon = faWarehouse;
  readonly stockIcon = faBoxesStacked;
  readonly configureIcon = faBoxOpen;
  readonly kardexIcon = faBookOpen;
  readonly addIcon = faPlus;
  readonly shareIcon = faShareNodes;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly refreshIcon = faRotate;

  readonly filteredStock = computed(() => {
    const warehouseId = this.warehouseFilter();
    const productId = this.productFilter();
    return this.stock().filter(
      (item) =>
        (!warehouseId || item.almacenId === warehouseId) &&
        (!productId || item.productoId === productId),
    );
  });

  ngOnInit(): void {
    this.unitFilter.set(this.uot.selectedId());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    const unitId = this.queryUnitId();

    forkJoin({
      warehouses: this.api.listWarehouses(unitId),
      products: this.api.listAllProducts(unitId),
      stock: this.api.listStock(unitId),
      kardex: this.api.listKardex(
        unitId,
        this.warehouseFilter() ?? undefined,
        this.productFilter() ?? undefined,
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ warehouses, products, stock, kardex }) => {
          this.warehouses.set(warehouses);
          this.products.set(products);
          this.stock.set(stock);
          this.kardex.set(kardex);
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  setTab(tab: WarehouseTab): void {
    this.activeTab.set(tab);
  }

  onUnitChange(value: string): void {
    const parsed = Number(value);
    this.unitFilter.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    this.warehouseFilter.set(null);
    this.productFilter.set(null);
    this.load();
  }

  onWarehouseChange(value: string): void {
    const parsed = Number(value);
    this.warehouseFilter.set(
      Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    );
    if (this.activeTab() === 'kardex') this.loadKardex();
  }

  onProductChange(value: string): void {
    const parsed = Number(value);
    this.productFilter.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    if (this.activeTab() === 'kardex') this.loadKardex();
  }

  async createWarehouse(): Promise<void> {
    const result = await this.form.openCreate(this.options());
    if (result.saved) this.load();
  }

  async share(warehouse: ResourceWarehouseResponse): Promise<void> {
    const result = await this.form.openShare(warehouse, this.options());
    if (result.saved) this.load();
  }

  async configureProduct(warehouse: ResourceWarehouseResponse): Promise<void> {
    const result = await this.form.openConfigure(
      warehouse,
      this.options(),
      this.queryUnitId(),
    );
    if (result.saved) {
      this.activeTab.set('stock');
      this.warehouseFilter.set(warehouse.almacenId ?? null);
      this.load();
    }
  }

  async movement(): Promise<void> {
    const result = await this.form.openMovement(this.options());
    if (result.saved) this.load();
  }

  stockTone(item: ResourceStockResponse): string {
    const available = item.stockDisponible ?? 0;
    const minimum = item.stockMinimo ?? 0;
    if (available <= 0) return 'stock-value stock-value--danger';
    if (minimum > 0 && available <= minimum) return 'stock-value stock-value--warning';
    return 'stock-value stock-value--ok';
  }

  private loadKardex(): void {
    this.api
      .listKardex(
        this.queryUnitId(),
        this.warehouseFilter() ?? undefined,
        this.productFilter() ?? undefined,
      )
      .subscribe({
        next: (items) => this.kardex.set(items),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private queryUnitId(): number | undefined {
    return this.uot.modo() === 'GENERAL'
      ? this.unitFilter() ?? undefined
      : this.uot.selectedId() ?? undefined;
  }

  private options(): WarehouseOperationOptions {
    return {
      warehouses: this.warehouses(),
      products: this.products(),
      stock: this.stock(),
    };
  }
}
