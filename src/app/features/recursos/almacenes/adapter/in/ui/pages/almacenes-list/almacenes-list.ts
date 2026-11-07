import { ResourceDatePipe } from '../../../../../../../../shared/formatting/resource-date.pipe';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  faArrowLeft,
  faEye,
  faPen,
  faArrowDown,
  faFilter,
  faArrowUp,
  faMagnifyingGlass,
  faPlus,
  faRotate,
  faShareNodes,
  faWarehouse, faSliders, faPowerOff,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, of, firstValueFrom } from 'rxjs';
import { ProductoFormComponent } from '../../../../../../productos/adapter/in/ui/pages/producto-form/producto-form';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ResourceKardexResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceKardexResponse';
import { ResourceProductListItemResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductListItemResponse';
import { ResourceStockResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { AlmacenProductoFormComponent } from '../almacen-producto-form/almacen-producto-form';
import { ResourceApiService, WarehouseProductOperation } from '../../../../../../shared/resource-api.service';
import {
  AlmacenOperationFormComponent,
  WarehouseOperationOptions,
} from '../almacen-operation-form/almacen-operation-form';

type WarehouseTab = 'warehouses' | 'stock' | 'kardex';

@Component({
  selector: 'app-almacenes-list-page',
  standalone: true,
  imports: [
    ResourceDatePipe,
    DecimalPipe,
    FaIconComponent,
    RouterLink,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PaginatorComponent,
    PageHeaderComponent,
    AlmacenOperationFormComponent,
    ProductoFormComponent, AlmacenProductoFormComponent,
  ],
  templateUrl: './almacenes-list.html',
  styleUrl: './almacenes-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenesListPage implements OnInit {
  @ViewChild(AlmacenOperationFormComponent)
  private form!: AlmacenOperationFormComponent;
  @ViewChild(ProductoFormComponent) private priceForm!:ProductoFormComponent;

  @ViewChild(AlmacenProductoFormComponent) private productConfiguration!:AlmacenProductoFormComponent;
  readonly settingsIcon=faSliders;readonly stateIcon=faPowerOff;

  private readonly api = inject(ResourceApiService);
  private readonly permissions = inject(PermissionService);
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
  readonly filterProducts = computed(() => {
    const warehouseId = this.warehouseFilter();
    const productIds = new Set(this.stock()
      .filter(row => !warehouseId || row.almacenId === warehouseId)
      .map(row => row.productoId));
    return this.products().filter(product => productIds.has(product.productoId));
  });
  readonly kardex = signal<readonly ResourceKardexResponse[]>([]);
  readonly detailWarehouse = signal<ResourceWarehouseResponse | null>(null);
  readonly detailStock = signal<readonly ResourceStockResponse[]>([]);
  readonly detailMovements = signal<readonly ResourceKardexResponse[]>([]);
  readonly detailLoading = signal(false);
  readonly detailKardexLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly detailSearch = signal('');
  readonly detailSearchDraft = signal('');
  readonly detailTab = signal<'products' | 'kardex'>('products');
  readonly detailProductId = signal<number | null>(null);

  // Los cuatro listados comparten el paginador oficial de DESCO.
  readonly detailStockPage = signal(1);
  readonly detailStockPageSize = signal(10);
  readonly detailKardexPage = signal(1);
  readonly detailKardexPageSize = signal(10);
  readonly stockPage = signal(1);
  readonly stockPageSize = signal(10);
  readonly kardexPage = signal(1);
  readonly kardexPageSize = signal(10);


  readonly pageIcon = faWarehouse;
  readonly warehouseIcon = faWarehouse;
  readonly stockIcon = faBoxesStacked;
  readonly configureIcon = faBoxOpen;
  readonly kardexIcon = faBookOpen;
  readonly addIcon = faPlus;
  readonly shareIcon = faShareNodes;
  readonly movementIcon = faArrowRightArrowLeft;
  readonly entryIcon = faArrowDown;
  readonly exitIcon = faArrowUp;
  readonly refreshIcon = faRotate;
  readonly backIcon = faArrowLeft;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly searchIcon = faMagnifyingGlass;
  readonly filterIcon = faFilter;

  readonly visibleDetailStock = computed(() => {
    const query = this.detailSearch().trim().toLocaleLowerCase();
    return this.detailStock().filter((row) => !query ||
      `${row.producto ?? ''} ${this.productCode(row.productoId)}`.toLocaleLowerCase().includes(query));
  });
  readonly visibleDetailKardex = computed(() => this.detailMovements().filter(
    (row) => !this.detailProductId() || row.productoId === this.detailProductId(),
  ));
  readonly detailStockTotalPages = computed(() =>
    Math.ceil(this.visibleDetailStock().length / this.detailStockPageSize()),
  );
  readonly detailKardexTotalPages = computed(() =>
    Math.ceil(this.visibleDetailKardex().length / this.detailKardexPageSize()),
  );
  readonly pagedDetailStock = computed(() => this.pageItems(
    this.visibleDetailStock(), this.detailStockPage(), this.detailStockPageSize(),
  ));
  readonly pagedDetailKardex = computed(() => this.pageItems(
    this.visibleDetailKardex(), this.detailKardexPage(), this.detailKardexPageSize(),
  ));

  readonly detailAlerts = computed(() => this.detailStock().filter((row) =>
    row.estado!==false && (row.stockMinimo ?? 0) > 0 && (row.stockDisponible ?? 0) <= (row.stockMinimo ?? 0),
  ).length);

  readonly filteredStock = computed(() => {
    const warehouseId = this.warehouseFilter();
    const productId = this.productFilter();
    return this.stock().filter(
      (item) =>
        (!warehouseId || item.almacenId === warehouseId) &&
        (!productId || item.productoId === productId),
    );
  });

  readonly stockTotalPages = computed(() =>
    Math.ceil(this.filteredStock().length / this.stockPageSize()),
  );
  readonly kardexTotalPages = computed(() =>
    Math.ceil(this.kardex().length / this.kardexPageSize()),
  );
  readonly pagedStock = computed(() => this.pageItems(
    this.filteredStock(), this.stockPage(), this.stockPageSize(),
  ));
  readonly pagedKardex = computed(() => this.pageItems(
    this.kardex(), this.kardexPage(), this.kardexPageSize(),
  ));

  private pageItems<T>(rows: readonly T[], page: number, size: number): readonly T[] {
    const start = (Math.max(1, page) - 1) * size;
    return rows.slice(start, start + size);
  }

  private validPage(target: number, pages: number): number {
    return Math.max(1, Math.min(Math.trunc(target), Math.max(1, pages)));
  }

  changeDetailStockPage(page: number): void {
    this.detailStockPage.set(this.validPage(page, this.detailStockTotalPages()));
  }
  changeDetailStockPageSize(size: number): void {
    this.detailStockPageSize.set(size);
    this.detailStockPage.set(1);
  }
  changeDetailKardexPage(page: number): void {
    this.detailKardexPage.set(this.validPage(page, this.detailKardexTotalPages()));
  }
  changeDetailKardexPageSize(size: number): void {
    this.detailKardexPageSize.set(size);
    this.detailKardexPage.set(1);
  }
  changeStockPage(page: number): void {
    this.stockPage.set(this.validPage(page, this.stockTotalPages()));
  }
  changeStockPageSize(size: number): void {
    this.stockPageSize.set(size);
    this.stockPage.set(1);
  }
  changeKardexPage(page: number): void {
    this.kardexPage.set(this.validPage(page, this.kardexTotalPages()));
  }
  changeKardexPageSize(size: number): void {
    this.kardexPageSize.set(size);
    this.kardexPage.set(1);
  }

  applyDetailSearch(): void {
    this.onDetailSearch(this.detailSearchDraft());
  }

  onDetailSearch(value: string): void {
    this.detailSearch.set(value);
    this.detailStockPage.set(1);
  }

  stockStatus(row: ResourceStockResponse): 'Agotado' | 'Reponer' | 'Disponible' | 'Inactivo' {
    if(row.estado===false)return 'Inactivo';
    const available = row.stockDisponible ?? 0;
    if (available <= 0) return 'Agotado';
    return (row.stockMinimo ?? 0) > 0 && available <= (row.stockMinimo ?? 0)
      ? 'Reponer' : 'Disponible';
  }

  ngOnInit(): void {
    this.unitFilter.set(this.uot.isGeneral() ? null : this.uot.selectedId());
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
      kardex: this.permissions.has('ALMACENES_KARDEX')
        ? this.api.listKardex(unitId, this.warehouseFilter() ?? undefined, this.productFilter() ?? undefined)
        : of([] as ResourceKardexResponse[]),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ warehouses, products, stock, kardex }) => {
          this.warehouses.set(warehouses);
          this.products.set(products);
          this.stock.set(stock);
          this.kardex.set(kardex);
          if (this.reconcileProductFilter()) this.loadKardex();
          this.stockPage.set(this.validPage(this.stockPage(), this.stockTotalPages()));
          this.kardexPage.set(this.validPage(this.kardexPage(), this.kardexTotalPages()));
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
    this.stockPage.set(1);
    this.kardexPage.set(1);
    this.warehouseFilter.set(null);
    this.productFilter.set(null);
    this.closeWarehouseDetail();
    this.load();
  }

  onWarehouseChange(value: string): void {
    const parsed = Number(value);
    this.warehouseFilter.set(
      Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    );
    this.reconcileProductFilter();
    this.stockPage.set(1);
    this.kardexPage.set(1);
    if (this.activeTab() === 'kardex') this.loadKardex();
  }

  onProductChange(value: string): void {
    const parsed = Number(value);
    this.productFilter.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    this.reconcileProductFilter();
    this.stockPage.set(1);
    this.kardexPage.set(1);
    if (this.activeTab() === 'kardex') this.loadKardex();
  }

  private reconcileProductFilter(): boolean {
    const productId = this.productFilter();
    if (productId && !this.filterProducts().some(product => product.productoId === productId)) {
      this.productFilter.set(null);
      return true;
    }
    return false;
  }

  async createWarehouse(): Promise<void> {
    const result = await this.form.openCreate(this.options(), this.queryUnitId());
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
      if (this.detailWarehouse()) {
        this.refreshAfterOperation();
      } else {
        this.activeTab.set('stock');
        this.warehouseFilter.set(warehouse.almacenId ?? null);
        this.load();
      }
    }
  }

  canManageDetail():boolean{return this.permissions.has('ALMACENES_MOVIMIENTO')&&this.detailUotId()===this.detailWarehouse()?.uotPropietariaId;}
  productUotId(item: ResourceStockResponse): number {
    return this.queryUnitId() ?? this.warehouses().find(w => w.almacenId === item.almacenId)?.uotPropietariaId ?? 0;
  }
  canManageProduct(item: ResourceStockResponse): boolean {
    return this.permissions.has('ALMACENES_MOVIMIENTO') && this.productUotId(item) > 0
      && this.productUotId(item) === this.warehouses().find(w => w.almacenId === item.almacenId)?.uotPropietariaId;
  }
  managementBlock(item:ResourceStockResponse,operation:WarehouseProductOperation):string{
    if(!this.canManageProduct(item))return 'Solo la UOT propietaria puede modificar esta configuración.';
    if(operation==='DESACTIVAR'||operation==='RETIRAR'){
      if((item.stockActual??0)!==0||(item.stockReservado??0)!==0)return 'El producto conserva stock o reservas.';
      if(operation==='RETIRAR'&&item.tieneHistorial)return 'Tiene historial: desactívelo cuando su saldo sea cero.';
    }
    return '';
  }
  async manageProduct(item:ResourceStockResponse,operation:WarehouseProductOperation):Promise<void>{
    if(this.managementBlock(item,operation))return;
    if(await this.productConfiguration.show(item,this.productUotId(item),operation))this.refreshAfterOperation();
  }

  canSetSalePrice(id?:number):boolean{return this.products().some(product=>product.productoId===id&&product.permiteVenta===true&&product.estado!==false);}

  async editSalePrice(item:ResourceStockResponse):Promise<void>{
    if(!item.productoId||!this.permissions.has('PRODUCTOS_PRECIO'))return;
    try{
      const product=await firstValueFrom(this.api.getProduct(item.productoId,this.detailUotId()));
      if(!product||product.permiteVenta!==true)return;
      const result=await this.priceForm.openPrice(product,this.detailUotId());
      if(result.saved)this.refreshAfterOperation();
    }catch(error){this.detailError.set(mapOpenApiError(error).message);}
  }

  canMoveNature(nature: 'E' | 'S'): boolean {
    return this.warehouses().some((warehouse) => nature === 'E'
      ? warehouse.permiteEntrada !== false : warehouse.permiteSalida !== false);
  }

  async movement(nature: 'E' | 'S'): Promise<void> {
    const result = await this.form.openMovement(this.options(), this.queryUnitId(), { nature });
    if (result.saved) this.refreshAfterOperation();
  }

  openWarehouseDetail(warehouse: ResourceWarehouseResponse): void {
    if (!warehouse.almacenId) return;
    this.detailWarehouse.set(warehouse);
    this.detailTab.set('products');
    this.detailSearch.set('');
    this.detailSearchDraft.set('');
    this.detailStockPage.set(1);
    this.detailKardexPage.set(1);
    this.detailProductId.set(null);
    this.detailMovements.set([]);
    this.reloadDetailStock();
  }

  closeWarehouseDetail(): void {
    this.detailWarehouse.set(null);
    this.detailStock.set([]);
    this.detailMovements.set([]);
    this.detailProductId.set(null);
    this.detailStockPage.set(1);
    this.detailKardexPage.set(1);
    this.detailError.set(null);
  }

  detailUotId(): number {
    const warehouse = this.detailWarehouse();
    return this.queryUnitId() ?? warehouse?.uotPropietariaId ?? 0;
  }

  reloadDetailStock(): void {
    const warehouse = this.detailWarehouse();
    if (!warehouse?.almacenId) return;
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.api.listStock(this.detailUotId() || undefined, warehouse.almacenId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (rows) => {
          if (this.detailWarehouse()?.almacenId === warehouse.almacenId) {
            this.detailStock.set(rows.filter((row) => row.almacenId === warehouse.almacenId));
            this.detailStockPage.set(this.validPage(
              this.detailStockPage(), this.detailStockTotalPages(),
            ));
          }
        },
        error: (error) => this.detailError.set(mapOpenApiError(error).message),
      });
  }

  selectDetailTab(tab: 'products' | 'kardex'): void {
    if (tab === 'kardex' && !this.permissions.has('ALMACENES_KARDEX')) return;
    this.detailTab.set(tab);
    if (tab === 'kardex') this.detailKardexPage.set(1);
    if (tab === 'kardex') this.reloadDetailKardex();
  }

  reloadDetailKardex(productId: number | null = null): void {
    const warehouse = this.detailWarehouse();
    if (!warehouse?.almacenId || !this.permissions.has('ALMACENES_KARDEX')) return;
    this.detailProductId.set(productId);
    this.detailKardexPage.set(1);
    this.detailTab.set('kardex');
    this.detailKardexLoading.set(true);
    this.detailError.set(null);
    this.api.listKardex(this.detailUotId() || undefined, warehouse.almacenId, productId ?? undefined)
      .pipe(finalize(() => this.detailKardexLoading.set(false)))
      .subscribe({
        next: (rows) => {
          if (this.detailWarehouse()?.almacenId === warehouse.almacenId) {
            this.detailMovements.set(rows.filter((row) => row.almacenId === warehouse.almacenId));
            this.detailKardexPage.set(this.validPage(
              this.detailKardexPage(), this.detailKardexTotalPages(),
            ));
          }
        },
        error: (error) => this.detailError.set(mapOpenApiError(error).message),
      });
  }

  async detailMovement(row: ResourceStockResponse, nature: 'E' | 'S'): Promise<void> {
    const warehouse = this.detailWarehouse();
    if (!warehouse?.almacenId || !row.productoId) return;
    if (nature === 'S' && (!warehouse.permiteSalida || (row.stockDisponible ?? 0) <= 0)) return;
    if (nature === 'E' && warehouse.permiteEntrada === false) return;
    const result = await this.form.openMovement(this.options(), this.detailUotId(), {
      warehouseId: warehouse.almacenId, productId: row.productoId, nature,
    });
    if (result.saved) this.refreshAfterOperation();
  }

  private refreshAfterOperation(): void {
    this.load();
    if (this.detailWarehouse()) {
      this.reloadDetailStock();
      if (this.detailTab() === 'kardex') this.reloadDetailKardex(this.detailProductId());
    }
  }

  productCode(id?: number): string {
    return this.products().find((item) => item.productoId === id)?.codigo ?? '';
  }

  stockUot(item: ResourceStockResponse): string {
    const warehouse = this.warehouses().find(
      (candidate) => candidate.almacenId === item.almacenId,
    );

    return warehouse?.uotPropietaria ?? '—';
  }

  stockTone(item: ResourceStockResponse): string {
    if(item.estado===false)return 'stock-value';
    const available = item.stockDisponible ?? 0;
    const minimum = item.stockMinimo ?? 0;
    if (available <= 0) return 'stock-value stock-value--danger';
    if (minimum > 0 && available <= minimum) return 'stock-value stock-value--warning';
    return 'stock-value stock-value--ok';
  }

  private loadKardex(): void {
    if (!this.permissions.has('ALMACENES_KARDEX')) return;
    this.api
      .listKardex(
        this.queryUnitId(),
        this.warehouseFilter() ?? undefined,
        this.productFilter() ?? undefined,
      )
      .subscribe({
        next: (items) => {
          this.kardex.set(items);
          this.kardexPage.set(this.validPage(this.kardexPage(), this.kardexTotalPages()));
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private queryUnitId(): number | undefined {
    return this.uot.isGeneral()
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
