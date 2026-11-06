import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBan,
  faLayerGroup,
  faPen,
  faPlus,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { CatalogosProductivos, PRODUCTIVE_CATALOG_TABS, ProductiveCatalogType } from '../../../../../catalogos-productivos';
import { loadAllAdminPages } from '../../../../../../shared/admin-reference.util';
import { PageResult } from '../../../../../../../../shared/models/page-result.model';
import { DeshabilitarItemCatalogoUseCase } from '../../../../../application/use-case/deshabilitar-item-catalogo.use-case';
import { ListarCatalogosUseCase } from '../../../../../application/use-case/listar-catalogos.use-case';
import {
  CATALOGOS_ADMINISTRABLES,
  CATALOGOS_AGRUPADOS,
  Catalogo,
} from '../../../../../domain/catalogo.model';
import { CatalogoItem } from '../../../../../domain/catalogo-item.model';
import { CatalogoDetailComponent } from '../catalogo-detail/catalogo-detail';

type CatalogStatusView = 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-catalogos-list-page',
  standalone: true,
  imports: [
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    PageHeaderComponent,
    CatalogoDetailComponent,
    CatalogosProductivos,
  ],
  templateUrl: './catalogos-list.html',
  styleUrl: './catalogos-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogosListPage implements OnInit {
  @ViewChild(CatalogoDetailComponent)
  private detailModal!: CatalogoDetailComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirmDialog!: ActionConfirmDialogComponent;

  @ViewChild(CatalogosProductivos)
  productivos?: CatalogosProductivos;

  private readonly route = inject(ActivatedRoute);
  private readonly listUseCase = inject(ListarCatalogosUseCase);
  private readonly disableUseCase = inject(DeshabilitarItemCatalogoUseCase);
  private readonly references = inject(ReferenceDataService);
  private readonly toast = inject(ToastService);

  private readonly routeData = this.route.snapshot.data;
  readonly fixedCatalogCode = this.validCatalogCode(this.readRouteText('catalogCode'));
  readonly pageTitle = this.readRouteText('pageTitle') ?? 'Catálogos';
  readonly pageSubtitle =
    this.readRouteText('pageSubtitle') ??
    'Administra los valores utilizados por el sistema.';
  readonly createLabel = this.readRouteText('createLabel') ?? 'Nuevo valor';
  readonly entityLabel = this.readRouteText('entityLabel') ?? 'Valor';
  readonly emptyTitle = this.readRouteText('emptyTitle') ?? 'Sin valores registrados';
  readonly emptyMessage =
    this.readRouteText('emptyMessage') ?? 'No hay valores registrados en este catálogo.';

  readonly productivosVisible = signal(false);
  readonly productiveType = signal<ProductiveCatalogType>('CULTIVO');
  readonly productiveTabs = PRODUCTIVE_CATALOG_TABS;
  readonly loading = signal(true);
  readonly disablingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly catalogCode = signal(
    this.fixedCatalogCode ?? CATALOGOS_ADMINISTRABLES[0].codigo,
  );
  readonly allItems = signal<readonly CatalogoItem[]>([]);
  readonly statusView = signal<CatalogStatusView>('ACTIVE');
  readonly search = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  readonly catalogs = CATALOGOS_ADMINISTRABLES;
  readonly catalogGroups = CATALOGOS_AGRUPADOS;
  readonly pageIcon = faLayerGroup;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly disableIcon = faBan;
  readonly refreshIcon = faRotate;

  readonly selectedCatalog = computed<Catalogo>(
    () =>
      this.catalogs.find((item) => item.codigo === this.catalogCode()) ??
      this.catalogs[0],
  );

  readonly selectedGroup = computed(
    () =>
      this.catalogGroups.find(
        (group) => group.codigo === this.selectedCatalog().grupoCodigo,
      ) ?? this.catalogGroups[0],
  );

  readonly activeCount = computed(
    () => this.allItems().filter((item) => item.estado).length,
  );

  readonly inactiveCount = computed(
    () => this.allItems().filter((item) => !item.estado).length,
  );

  readonly filteredItems = computed<readonly CatalogoItem[]>(() => {
    const text = this.search().trim().toLocaleLowerCase('es');
    return this.allItems().filter((item) => {
      if (this.statusView() === 'ACTIVE' ? !item.estado : item.estado) {
        return false;
      }
      if (!text) {
        return true;
      }
      return [item.nombre, item.codigo, item.descripcion ?? ''].some((value) =>
        value.toLocaleLowerCase('es').includes(text),
      );
    });
  });

  readonly result = computed<PageResult<CatalogoItem>>(() => {
    const items = this.filteredItems();
    const size = Math.max(1, this.pageSize());
    const totalRecords = items.length;
    const totalPages =
      totalRecords === 0
        ? 0
        : Math.ceil(totalRecords / size);
    const page =
      totalPages === 0
        ? 1
        : Math.min(Math.max(1, this.currentPage()), totalPages);
    const start = (page - 1) * size;

    return {
      items: items.slice(start, start + size),
      page,
      size,
      totalRecords,
      totalPages,
    };
  });

  ngOnInit(): void {
    this.productivosVisible.set(this.route.snapshot.queryParamMap.get('seccion') === 'productivos');
    if (!this.productivosVisible()) this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    loadAllAdminPages((page, size) =>
      this.listUseCase.execute({
        catalogo: this.catalogCode(),
        page,
        size,
      }),
    )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.allItems.set(items);
          this.currentPage.set(1);
        },
        error: (error) => {
          this.allItems.set([]);
          this.errorMessage.set(mapOpenApiError(error).message);
        },
      });
  }

  goCatalogRoot(): void {
    if (this.productivosVisible()) this.changeGroup(this.catalogGroups[0].codigo);
    else if (this.catalogGroups[0].catalogos[0]) this.changeCatalog(this.catalogGroups[0].catalogos[0].codigo);
  }

  refresh(): void {
    if (this.productivosVisible()) {
      this.productivos?.load();
    } else {
      this.load();
    }
  }

  changeProductiveType(type: ProductiveCatalogType): void {
    this.productiveType.set(type);
  }

  changeCatalog(value: string): void {
    if (this.fixedCatalogCode) {
      return;
    }

    const next = this.validCatalogCode(value);
    if (!next || next === this.catalogCode()) {
      return;
    }

    this.productivosVisible.set(false);
    this.catalogCode.set(next);
    this.statusView.set('ACTIVE');
    this.search.set('');
    this.currentPage.set(1);
    this.load();
  }

  changeGroup(groupCode: string): void {
    if (groupCode === 'PRODUCTIVOS') {
      this.search.set('');
      this.currentPage.set(1);
      this.productivosVisible.set(true);
      return;
    }
    const wasProductivos = this.productivosVisible();
    if (wasProductivos) {
      this.productivosVisible.set(false);
      this.search.set('');
      this.currentPage.set(1);
    }
    if (this.fixedCatalogCode) {
      return;
    }

    const group = this.catalogGroups.find((item) => item.codigo === groupCode);
    const firstCatalog = group?.catalogos[0];

    if (!firstCatalog || (!wasProductivos && group?.codigo === this.selectedGroup().codigo)) {
      return;
    }

    if (wasProductivos && firstCatalog.codigo === this.catalogCode()) { this.load(); return; }
    this.changeCatalog(firstCatalog.codigo);
  }

  changeStatus(view: CatalogStatusView): void {
    if (view === this.statusView()) {
      return;
    }

    this.statusView.set(view);
    this.currentPage.set(1);
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    this.currentPage.set(Math.max(1, page));
  }

  changePageSize(size: number): void {
    this.pageSize.set(Math.max(1, size));
    this.currentPage.set(1);
  }

  async create(): Promise<void> {
    if (this.productivosVisible()) {
      this.productivos?.create();
      return;
    }
    const result = await this.detailModal.open(this.selectedCatalog());

    if (result.saved) {
      this.statusView.set('ACTIVE');
      this.invalidateSelectedReference();
      this.load();
    }
  }

  async edit(item: CatalogoItem): Promise<void> {
    if (!item.estado) {
      return;
    }

    const result = await this.detailModal.open(this.selectedCatalog(), item);

    if (result.saved) {
      this.invalidateSelectedReference();
      this.load();
    }
  }

  async disable(item: CatalogoItem): Promise<void> {
    if (!item.estado || this.disablingId()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: `Deshabilitar ${this.entityLabel.toLowerCase()}`,
      message: `“${item.nombre}” dejará de estar disponible para nuevos registros.`,
      tone: 'danger',
      confirmLabel: 'Deshabilitar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo.',
      minimumReasonLength: 5,
    });

    if (!confirmation.confirmed || !confirmation.reason) {
      return;
    }

    this.disablingId.set(item.id);

    this.disableUseCase
      .execute(item.id, this.catalogCode(), confirmation.reason)
      .pipe(finalize(() => this.disablingId.set(null)))
      .subscribe({
        next: () => {
          this.references.invalidateCatalog(this.catalogCode());
          this.toast.success(`${this.entityLabel} deshabilitado`);
          this.load();
        },
        error: (error) =>
          this.toast.error(
            `No se pudo deshabilitar ${this.entityLabel.toLowerCase()}`,
            mapOpenApiError(error).message,
          ),
      });
  }

  private readRouteText(key: string): string | null {
    const value = this.routeData[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private validCatalogCode(value: string | null): string | null {
    if (!value) {
      return null;
    }

    return CATALOGOS_ADMINISTRABLES.some((catalog) => catalog.codigo === value)
      ? value
      : null;
  }

  private invalidateSelectedReference(): void {
    this.references.invalidateCatalog(this.catalogCode());
  }
}
