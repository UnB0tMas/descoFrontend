import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRotateLeft,
  faBan,
  faBoxesStacked,
  faCheck,
  faEye,
  faPen,
  faPlus,
  faRotate,
  faUtensils,
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
import { PageResult, emptyPageResult } from '../../../../../../../../shared/models/page-result.model';
import { AsignarRecursoUseCase } from '../../../../../application/use-case/asignar-recurso.use-case';
import { CancelarRecursoProgramadoUseCase } from '../../../../../application/use-case/cancelar-recurso-programado.use-case';
import { ListarRecursosProgramadosUseCase } from '../../../../../application/use-case/listar-recursos-programados.use-case';
import { RecursoProgramado } from '../../../../../domain/recurso-programado.model';
import { RecursoProgramadoFormComponent } from '../recurso-programado-form/recurso-programado-form';

@Component({
  selector: 'app-recursos-programados-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FaIconComponent,
    PermissionDirective,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginatorComponent,
    ActionConfirmDialogComponent,
    PageHeaderComponent,
    RecursoProgramadoFormComponent,
  ],
  templateUrl: './recursos-programados-list.html',
  styleUrl: './recursos-programados-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursosProgramadosListPage implements OnInit {
  @ViewChild(RecursoProgramadoFormComponent)
  private form!: RecursoProgramadoFormComponent;

  @ViewChild(ActionConfirmDialogComponent)
  private confirm!: ActionConfirmDialogComponent;

  private readonly listUseCase = inject(ListarRecursosProgramadosUseCase);
  private readonly assignUseCase = inject(AsignarRecursoUseCase);
  private readonly cancelUseCase = inject(CancelarRecursoProgramadoUseCase);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionId = signal<number | null>(null);
  readonly result = signal<PageResult<RecursoProgramado>>(emptyPageResult(20));

  readonly stateFilter = signal('');
  readonly campaignFilter = signal<number | null>(null);
  readonly operationFilter = signal<number | null>(null);
  readonly fieldTripFilter = signal<number | null>(null);

  readonly pageIcon = faBoxesStacked;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly assignIcon = faCheck;
  readonly returnIcon = faArrowRotateLeft;
  readonly consumeIcon = faUtensils;
  readonly cancelIcon = faBan;
  readonly refreshIcon = faRotate;

  ngOnInit(): void { this.load(1); }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.listUseCase
      .execute({
        estadoProceso: this.stateFilter() || undefined,
        campaniaVentaId: this.campaignFilter() ?? undefined,
        operativoVentaId: this.operationFilter() ?? undefined,
        salidaCampoId: this.fieldTripFilter() ?? undefined,
        page,
        size,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  setNumericFilter(target: 'campaign' | 'operation' | 'fieldTrip', value: string): void {
    const parsed = Number(value);
    const id = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    if (target === 'campaign') this.campaignFilter.set(id);
    if (target === 'operation') this.operationFilter.set(id);
    if (target === 'fieldTrip') this.fieldTripFilter.set(id);
    this.load(1);
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate();
    if (result.saved) this.load(1);
  }

  async view(item: RecursoProgramado): Promise<void> {
    await this.form.openDetail(item, 'view');
  }

  async edit(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'PROGRAMADO') return;
    const result = await this.form.openDetail(item, 'edit');
    if (result.saved) this.load();
  }

  async returnResource(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'EN_EJECUCION') return;
    const result = await this.form.openDetail(item, 'return');
    if (result.saved) this.load();
  }

  async consume(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'EN_EJECUCION') return;
    const result = await this.form.openDetail(item, 'consume');
    if (result.saved) this.load();
  }

  async assign(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'PROGRAMADO' || this.actionId()) return;

    const confirmation = await this.confirm.show({
      title: 'Asignar recurso',
      message: `El recurso #${item.recursoProgramadoId} pasará a ejecución y quedará asignado al destino programado.`,
      tone: 'primary',
      confirmLabel: 'Asignar',
      cancelLabel: 'Cancelar',
      requiresReason: false,
    });
    if (!confirmation.confirmed) return;

    this.actionId.set(item.recursoProgramadoId);
    this.assignUseCase
      .execute(item.recursoProgramadoId)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => { this.toast.success('Recurso asignado'); this.load(); },
        error: (error) => this.toast.error('No se pudo asignar el recurso', mapOpenApiError(error).message),
      });
  }

  async cancel(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'PROGRAMADO' || this.actionId()) return;

    const confirmation = await this.confirm.show({
      title: 'Cancelar programación',
      message: `La programación #${item.recursoProgramadoId} quedará cancelada.`,
      tone: 'danger',
      confirmLabel: 'Cancelar programación',
      cancelLabel: 'Volver',
      requiresReason: true,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Indica el motivo de la cancelación.',
      minimumReasonLength: 5,
    });
    if (!confirmation.confirmed || !confirmation.reason) return;

    this.actionId.set(item.recursoProgramadoId);
    this.cancelUseCase
      .execute(item.recursoProgramadoId, confirmation.reason)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => { this.toast.success('Programación cancelada'); this.load(); },
        error: (error) => this.toast.error('No se pudo cancelar', mapOpenApiError(error).message),
      });
  }

  resourceName(item: RecursoProgramado): string {
    return item.bien ?? item.suministro ?? 'Recurso';
  }

  resourceKind(item: RecursoProgramado): string {
    return item.bienInventarioId ? 'Bien / vehículo' : 'Suministro';
  }

  destination(item: RecursoProgramado): string {
    if (item.campaniaVentaId) return `Campaña #${item.campaniaVentaId}`;
    if (item.operativoVentaId) return `Operativo #${item.operativoVentaId}`;
    if (item.salidaCampoId) return `Salida #${item.salidaCampoId}`;
    return '—';
  }
}
