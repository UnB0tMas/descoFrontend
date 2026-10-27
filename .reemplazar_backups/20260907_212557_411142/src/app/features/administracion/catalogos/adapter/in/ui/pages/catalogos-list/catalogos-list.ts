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
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import {
  PageResult,
  emptyPageResult,
} from '../../../../../../../../shared/models/page-result.model';
import { DeshabilitarItemCatalogoUseCase } from '../../../../../application/use-case/deshabilitar-item-catalogo.use-case';
import { ListarCatalogosUseCase } from '../../../../../application/use-case/listar-catalogos.use-case';
import {
  CATALOGOS_ADMINISTRABLES,
  Catalogo,
} from '../../../../../domain/catalogo.model';
import { CatalogoItem } from '../../../../../domain/catalogo-item.model';
import { CatalogoDetailComponent } from '../catalogo-detail/catalogo-detail';

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

  private readonly route = inject(ActivatedRoute);
  private readonly listUseCase = inject(ListarCatalogosUseCase);
  private readonly disableUseCase = inject(DeshabilitarItemCatalogoUseCase);
  private readonly toast = inject(ToastService);

  private readonly routeData = this.route.snapshot.data;
  readonly catalogs = CATALOGOS_ADMINISTRABLES;

  readonly fixedCatalogCode = this.resolveFixedCatalogCode();
  readonly fixedCatalog = this.fixedCatalogCode !== null;

  readonly pageTitle = this.routeText('pageTitle', 'Catálogos');
  readonly pageSubtitle = this.routeText(
    'pageSubtitle',
    'Administra los valores maestros utilizados por los procesos del sistema.',
  );
  readonly createLabel = this.routeText('createLabel', 'Nuevo valor');
  readonly entityLabel = this.routeText('entityLabel', 'Valor de catálogo');
  readonly emptyTitle = this.routeText(
    'emptyTitle',
    'Sin valores registrados',
  );
  readonly emptyMessage = this.routeText(
    'emptyMessage',
    'Este catálogo todavía no tiene valores disponibles.',
  );

  readonly loading = signal(true);
  readonly disablingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly catalogCode = signal(
    this.fixedCatalogCode ?? CATALOGOS_ADMINISTRABLES[0].codigo,
  );
  readonly result = signal<PageResult<CatalogoItem>>(emptyPageResult(20));

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

  readonly showDescription = computed(
    () => this.selectedCatalog().admiteDescripcion !== false,
  );

  ngOnInit(): void {
    this.load(1);
  }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.listUseCase
      .execute({
        catalogo: this.catalogCode(),
        page,
        size,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  changeCatalog(value: string): void {
    if (this.fixedCatalog || !value || value === this.catalogCode()) {
      return;
    }

    this.catalogCode.set(value);
    this.load(1);
  }

  async create(): Promise<void> {
    const result = await this.detailModal.open(this.selectedCatalog());

    if (result.saved) {
      this.load(1);
    }
  }

  async edit(item: CatalogoItem): Promise<void> {
    const result = await this.detailModal.open(this.selectedCatalog(), item);

    if (result.saved) {
      this.load();
    }
  }

  async disable(item: CatalogoItem): Promise<void> {
    if (item.enUso || this.disablingId()) {
      return;
    }

    const confirmation = await this.confirmDialog.show({
      title: `Deshabilitar ${this.entityLabel.toLowerCase()}`,
      message: `El valor "${item.nombre}" dejará de estar disponible para nuevos registros.`,
      tone: 'danger',
      confirmLabel: 'Deshabilitar',
      cancelLabel: 'Cancelar',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica por qué debe deshabilitarse este valor.',
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
          this.toast.success(`${this.entityLabel} deshabilitado`);
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo deshabilitar',
            mapOpenApiError(error).message,
          ),
      });
  }

  private resolveFixedCatalogCode(): string | null {
    const value = this.routeData['catalogCode'];

    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    return this.catalogs.some((catalog) => catalog.codigo === normalized)
      ? normalized
      : null;
  }

  private routeText(key: string, fallback: string): string {
    const value = this.routeData[key];

    return typeof value === 'string' && value.trim()
      ? value.trim()
      : fallback;
  }
}
