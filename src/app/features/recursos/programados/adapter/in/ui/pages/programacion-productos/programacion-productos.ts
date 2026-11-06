import { DecimalPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxesStacked, faRotate } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { POSVentasService } from '../../../../../../../../infrastructure/openapi/generated/api/pOSVentas.service';
import { unwrapApiResponse } from '../../../../../../../../infrastructure/openapi/api-response-unwrapper';
import { ResourceWarehouseResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceWarehouseResponse';
import { ResourceStockResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceStockResponse';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { LogisticsOperationsApiService, ProductUotPolicy, TechnicalProductProgram } from '../../../../../../shared/logistics-operations-api.service';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';

@Component({
  selector: 'app-programacion-productos', standalone: true,
  imports: [DecimalPipe, DatePipe, RouterLink, FaIconComponent, PageHeaderComponent, PaginatorComponent],
  templateUrl: './programacion-productos.html', styleUrl: './programacion-productos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramacionProductosPage implements OnInit {
  private readonly operations = inject(LogisticsOperationsApiService);
  private readonly resources = inject(ResourceApiService);
  private readonly salesApi = inject(POSVentasService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);
  readonly icon = faBoxesStacked;
  readonly refreshIcon = faRotate;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly programs = signal<readonly TechnicalProductProgram[]>([]);
  readonly policies = signal<readonly ProductUotPolicy[]>([]);
  readonly warehouses = signal<readonly ResourceWarehouseResponse[]>([]);
  readonly stock = signal<readonly ResourceStockResponse[]>([]);
  readonly warehouseProducts = computed(() => {
    const ids = new Set(this.stock().filter(s => s.almacenId === this.warehouseId() && s.estado !== false).map(s => s.productoId));
    return this.policies().filter(p => ids.has(p.productoId));
  });
  readonly employees = signal<readonly { id: number; name: string }[]>([]);
  readonly estado = signal('');
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly filteredPrograms = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    if (!term) return this.programs();
    return this.programs().filter((item) =>
      [item.programacionId, item.productoNombre, item.actividad, item.lugar, item.estadoProceso]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(term))
    );
  });
  readonly totalPages = computed(() => Math.ceil(this.filteredPrograms().length / this.pageSize()));
  readonly visiblePrograms = computed(() => {
    const offset = (this.page() - 1) * this.pageSize();
    return this.filteredPrograms().slice(offset, offset + this.pageSize());
  });
  changeSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.selected.set(null);
  }
  changeStatus(value: string): void {
    this.estado.set(value);
    this.page.set(1);
    this.selected.set(null);
    this.load();
  }
  changePage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, Math.max(1, this.totalPages()))));
    this.selected.set(null);
  }
  changePageSize(size: number): void {
    if (![10, 20, 50, 100].includes(size)) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.selected.set(null);
  }
  readonly warehouseId = signal(0);
  readonly productId = signal(0);
  readonly employeeId = signal(0);
  readonly amount = signal(1);
  readonly activity = signal('');
  readonly place = signal('');
  readonly start = signal('');
  readonly end = signal('');
  readonly observation = signal('');
  readonly authorizationFileId = signal(0);
  readonly selected = signal<TechnicalProductProgram | null>(null);
  readonly operation = signal('');
  readonly operationQuantity = signal(1);
  readonly operationNote = signal('');

  ngOnInit(): void { this.load(); }
  private uotId(): number | null {
    const id = this.uot.selectedId();
    return this.uot.isGeneral() || !id || id <= 0 ? null : id;
  }
  canCreate() { return this.permissions.has('RECURSOS_CREAR'); }
  canApprove() { return this.permissions.has('RECURSOS_EDITAR'); }
  canMove() { return this.permissions.has('ALMACENES_MOVIMIENTO'); }
  load(): void {
    const uotId = this.uotId();
    if (!uotId) {
      this.errorMessage.set('Seleccione una UOT específica para gestionar estas solicitudes.');
      this.programs.set([]);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      programs: this.operations.listPrograms(uotId, this.estado() || undefined),
      policies: this.operations.listPolicies(uotId),
      warehouses: this.resources.listWarehouses(uotId),
      stock: this.resources.listStock(uotId),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ programs, policies, warehouses, stock }) => {
        if (this.uotId() !== uotId) return;
        this.programs.set(programs);
        this.page.set(Math.min(this.page(), Math.max(1, Math.ceil(this.filteredPrograms().length / this.pageSize()))));
        this.policies.set(policies.filter((p) => p.configurado && p.permiteUsoInterno));
        this.stock.set(stock);
        if (!this.warehouseProducts().some(p => p.productoId === this.productId())) this.productId.set(0);
        this.warehouses.set(warehouses.filter((w) => w.estado !== false
          && Number(w.uotPropietariaId) === uotId));
        if (!this.warehouses().some((w) => Number(w.almacenId) === this.warehouseId())) this.warehouseId.set(0);
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
    if (this.permissions.has('VENTAS_ENTREGA_TECNICA')) {
      this.salesApi.ventasEntregasTecnicasEmpleados({ uotId }, 'body', false,
        { transferCache: false }).subscribe({
        next: (response) => {
          if (this.uotId() !== uotId) return;
          this.employees.set((unwrapApiResponse(response) ?? []).map((e) => ({
            id: Number(e.empleadoId ?? 0), name: e.empleado?.trim() || 'Empleado',
          })).filter((e) => e.id > 0));
        },
        error: () => this.employees.set([]),
      });
    }
  }
  create(): void {
    const uotId = this.uotId();
    const quantity = Number(this.amount());
    if (!this.canCreate() || this.saving() || !uotId || !this.warehouseId() || !this.productId()
      || !this.warehouseProducts().some(p => p.productoId === this.productId())
      || !this.employeeId() || !this.activity().trim() || !this.place().trim() || !this.start()
      || !Number.isFinite(quantity) || quantity <= 0 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.000001
      || this.activity().length > 250 || this.place().length > 300
      || (this.end() !== '' && this.end() < this.start())) {
      this.errorMessage.set('Complete almacén, producto, empleado, actividad, lugar, fecha y cantidad válida.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.operations.createProgram({
      uotId, almacenId: this.warehouseId(), productoId: this.productId(),
      empleadoId: this.employeeId(), cantidad: quantity,
      actividad: this.activity().trim(), lugar: this.place().trim(),
      fechaInicio: this.start(), fechaFin: this.end() || undefined,
      archivoAutorizacionId: this.authorizationFileId() > 0 ? this.authorizationFileId() : undefined,
      observacion: this.observation().trim() || undefined,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (id) => {
        this.toast.success(`Solicitud técnica #${id} registrada`);
        this.productId.set(0); this.amount.set(1); this.activity.set('');
        this.place.set(''); this.start.set(''); this.end.set('');
        this.observation.set(''); this.authorizationFileId.set(0);
        this.load();
      },
      error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
    });
  }
  selectProgram(item: TechnicalProductProgram): void {
    this.selected.set(item);
    this.operation.set('');
    this.operationQuantity.set(item.estadoProceso === 'APROBADA' ? item.cantidadProgramada
      : item.cantidadPendiente > 0 ? item.cantidadPendiente : 1);
    this.operationNote.set('');
  }
  availableActions(item: TechnicalProductProgram): readonly string[] {
    if (item.estadoProceso === 'PENDIENTE' && this.canApprove()) return ['APROBAR', 'RECHAZAR', 'CANCELAR'];
    if (item.estadoProceso === 'APROBADA') {
      return [...(this.canMove() ? ['ENTREGAR'] : []), ...(this.canApprove() ? ['CANCELAR'] : [])];
    }
    if (item.estadoProceso === 'ENTREGADA' || item.estadoProceso === 'FINALIZADA') {
      return [...(this.canMove() && item.cantidadPendiente > 0 ? ['DEVOLVER', 'CONSUMIR'] : []),
        ...(this.canApprove() ? ['CERRAR'] : [])];
    }
    return [];
  }
  applyOperation(): void {
    const item = this.selected();
    const operacion = this.operation();
    const quantity = Number(this.operationQuantity());
    const requiresQuantity = ['ENTREGAR', 'DEVOLVER', 'CONSUMIR'].includes(operacion);
    if (!item || !this.availableActions(item).includes(operacion) || this.saving() ||
      (requiresQuantity && (!Number.isFinite(quantity) || quantity <= 0
        || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 0.000001
        || (operacion === 'ENTREGAR' && quantity !== item.cantidadProgramada)
        || (operacion !== 'ENTREGAR' && quantity > item.cantidadPendiente)))) {
      this.errorMessage.set('Seleccione una operación válida y revise la cantidad permitida.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.operations.operateProgram(item.programacionId, operacion,
      requiresQuantity ? quantity : undefined, this.operationNote().trim() || undefined)
      .pipe(finalize(() => this.saving.set(false))).subscribe({
        next: () => {
          this.toast.success(`Operación ${operacion.toLowerCase()} registrada`);
          this.selected.set(null);
          this.load();
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }
}
