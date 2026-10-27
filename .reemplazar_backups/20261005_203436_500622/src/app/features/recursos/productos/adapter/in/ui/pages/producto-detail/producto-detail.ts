import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faClockRotateLeft, faCoins, faImage, faPen, faPowerOff, faRotate, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, of } from 'rxjs';

import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ResourceProductDetailResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceProductDetailResponse';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { LocalFilePanelComponent } from '../../../../../../../../shared/files/local-file-panel/local-file-panel';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService, ResourceProductPriceHistory } from '../../../../../../shared/resource-api.service';
import { ResourceImageComponent } from '../../../../../../shared/resource-image/resource-image';
import { ProductoFormComponent } from '../producto-form/producto-form';

@Component({
  selector: 'app-producto-detail-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, FaIconComponent, PermissionDirective, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, ActionConfirmDialogComponent, LocalFilePanelComponent, PageHeaderComponent, ResourceImageComponent, ProductoFormComponent],
  templateUrl: './producto-detail.html',
  styleUrl: './producto-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoDetailPage implements OnInit {
  @ViewChild(ProductoFormComponent) private form!: ProductoFormComponent;
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResourceApiService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(true);
  readonly historyLoading = signal(false);
  readonly actionLoadingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly historyError = signal<string | null>(null);
  readonly detail = signal<ResourceProductDetailResponse | null>(null);
  readonly history = signal<readonly ResourceProductPriceHistory[]>([]);

  readonly backIcon = faArrowLeft;
  readonly refreshIcon = faRotate;
  readonly priceIcon = faCoins;
  readonly historyIcon = faClockRotateLeft;
  readonly imageIcon = faImage;
  readonly reactivateIcon = faRotateLeft;
  readonly editIcon = faPen;
  readonly deactivateIcon = faPowerOff;

  readonly productId = Number(this.route.snapshot.paramMap.get('id'));
  readonly requestedUotId = Number(this.route.snapshot.queryParamMap.get('uotId')) || null;

  ngOnInit(): void { this.load(); }

  load(): void {
    const uotId = this.targetUotId();
    if (!this.productId || !uotId) { this.loading.set(false); this.errorMessage.set('No se identificó correctamente el producto y su UOT.'); return; }
    this.loading.set(true); this.errorMessage.set(null);
    const canHistory = this.permissions.has('PRODUCTOS_PRECIO_HISTORIAL');
    forkJoin({
      detail: this.api.getProduct(this.productId, uotId),
      history: canHistory ? this.api.listProductPriceHistory(this.productId, uotId) : of([] as ResourceProductPriceHistory[]),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ detail, history }) => { this.detail.set(detail ?? null); this.history.set(history); },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }

  loadHistory(): void {
    if (!this.permissions.has('PRODUCTOS_PRECIO_HISTORIAL')) return;
    this.historyLoading.set(true); this.historyError.set(null);
    const uotId = this.targetUotId();
    if (!uotId) { this.historyLoading.set(false); return; }
    this.api.listProductPriceHistory(this.productId, uotId).pipe(finalize(() => this.historyLoading.set(false))).subscribe({
      next: (items) => this.history.set(items),
      error: (error) => this.historyError.set(mapOpenApiError(error).message),
    });
  }

  async versionPrice(): Promise<void> {
    const item = this.detail(); if (!item) return;
    const uotId = this.targetUotId(); if (!uotId) return;
    const result = await this.form.openPrice(item, uotId);
    if (result.saved) this.load();
  }


  async editProduct(): Promise<void> {
    const item = this.detail();
    const uotId = this.targetUotId();
    if (!item || !uotId) return;
    const result = await this.form.openEdit(item, uotId);
    if (result.saved) this.load();
  }

  async toggleProductState(): Promise<void> {
    const item = this.detail();
    const uotId = this.targetUotId();
    if (!item || !uotId || this.actionLoadingId()) return;
    const active = item.estado !== false;
    const result = await this.confirm.show({
      title: active ? 'Desactivar producto' : 'Reactivar producto',
      message: active
        ? 'El producto quedará inactivo sin borrar su historial ni sus imágenes.'
        : 'El producto volverá a estar disponible.',
      confirmLabel: active ? 'Desactivar' : 'Reactivar',
      cancelLabel: 'Cancelar',
      tone: active ? 'danger' : 'warning',
    });
    if (!result.confirmed) return;
    this.actionLoadingId.set(-1);
    const operation = active
      ? this.api.deactivateProduct(this.productId, uotId)
      : this.api.reactivateProduct(this.productId, uotId);
    operation.pipe(finalize(() => this.actionLoadingId.set(null))).subscribe({
      next: () => { this.toast.success(active ? 'Producto desactivado' : 'Producto reactivado'); this.load(); },
      error: (error) => this.toast.error('No se pudo cambiar el estado del producto', mapOpenApiError(error).message),
    });
  }

  async reactivate(price: ResourceProductPriceHistory): Promise<void> {
    if (price.vigente || !price.productoPrecioId || this.actionLoadingId()) return;
    const result = await this.confirm.show({
      title: 'Reactivar precio histórico',
      message: `Se creará una nueva versión vigente con ${price.moneda} ${price.precioVenta.toFixed(2)}. La versión histórica no será modificada.`,
      confirmLabel: 'Crear versión vigente',
      cancelLabel: 'Cancelar',
      tone: 'warning',
    });
    if (!result.confirmed) return;
    this.actionLoadingId.set(price.productoPrecioId);
    const uotId = this.targetUotId(); if (!uotId) { this.actionLoadingId.set(null); return; }
    this.api.reactivateProductPrice(this.productId, price.productoPrecioId, { uotId })
      .pipe(finalize(() => this.actionLoadingId.set(null)))
      .subscribe({
        next: () => { this.toast.success('Precio reactivado como nueva versión'); this.load(); },
        error: (error) => this.toast.error('No se pudo reactivar el precio', mapOpenApiError(error).message),
      });
  }

  targetUotId(): number {
    if (this.uot.isSpecific()) {
      return this.uot.selectedId() ?? 0;
    }

    return this.detail()?.uotId ?? this.requestedUotId ?? 0;
  }

  canUploadImages(): boolean { return this.permissions.has('PRODUCTOS_IMAGENES') && this.permissions.has('ARCHIVOS_CREAR'); }
  imageIds(): readonly number[] { const id = this.detail()?.archivoPrincipalId; return id ? [id] : []; }
}
