import { ChangeDetectionStrategy, Component, Input, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faEye, faPen, faPlus, faRotate, faSeedling } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../core/access/permission.directive';
import { GpGeneralFacade } from '../../gestion-tecnica/gestion-productiva/gp-general.facade';
import { GpAccionModal } from '../../gestion-tecnica/gestion-productiva/gp-accion-modal';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { GpCatalogoResponse } from '../../../infrastructure/openapi/generated/model/gpCatalogoResponse';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';

// Navegación de primer nivel. Las variedades, razas y asociaciones se gestionan en el detalle.
export type ProductiveCatalogType = 'CULTIVO' | 'CRIANZA' | 'SANIDAD';
type SanidadScope = 'TODOS' | 'CULTIVO' | 'CRIANZA';
type CatalogRow = GpCatalogoResponse;
export const PRODUCTIVE_CATALOG_TABS: readonly {
  codigo: ProductiveCatalogType;
  nombre: string;
  descripcion: string;
}[] = [
  { codigo: 'CULTIVO', nombre: 'Cultivos y variedades', descripcion: 'Registra cultivos y administra sus variedades desde el detalle.' },
  { codigo: 'CRIANZA', nombre: 'Especies animales y razas', descripcion: 'Registra especies animales y administra sus razas desde el detalle.' },
  { codigo: 'SANIDAD', nombre: 'Sanidad y tratamientos', descripcion: 'Enfermedades por cultivo o especie y tratamientos propios de cada enfermedad.' },
];

