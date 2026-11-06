import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faLayerGroup, faMapLocationDot, faPen, faPlus, faRotate, faSearch, faTableCellsLarge, faTableList, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Subscription, finalize } from 'rxjs';
import { PermissionDirective } from '../../../core/access/permission.directive';
import { PermissionService } from '../../../core/access/permission.service';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { DataTableComponent } from '../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../shared/data-display/data-table/data-table.types';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { PageResult, emptyPageResult } from '../../../shared/models/page-result.model';
import { ListarPrediosUseCase } from '../predios/application/use-case/listar-predios.use-case';
import { ObtenerPredioUseCase } from '../predios/application/use-case/obtener-predio.use-case';
import { Predio } from '../predios/domain/predio.model';
import { PredioFormComponent } from '../predios/adapter/in/ui/pages/predio-form/predio-form';
import { GestionProductivaAltaPredio } from './gestion-productiva-alta-predio';
import { GpGeneralFacade } from './gp-general.facade';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { ActionConfirmDialogComponent } from '../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';

@Component({
  selector: 'app-gestion-productiva-predios',
  standalone: true,
  imports: [RecordCardComponent, DecimalPipe, FormsModule, RouterLink, FaIconComponent, PermissionDirective,
    DataTableComponent, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent,
    PaginatorComponent, PageHeaderComponent, PredioFormComponent, GestionProductivaAltaPredio, ActionConfirmDialogComponent],
  templateUrl: './gestion-productiva-predios.html',
  styleUrl: './gestion-productiva.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaPredios implements OnInit, OnDestroy {
  private readonly list = inject(ListarPrediosUseCase);
  private readonly detail = inject(ObtenerPredioUseCase);
  private readonly permission = inject(PermissionService);
  private readonly uot = inject(UotContextStore);
  private readonly gp=inject(GpGeneralFacade);
  private readonly toast=inject(ToastService);
  readonly deleteIcon=faTrash;
  private listSubscription?: Subscription;
  private detailSubscription?: Subscription;

  @ViewChild(PredioFormComponent) private editModal!: PredioFormComponent;
  @ViewChild(GestionProductivaAltaPredio) private addModal!: GestionProductivaAltaPredio;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog!:ActionConfirmDialogComponent;

  readonly pageIcon = faMapLocationDot;
  readonly refreshIcon = faRotate;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly searchIcon = faSearch;
  readonly cardsIcon = faTableCellsLarge;
  readonly tableIcon = faTableList;
  readonly parcelIcon = faLayerGroup;
  readonly requiereUot = computed(() => this.uot.isGeneral());
  readonly loading = signal(true);
  readonly editingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly result = signal<PageResult<Predio>>(emptyPageResult(10));
  readonly vista = signal<'tarjetas' | 'tabla'>('tabla');
  buscar = '';
  soloActivos = true;
  readonly columns: readonly DataTableColumn<Predio>[] = [
    { key: 'nombre', label: 'Predio', sortable: false },
    { key: 'distritoCodigo', label: 'Distrito' },
    { key: 'areaTotalHa', label: 'Superficie', align: 'right', format: (v) => typeof v === 'number' && v > 0 ? `${v.toFixed(2)} ha` : 'Por completar' },
    { key: 'titulares', label: 'Titular', format: v => String(v || '—') },
    { key: 'estado', label: 'Estado', align: 'center' },
    { key: 'acciones', label: 'Acciones', align: 'right' },
  ];
  readonly hasRows = computed(() => this.result().items.length > 0);

  permitted(code: string): boolean { return this.permission.has(code); }
  ngOnInit(): void { this.load(1, 10); }
  ngOnDestroy(): void { this.listSubscription?.unsubscribe(); this.detailSubscription?.unsubscribe(); }

  load(page = this.result().page, size = this.result().size): void {
    this.listSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    const query = { buscar: this.buscar.trim() || undefined, soloActivos: this.soloActivos,
      page: Math.max(1, page), size };
    this.listSubscription = this.list.execute(query).pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: result => {
          if (result.page > 1 && result.items.length === 0 && result.totalPages > 0) {
            this.load(result.totalPages, size);
          } else {
            this.result.set(result);
          }
        },
        error: err => this.error.set(mapOpenApiError(err).message),
      });
  }
  applySearch(): void { this.load(1); }
  changeActive(value: boolean): void { this.soloActivos = value; this.load(1); }
  clear(): void { this.buscar = ''; this.soloActivos = true; this.load(1); }
  changeView(value: 'tarjetas' | 'tabla'): void { this.vista.set(value); }
  async create(): Promise<void> {
    if (!this.permitted('PREDIOS_CREAR') || this.requiereUot()) return;
    if ((await this.addModal.open()).saved) this.load(1);
  }
  async eliminar(row:Predio):Promise<void>{
    const u=this.uot.selectedId();if(!u||this.editingId()!==null||!this.permitted('PREDIOS_RETIRAR'))return;
    const confirmation=await this.confirmDialog.show({title:'Eliminar fundo o predio',
      message:`Se ocultará “${row.nombre}”, sus parcelas y todas las actividades asociadas. El sistema conservará los registros históricos sin eliminarlos físicamente.`,
      tone:'danger',confirmLabel:'Eliminar predio',requiresReason:true,minimumReasonLength:3,
      maximumReasonLength:1000,reasonLabel:'Motivo de eliminación'});
    if(!confirmation.confirmed||!confirmation.reason)return;
    this.editingId.set(row.predioId);
    this.gp.eliminarPredio(u,row.predioId,confirmation.reason).pipe(finalize(()=>this.editingId.set(null))).subscribe({
      next:()=>{this.toast.success('Predio eliminado lógicamente');this.load(1);},
      error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  edit(row: Predio): void {
    if (!this.permitted('PREDIOS_EDITAR') || this.editingId() !== null || this.requiereUot()) return;
    this.editingId.set(row.predioId);
    this.error.set(null);
    this.detailSubscription?.unsubscribe();
    this.detailSubscription = this.detail.execute(row.predioId).pipe(finalize(() => this.editingId.set(null)))
      .subscribe({
        next: async detail => { if ((await this.editModal.open(detail)).saved) this.load(); },
        error: err => this.error.set(mapOpenApiError(err).message),
      });
  }
}
