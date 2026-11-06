import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faEye, faLayerGroup, faPen, faPlus, faRotate, faSearch, faTableCellsLarge, faTableList, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Subscription, finalize } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { GpParcelaResponse } from '../../../infrastructure/openapi/generated/model/gpParcelaResponse';
import { DataTableComponent } from '../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { GpGeneralFacade } from './gp-general.facade';
import { GpParcelaForm } from './gp-parcela-form';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ObtenerPredioUseCase } from '../predios/application/use-case/obtener-predio.use-case';

@Component({
  selector: 'app-gestion-productiva-parcelas', standalone: true,
  imports: [RecordCardComponent, DecimalPipe, FormsModule, RouterLink, FaIconComponent, PermissionDirective,
    PageHeaderComponent, PaginatorComponent, DataTableComponent, EmptyStateComponent,
    ErrorStateComponent, LoadingStateComponent, GpParcelaForm, ActionConfirmDialogComponent],
  templateUrl: './gestion-productiva-parcelas.html', styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaParcelas implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly gp = inject(GpGeneralFacade);
  private readonly uot = inject(UotContextStore);
  private readonly perms = inject(PermissionService);
  private readonly predios = inject(ObtenerPredioUseCase);
  private subscriptions = new Subscription();
  private listSubscription?: Subscription;
  @ViewChild(GpParcelaForm) private form!: GpParcelaForm;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog!:ActionConfirmDialogComponent;
  readonly predioId = Number(this.route.snapshot.paramMap.get('predioId'));
  readonly predioNombre = signal('Predio');
  readonly predioCodigo = signal('');
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<GpParcelaResponse[]>([]);
  readonly search = signal('');
  readonly view = signal<'tabla' | 'tarjetas'>('tabla');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly pageIcon = faLayerGroup;
  readonly refreshIcon = faRotate;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly viewIcon = faEye;
  readonly backIcon = faArrowLeft;
  readonly deleteIcon=faTrash;
  private readonly toast=inject(ToastService);
  readonly searchIcon = faSearch;
  readonly cardsIcon = faTableCellsLarge;
  readonly tableIcon = faTableList;
  readonly columns: readonly DataTableColumn<GpParcelaResponse>[] = [
    { key: 'nombre', label: 'Parcela' },
    { key: 'areaHa', label: 'Superficie', align: 'right', format: v => typeof v === 'number' ? `${v.toFixed(2)} ha` : 'Sin dato' },
    { key: 'estado', label: 'Estado', align: 'center' },
    { key: 'acciones', label: 'Acciones', align: 'right' },
  ];
  readonly filtered = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    return this.items().filter(row => !term || `${row.codigo} ${row.nombre}`.toLocaleLowerCase().includes(term));
  });
  readonly totalPages = computed(() => Math.ceil(this.filtered().length / this.size()));
  readonly visible = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  can(code: string): boolean { return this.perms.has(code); }
  ngOnInit(): void {
    if (!Number.isInteger(this.predioId) || this.predioId < 1) { this.loading.set(false); this.error.set('Predio inválido.'); return; }
    this.subscriptions.add(this.predios.execute(this.predioId).subscribe({
      next: predio => { this.predioNombre.set(predio.nombre); this.predioCodigo.set(predio.codigo); },
      error: err => this.error.set(mapOpenApiError(err).message),
    }));
    this.load(true);
  }
  ngOnDestroy(): void { this.listSubscription?.unsubscribe(); this.subscriptions.unsubscribe(); }
  load(reset = false): void {
    const uot = this.uot.selectedId();
    if (!uot) { this.loading.set(false); this.error.set('Selecciona una UOT para consultar las parcelas.'); return; }
    this.listSubscription?.unsubscribe();
    this.loading.set(true); this.error.set(null);
    this.listSubscription = this.gp.parcelas(uot, this.predioId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: items => {
        this.items.set([...items].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })));
        if (reset) this.page.set(1);
        else this.page.set(Math.max(1, Math.min(this.page(), this.totalPages())));
      },
      error: err => this.error.set(mapOpenApiError(err).message),
    });
  }
  onSearch(term: string): void { this.search.set(term); this.page.set(1); }
  clear(): void { this.search.set(''); this.page.set(1); }
  setPage(page: number): void { if (page >= 1 && page <= this.totalPages()) this.page.set(page); }
  setSize(size: number): void { this.size.set(size); this.page.set(1); }
  async create(): Promise<void> {
    if (!this.can('CULTIVOS_CREAR') || !this.uot.selectedId()) return;
    if ((await this.form.open(this.predioId, this.predioNombre())).saved) this.load();
  }
  async eliminar(row:GpParcelaResponse):Promise<void>{
    const u=this.uot.selectedId();if(!u||this.editing()||!this.can('CULTIVOS_RETIRAR'))return;
    const confirmation=await this.confirmDialog.show({title:'Eliminar parcela',
      message:`La parcela “${row.nombre}” y todas sus actividades se ocultarán de las consultas normales. Los historiales se conservan en la base de datos.`,
      tone:'danger',confirmLabel:'Eliminar parcela',requiresReason:true,minimumReasonLength:3,
      maximumReasonLength:1000,reasonLabel:'Motivo de eliminación'});
    if(!confirmation.confirmed||!confirmation.reason)return;
    this.editing.set(true);
    this.gp.eliminarParcela(u,row.parcelaId,confirmation.reason).pipe(finalize(()=>this.editing.set(false))).subscribe({
      next:()=>{this.toast.success('Parcela eliminada lógicamente');this.load(true);},
      error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  async edit(row: GpParcelaResponse): Promise<void> {
    if (!this.can('CULTIVOS_EDITAR') || this.editing() || !row.estado) return;
    this.editing.set(true);
    try {
      if ((await this.form.open(this.predioId, this.predioNombre(), row)).saved) this.load();
    } finally { this.editing.set(false); }
  }
}