@Component({
  selector: 'app-catalogos-productivos',
  standalone: true,
  imports: [
    RouterLink, FaIconComponent, PermissionDirective, GpAccionModal,
    PageHeaderComponent, ActionConfirmDialogComponent, LoadingStateComponent,
    ErrorStateComponent, EmptyStateComponent, PaginatorComponent,
  ],
  templateUrl: './catalogos-productivos.html',
  styleUrls: [
    './adapter/in/ui/pages/catalogos-list/catalogos-list.css',
    './catalogos-productivos.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogosProductivos implements OnInit {
  @Input() embedded = false;
  @Input() set selectedType(value: ProductiveCatalogType) {
    if (PRODUCTIVE_CATALOG_TABS.some(tab => tab.codigo === value)) this.changeType(value);
  }

  @ViewChild(GpAccionModal) private modal!: GpAccionModal;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog!: ActionConfirmDialogComponent;

  private readonly gp = inject(GpGeneralFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);
  readonly pageIcon = faSeedling;
  readonly refreshIcon = faRotate;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly detailIcon = faEye;
  readonly disableIcon = faBan;
  readonly tabs = PRODUCTIVE_CATALOG_TABS;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly disablingKey = signal<string | null>(null);
  readonly data = signal<CatalogRow[]>([]);
  readonly type = signal<ProductiveCatalogType>('CULTIVO');
  readonly sanidadScope = signal<SanidadScope>('TODOS');
  readonly search = signal('');
  readonly detailKey = signal<string | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  readonly selectedCatalog = computed(() =>
    this.tabs.find(tab => tab.codigo === this.type()) ?? this.tabs[0],
  );
  readonly currentUot = computed(() =>
    this.uot.selectedId() ??
    this.uot.memberships().find(m => m.predeterminada)?.uotId ??
    this.uot.memberships()[0]?.uotId ?? null,
  );
  readonly detail = computed(() =>
    this.data().find(row => this.rowKey(row) === this.detailKey()) ?? null,
  );
  readonly associatedCount = computed(() => {
    const detail = this.detail();
    if (!detail) return 0;
    if (detail.tipo === 'CULTIVO' || detail.tipo === 'CRIANZA') {
      const childType = detail.tipo === 'CULTIVO' ? 'VARIEDAD' : 'RAZA';
      return this.data().filter(row => row.tipo === childType && row.padreId === detail.id).length;
    }
    if (this.isDisease(detail)) {
      return this.data().filter(row => row.tipo === 'RELACION' && row.padreId === detail.id).length;
    }
    return 0;
  });
  readonly detailEntityName = computed(() => {
    const row = this.detail();
    return row?.nombre || 'Detalle';
  });
  readonly childTitle = computed(() => {
    const row = this.detail();
    if (row?.tipo === 'CULTIVO') return 'Variedades del cultivo';
    if (row?.tipo === 'CRIANZA') return 'Razas de la especie';
    return 'Tratamientos asociados';
  });
  readonly primaryActionLabel = computed(() => {
    const row = this.detail();
    if (row?.tipo === 'CULTIVO') return 'Añadir variedad';
    if (row?.tipo === 'CRIANZA') return 'Añadir raza';
    if (row && this.isDisease(row)) return 'Nuevo tratamiento';
    if (this.type() === 'CULTIVO') return 'Nuevo cultivo';
    if (this.type() === 'CRIANZA') return 'Nueva especie';
    return 'Nueva enfermedad';
  });
  readonly rows = computed(() => {
    const detail = this.detail();
    const data = this.data();
    let items: CatalogRow[];
    if (detail?.tipo === 'CULTIVO' || detail?.tipo === 'CRIANZA') {
      items = data.filter(row => row.tipo === (detail.tipo === 'CULTIVO' ? 'VARIEDAD' : 'RAZA') && row.padreId === detail.id);
    } else if (detail && this.isDisease(detail)) {
      items = data.filter(row => row.tipo === 'RELACION' && row.padreId === detail.id);
    } else if (this.type() === 'CULTIVO' || this.type() === 'CRIANZA') {
      items = data.filter(row => row.tipo === this.type());
    } else {
      items = data.filter(row => this.isDisease(row))
        .filter(row => this.sanidadScope() === 'TODOS' || row.tipo === (this.sanidadScope() === 'CULTIVO' ? 'PROBLEMA_CULTIVO' : 'PROBLEMA_CRIANZA'));
    }
    const text = this.search().trim().toLocaleLowerCase('es');
    if (text) items = items.filter(row => [this.rowName(row), row.codigo ?? '', row.descripcion ?? ''].some(v => v.toLocaleLowerCase('es').includes(text)));
    return [...items].sort((a, b) => this.rowName(a).localeCompare(this.rowName(b), 'es') || a.id - b.id);
  });
  readonly result = computed(() => {
    const all = this.rows();
    const size = Math.max(1, this.pageSize());
    const totalRecords = all.length;
    const totalPages = Math.ceil(totalRecords / size);
    const page = totalPages ? Math.min(Math.max(1, this.currentPage()), totalPages) : 1;
    return { items: all.slice((page - 1) * size, page * size), page, size, totalRecords, totalPages };
  });

  ngOnInit(): void {
    if (!this.embedded) {
      const query = this.route.snapshot.queryParamMap.get('tipo');
      // Los enlaces antiguos a variedades, razas, problemas y tratamientos siguen funcionando.
      if (query === 'CRIANZA' || query === 'RAZA') this.type.set('CRIANZA');
      else if (query === 'CULTIVO' || query === 'VARIEDAD') this.type.set('CULTIVO');
      else if (query === 'SANIDAD' || query === 'TRATAMIENTO' || query?.startsWith('PROBLEMA_') || query === 'RELACION') {
        this.type.set('SANIDAD');
        if (query === 'PROBLEMA_CULTIVO') this.sanidadScope.set('CULTIVO');
        if (query === 'PROBLEMA_CRIANZA') this.sanidadScope.set('CRIANZA');
      }
    }
    this.load();
  }

  load(): void {
    const uotId = this.currentUot();
    if (uotId === null) {
      this.error.set('Selecciona una UOT para consultar los catálogos.');
      this.data.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.gp.catalogos(uotId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: items => {
        this.data.set(items);
        if (this.detailKey() && !items.some(row => this.rowKey(row) === this.detailKey())) this.detailKey.set(null);
        this.currentPage.set(1);
      },
      error: e => {
        this.error.set(mapOpenApiError(e).message);
      },
    });
  }

  changeType(type: ProductiveCatalogType): void {
    if (this.type() === type) return;
    this.type.set(type);
    this.closeDetail();
    this.sanidadScope.set('TODOS');
  }
  changeSanidadScope(scope: string): void {
    const value: SanidadScope = scope === 'CULTIVO' || scope === 'CRIANZA' ? scope : 'TODOS';
    this.sanidadScope.set(value);
    this.currentPage.set(1);
  }
  setSearch(value: string): void { this.search.set(value); this.currentPage.set(1); }
  changePage(page: number): void { this.currentPage.set(Math.max(1, page)); }
  changePageSize(size: number): void { this.pageSize.set(Math.max(1, size)); this.currentPage.set(1); }
  openDetail(row: CatalogRow): void {
    if (row.tipo !== 'CULTIVO' && row.tipo !== 'CRIANZA' && !this.isDisease(row)) return;
    this.detailKey.set(this.rowKey(row));
    this.search.set('');
    this.currentPage.set(1);
  }
  closeDetail(): void { this.detailKey.set(null); this.search.set(''); this.currentPage.set(1); }
  isDisease(row: CatalogRow): boolean { return row.tipo === 'PROBLEMA_CULTIVO' || row.tipo === 'PROBLEMA_CRIANZA'; }
  scopeName(row: CatalogRow): string {
    if (row.tipo === 'PROBLEMA_CULTIVO') return 'Agrícola';
    if (row.tipo === 'PROBLEMA_CRIANZA') return 'Pecuario';
    return '—';
  }
  rowKey(row: CatalogRow): string { return `${row.tipo}-${row.id}-${row.padreId ?? 0}`; }
  rowName(row: CatalogRow): string {
    if (row.tipo === 'RELACION') return this.data().find(x => x.tipo === 'TRATAMIENTO' && x.id === row.id)?.nombre || row.nombre || `Tratamiento #${row.id}`;
    return row.nombre || 'Sin nombre';
  }
  parentName(row: CatalogRow): string {
    if (row.padreId == null) return '—';
    if (row.tipo === 'PROBLEMA_CULTIVO') return this.data().find(x => x.tipo === 'CULTIVO' && x.id === row.padreId)?.nombre || `#${row.padreId}`;
    if (row.tipo === 'PROBLEMA_CRIANZA') return this.data().find(x => x.tipo === 'CRIANZA' && x.id === row.padreId)?.nombre || `#${row.padreId}`;
    return '—';
  }
  associationDetail(row: CatalogRow): string {
    if (row.tipo !== 'RELACION') return row.descripcion || '—';
    return this.data().find(x => x.tipo === 'TRATAMIENTO' && x.id === row.id)?.descripcion || '—';
  }

  create(): void {
    const detail = this.detail();
    if (detail?.tipo === 'CULTIVO' || detail?.tipo === 'CRIANZA') {
      this.modal.showCatalogChild(detail, this.data(), () => this.load(), true);
      return;
    }
    if (detail && this.isDisease(detail)) {
      this.createTreatmentForDisease();
      return;
    }
    const group = this.type();
    if (group === 'CULTIVO' || group === 'CRIANZA') {
      this.modal.showCatalogCreate(group, this.data(), () => this.load(), group, true);
    } else {
      this.modal.showCatalogCreate('PROBLEMA', this.data(), () => this.load(), this.sanidadScope() === 'CRIANZA' ? 'CRIANZA' : 'CULTIVO', true);
    }
  }
  createTreatmentForDisease(): void {
    const detail = this.detail();
    if (!detail || !this.isDisease(detail)) return;
    this.modal.showCatalogTreatmentForDisease(detail, this.data(), () => this.load());
  }
  edit(row: CatalogRow): void {
    // Una relación representa el tratamiento propio de esta enfermedad.
    const target = row.tipo === 'RELACION'
      ? this.data().find(item => item.tipo === 'TRATAMIENTO' && item.id === row.id)
      : row;
    if (target) this.modal.showCatalogEdit(target, this.data(), () => this.load());
  }

  async disable(row: CatalogRow): Promise<void> {
    const key = this.rowKey(row);
    if (this.disablingKey() !== null) return;
    const confirmation = await this.confirmDialog.show({
      title: 'Desactivar registro',
      message: `“${this.rowName(row)}” dejará de estar disponible para nuevos registros.`,
      tone: 'warning',
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmation.confirmed) return;
    const uotId = this.currentUot();
    if (uotId === null) return;
    this.disablingKey.set(key);
    this.gp.actualizarCatalogo(uotId, row.tipo === 'RELACION' ? 'TRATAMIENTO' : row.tipo, row.id, {
      codigo: row.codigo ?? null,
      nombre: row.nombre ?? null,
      padreId: row.padreId ?? null,
      descripcion: row.descripcion ?? null,
      estado: false,
    }).pipe(finalize(() => this.disablingKey.set(null))).subscribe({
      next: () => { this.toast.success('Registro desactivado'); this.load(); },
      error: e => this.toast.error('No se pudo completar la operación', mapOpenApiError(e).message),
    });
  }
}
