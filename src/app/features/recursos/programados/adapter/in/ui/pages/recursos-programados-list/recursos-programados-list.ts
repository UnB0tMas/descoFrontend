import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
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
  faBoxOpen,
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
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { AsignarRecursoUseCase } from '../../../../../application/use-case/asignar-recurso.use-case';
import { CancelarRecursoProgramadoUseCase } from '../../../../../application/use-case/cancelar-recurso-programado.use-case';
import { ListarDestinosRecursosUseCase } from '../../../../../application/use-case/listar-destinos-recursos.use-case';
import { ListarRecursosProgramadosUseCase } from '../../../../../application/use-case/listar-recursos-programados.use-case';
import {
  DestinoRecursoProgramado,
  RecursoProgramado,
  TipoDestinoRecurso,
} from '../../../../../domain/recurso-programado.model';
import { RecursoProgramadoFormComponent } from '../recurso-programado-form/recurso-programado-form';

@Component({
  selector: 'app-recursos-programados-list-page',
  standalone: true,
  imports: [
    DatePipe,
    FaIconComponent,
    RouterLink,
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
  private readonly destinationsUseCase = inject(ListarDestinosRecursosUseCase);
  private readonly assignUseCase = inject(AsignarRecursoUseCase);
  private readonly cancelUseCase = inject(CancelarRecursoProgramadoUseCase);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(true);
  readonly destinationsLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionId = signal<number | null>(null);
  readonly result = signal<PageResult<RecursoProgramado>>(emptyPageResult(20));
  readonly destinations = signal<readonly DestinoRecursoProgramado[]>([]);

  readonly stateFilter = signal('');
  readonly destinationFilter = signal('');

  readonly pageIcon = faBoxesStacked;
  readonly addIcon = faPlus;
  readonly viewIcon = faEye;
  readonly editIcon = faPen;
  readonly assignIcon = faCheck;
  readonly returnIcon = faArrowRotateLeft;
  readonly consumeIcon = faBoxOpen;
  readonly cancelIcon = faBan;
  readonly refreshIcon = faRotate;

  ngOnInit(): void {
    this.loadDestinations();
    this.load(1);
  }

  load(page = this.result().page, size = this.result().size): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const destination = this.selectedFilterDestination();

    this.listUseCase
      .execute({
        estadoProceso: this.stateFilter() || undefined,
        campaniaVentaId:
          destination?.tipo === 'CAMPANIA'
            ? destination.destinoId
            : undefined,
        operativoVentaId:
          destination?.tipo === 'OPERATIVO'
            ? destination.destinoId
            : undefined,
        salidaCampoId:
          destination?.tipo === 'SALIDA'
            ? destination.destinoId
            : undefined,
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

  loadDestinations(): void {
    if (this.destinationsLoading()) return;

    const uotId =
      this.uot.isSpecific()
        ? this.uot.selectedId() ?? undefined
        : undefined;

    this.destinationsLoading.set(true);
    this.destinationsUseCase
      .execute(uotId)
      .pipe(finalize(() => this.destinationsLoading.set(false)))
      .subscribe({
        next: (items) => this.destinations.set(items),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onDestinationFilter(value: string): void {
    this.destinationFilter.set(value);
    this.load(1);
  }

  destinationKey(destination: DestinoRecursoProgramado): string {
    return `${destination.tipo}:${destination.destinoId}`;
  }

  destinationOptionLabel(destination: DestinoRecursoProgramado): string {
    const type = this.destinationTypeLabel(destination.tipo);
    const code = destination.codigo ? `${destination.codigo} · ` : '';
    const unit = destination.uotNombre ? ` · ${destination.uotNombre}` : '';
    return `${type} · ${code}${destination.nombre}${unit}`;
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate(
      this.uot.isSpecific() ? this.uot.selectedId() ?? undefined : undefined,
    );
    if (result.saved) {
      this.loadDestinations();
      this.load(1);
    }
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

  // Solo hay acción cuando existe suministro real y saldo entregado pendiente.
  // No depender únicamente de los IDs: el backend también devuelve el nombre del bien.
  canRegisterConsumption(item: RecursoProgramado): boolean {
    return (
      item.estadoProceso === 'EN_EJECUCION' &&
      (item.bienInventarioId == null || item.bienInventarioId <= 0) &&
      !item.bien?.trim() &&
      item.suministroId != null &&
      item.suministroId > 0 &&
      !!item.suministro?.trim() &&
      Number.isFinite(item.cantidadPendiente) &&
      item.cantidadPendiente > 0
    );
  }

  async consume(item: RecursoProgramado): Promise<void> {
    if (!this.canRegisterConsumption(item)) return;
    const result = await this.form.openDetail(item, 'consume');
    if (result.saved) this.load();
  }

  async assign(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'PROGRAMADO' || this.actionId()) return;

    const confirmation = await this.confirm.show({
      title: 'Asignar recurso',
      message: `El recurso ${this.resourceName(item)} pasará a ejecución y quedará asignado a ${this.destination(item)}.`,
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
        next: () => {
          this.toast.success('Recurso asignado');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo asignar el recurso',
            mapOpenApiError(error).message,
          ),
      });
  }

  async cancel(item: RecursoProgramado): Promise<void> {
    if (item.estadoProceso !== 'PROGRAMADO' || this.actionId()) return;

    const confirmation = await this.confirm.show({
      title: 'Cancelar programación',
      message: `La programación de ${this.resourceName(item)} para ${this.destination(item)} quedará cancelada.`,
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
        next: () => {
          this.toast.success('Programación cancelada');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo cancelar',
            mapOpenApiError(error).message,
          ),
      });
  }

  resourceName(item: RecursoProgramado): string {
    return item.bien ?? item.suministro ?? 'Recurso';
  }

  resourceKind(item: RecursoProgramado): string {
    return (item.bienInventarioId != null && item.bienInventarioId > 0) || !!item.bien?.trim()
      ? 'Bien / vehículo'
      : 'Suministro';
  }

  resourceUot(item: RecursoProgramado): string {
    const identity = this.destinationIdentity(item);
    if (!identity) return '—';

    const destination = this.destinations().find(
      (candidate) =>
        candidate.tipo === identity.tipo &&
        candidate.destinoId === identity.id,
    );

    if (!destination) return '—';

    const code = destination.uotCodigo ? `${destination.uotCodigo} · ` : '';
    return `${code}${destination.uotNombre ?? 'UOT'}`;
  }

  destination(item: RecursoProgramado): string {
    const identity = this.destinationIdentity(item);
    if (!identity) return '—';

    const destination = this.destinations().find(
      (candidate) =>
        candidate.tipo === identity.tipo &&
        candidate.destinoId === identity.id,
    );

    if (destination) {
      const code = destination.codigo ? `${destination.codigo} · ` : '';
      return `${code}${destination.nombre}`;
    }

    if (identity.tipo === 'CAMPANIA') return `Campaña #${identity.id}`;
    if (identity.tipo === 'OPERATIVO') return `Operativo #${identity.id}`;
    return `Salida de campo #${identity.id}`;
  }

  destinationType(item: RecursoProgramado): string {
    const identity = this.destinationIdentity(item);
    return identity ? this.destinationTypeLabel(identity.tipo) : 'Sin destino';
  }

  private selectedFilterDestination(): DestinoRecursoProgramado | null {
    const key = this.destinationFilter();
    if (!key) return null;
    return this.destinations().find((item) => this.destinationKey(item) === key) ?? null;
  }

  private destinationIdentity(
    item: RecursoProgramado,
  ): { tipo: TipoDestinoRecurso; id: number } | null {
    if (item.campaniaVentaId) {
      return { tipo: 'CAMPANIA', id: item.campaniaVentaId };
    }
    if (item.operativoVentaId) {
      return { tipo: 'OPERATIVO', id: item.operativoVentaId };
    }
    if (item.salidaCampoId) {
      return { tipo: 'SALIDA', id: item.salidaCampoId };
    }
    return null;
  }

  private destinationTypeLabel(type: TipoDestinoRecurso): string {
    if (type === 'CAMPANIA') return 'Campaña';
    if (type === 'OPERATIVO') return 'Operativo';
    return 'Salida';
  }
}
