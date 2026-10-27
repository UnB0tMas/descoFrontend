import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRightArrowLeft, faRotate, faSliders } from '@fortawesome/free-solid-svg-icons';
import { forkJoin, finalize } from 'rxjs';

import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { LogisticsOperationsApiService, ProductUotPolicy } from '../../../../../../shared/logistics-operations-api.service';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { ResourceStockResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceStockResponse';

@Component({
  selector: 'app-almacen-operations', standalone: true,
  imports: [DecimalPipe, RouterLink, FaIconComponent, PageHeaderComponent],
  templateUrl: './almacen-operations.html', styleUrl: './almacen-operations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmacenOperationsPage implements OnInit {
  private readonly resources = inject(ResourceApiService);
  private readonly operations = inject(LogisticsOperationsApiService);
  private readonly permission = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly icon = faSliders;
  readonly refreshIcon = faRotate;
  readonly transferIcon = faArrowRightArrowLeft;
  readonly loading = signal(false);
  readonly working = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly policies = signal<readonly ProductUotPolicy[]>([]);
  readonly warehouses = signal<readonly ResourceWarehouseResponse[]>([]);
  readonly stock = signal<readonly ResourceStockResponse[]>([]);
  readonly sourceId = signal(0);
  readonly destinationId = signal(0);
  readonly productId = signal(0);
  readonly quantity = signal(1);
  readonly observation = signal('');
  readonly editingPolicyId = signal<number | null>(null);
  readonly saleEnabled = signal(false);
  readonly internalEnabled = signal(true);
  readonly productSearch = signal('');
  readonly visiblePolicies = computed(() => {
    const search = this.productSearch().trim().toLocaleLowerCase();
    return this.policies().filter((p) => !search || (p.nombre + ' ' + p.codigo).toLowerCase().includes(search));
  });
  readonly sourceStock = computed(() => this.stock().filter((s) =>
    Number(s.almacenId) === this.sourceId() && Number(s.stockDisponible ?? 0) > 0));
  canEdit(): boolean { return this.permission.has('ALMACENES_MOVIMIENTO'); }
  private uotId(): number | null {
    const selected = this.uot.selectedId();
    return this.uot.isGeneral() || !selected || selected <= 0 ? null : selected;
  }
  ngOnInit(): void { this.load(); }
  load(): void {
    const uotId = this.uotId();
    if (!uotId) {
      this.errorMessage.set('Seleccione una UOT específica para configurar productos y transferir stock.');
      this.policies.set([]);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      policies: this.operations.listPolicies(uotId),
      warehouses: this.resources.listWarehouses(),
      stock: this.resources.listStock(uotId),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ policies, warehouses, stock }) => {
        if (uotId !== this.uotId()) return;
        this.policies.set(policies);
        this.warehouses.set(warehouses.filter((w) => w.estado !== false));
        this.stock.set(stock);
        if (!warehouses.some((w) => Number(w.almacenId) === this.sourceId()
          && Number(w.uotPropietariaId) === uotId)) this.sourceId.set(0);
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }
  editPolicy(policy: ProductUotPolicy): void {
    if (!this.canEdit()) return;
    this.editingPolicyId.set(policy.productoId);
    this.saleEnabled.set(policy.permiteVenta);
    this.internalEnabled.set(policy.permiteUsoInterno);
  }
  savePolicy(): void {
    const uotId = this.uotId();
    const productId = this.editingPolicyId();
    if (!this.canEdit() || !uotId || !productId || this.working()) return;
    this.working.set(true);
    this.errorMessage.set(null);
    this.operations.setPolicy(uotId, productId, this.saleEnabled(), this.internalEnabled())
      .pipe(finalize(() => this.working.set(false))).subscribe({
        next: () => {
          this.editingPolicyId.set(null);
          this.toast.success('Política de producto actualizada');
          this.load();
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }
  transfer(): void {
    const source = this.warehouses().find((w) => Number(w.almacenId) === this.sourceId());
    const destination = this.warehouses().find((w) => Number(w.almacenId) === this.destinationId());
    const quantity = Number(this.quantity());
    if (!this.canEdit() || this.working() || !source || !destination ||
      source.almacenId === destination.almacenId ||
      Number(source.uotPropietariaId) !== this.uotId() ||
      this.productId() <= 0 || !Number.isFinite(quantity) || quantity <= 0 ||
      Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.000001 ||
      Number(this.sourceStock().find((s) => s.productoId === this.productId())?.stockDisponible ?? 0) < quantity) {
      this.errorMessage.set('Seleccione origen, destino distinto, producto y cantidad disponible válidos.');
      return;
    }
    this.working.set(true);
    this.errorMessage.set(null);
    this.operations.transfer({
      almacenOrigenId: this.sourceId(), almacenDestinoId: this.destinationId(),
      detalle: [{ productoId: this.productId(), cantidad: quantity }],
      observacion: this.observation().trim() || undefined,
    }).pipe(finalize(() => this.working.set(false))).subscribe({
      next: (id) => {
        this.toast.success(`Transferencia #${id} registrada`, 'Se actualizaron los Kardex de ambos almacenes.');
        this.productId.set(0); this.quantity.set(1); this.observation.set(''); this.load();
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }
}
