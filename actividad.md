# DESCO Frontend — corrección de visibilidad de consumo

Parche incremental para `reemplazar_angular.py`. Reemplaza exclusivamente los 4 archivos completos indicados; conserva la tabla, filtros, paginación, asignaciones y devoluciones.

El listado ya recibe `cantidadPendiente` desde `logistica.PA_RecursoProgramado_Sel_Listado`, pero el mapeador anterior no lo exponía. Se agrega ese campo y se muestra "Registrar consumo" solo para suministros con entrega pendiente, sin bien patrimonial asociado. Se utiliza el icono de caja (`faBoxOpen`) en lugar del icono de comida.

## `src/app/features/recursos/programados/domain/recurso-programado.model.ts`

Ruta: `src/app/features/recursos/programados/domain/recurso-programado.model.ts`
Contenido: completo

```typescript
export type EstadoProcesoRecurso =
  | 'PROGRAMADO'
  | 'EN_EJECUCION'
  | 'COMPLETADO'
  | 'CANCELADO'
  | string;

export type TipoDestinoRecurso = 'CAMPANIA' | 'OPERATIVO' | 'SALIDA';
export type TipoRecursoProgramable = 'BIEN' | 'SUMINISTRO';

export interface DestinoRecursoProgramado {
  tipo: TipoDestinoRecurso;
  destinoId: number;
  uotId: number;
  uotCodigo: string | null;
  uotNombre: string | null;
  codigo: string | null;
  nombre: string;
  estadoProceso: string | null;
  fechaReferencia: string | null;
  descripcion: string | null;
}

export interface RecursoProgramado {
  recursoProgramadoId: number;
  campaniaVentaId: number | null;
  operativoVentaId: number | null;
  salidaCampoId: number | null;
  bienInventarioId: number | null;
  bien: string | null;
  suministroId: number | null;
  suministro: string | null;
  cantidadProgramada: number;
  estadoProceso: EstadoProcesoRecurso;
  fechaProgramacion: string | null;
  observacion: string | null;
  cantidadEjecutada: number;
  cantidadDevuelta: number;
  /** Saldo entregado pendiente de devolución o consumo, calculado en SQL Server. */
  cantidadPendiente: number;
}

export interface RecursoProgramadoMovimiento {
  recursoMovimientoId: number;
  tipoMovimiento: string;
  cantidad: number;
  fechaHora: string | null;
  observacion: string | null;
  usuario: string | null;
}

export interface RecursoProgramadoDetalle {
  recursoProgramadoId: number;
  campaniaVentaId: number | null;
  operativoVentaId: number | null;
  salidaCampoId: number | null;
  bienInventarioId: number | null;
  bien: string | null;
  estadoBien: string | null;
  suministroId: number | null;
  suministro: string | null;
  unidadMedida: string | null;
  cantidadProgramada: number;
  observacion: string | null;
  estado: boolean;
  estadoProceso: EstadoProcesoRecurso;
  usuarioProgramacionId: number | null;
  fechaProgramacion: string | null;
  usuarioCancelacionId: number | null;
  fechaCancelacion: string | null;
  motivoCancelacion: string | null;
  movimientos: readonly RecursoProgramadoMovimiento[];
}

export interface RecursoProgramadoCreate {
  campaniaVentaId?: number;
  operativoVentaId?: number;
  salidaCampoId?: number;
  bienInventarioId?: number;
  suministroId?: number;
  cantidadProgramada: number;
  observacion?: string;
}

export interface RecursoProgramadoUpdate {
  cantidadProgramada: number;
  observacion?: string;
}

export interface RecursoProgramadoDevolucion {
  cantidadDevuelta: number;
  observacion?: string;
}

export interface RecursoProgramadoConsumo { cantidadConsumida?: number; observacion?: string; }
```

## `src/app/features/recursos/programados/adapter/out/http/programados-http.mapper.ts`

Ruta: `src/app/features/recursos/programados/adapter/out/http/programados-http.mapper.ts`
Contenido: completo

```typescript
import { inject, Injectable } from '@angular/core';

import { AdminApiMapper } from '../../../../../administracion/shared/admin-api.mapper';
import { DisponibilidadRecurso } from '../../../domain/disponibilidad-recurso.model';
import {
  DestinoRecursoProgramado,
  RecursoProgramado,
  RecursoProgramadoDetalle,
  RecursoProgramadoMovimiento,
} from '../../../domain/recurso-programado.model';

@Injectable()
export class ProgramadosHttpMapper {
  private readonly api = inject(AdminApiMapper);

  page(response: unknown, size: number) {
    return this.api.page(response, (row) => this.summary(row), size);
  }

  detail(response: unknown): RecursoProgramadoDetalle {
    const row = this.api.record(this.api.data<unknown>(response));
    return {
      recursoProgramadoId: this.api.number(row['recursoProgramadoId']),
      campaniaVentaId: this.api.nullableNumber(row['campaniaVentaId']),
      operativoVentaId: this.api.nullableNumber(row['operativoVentaId']),
      salidaCampoId: this.api.nullableNumber(row['salidaCampoId']),
      bienInventarioId: this.api.nullableNumber(row['bienInventarioId']),
      bien: this.api.nullableString(row['bien']),
      estadoBien: this.api.nullableString(row['estadoBien']),
      suministroId: this.api.nullableNumber(row['suministroId']),
      suministro: this.api.nullableString(row['suministro']),
      unidadMedida: this.api.nullableString(row['unidadMedida']),
      cantidadProgramada: this.api.number(row['cantidadProgramada']),
      observacion: this.api.nullableString(row['observacion']),
      estado: this.api.boolean(row['estado']),
      estadoProceso: this.api.string(row['estadoProceso']),
      usuarioProgramacionId: this.api.nullableNumber(row['usuarioProgramacionId']),
      fechaProgramacion: this.api.nullableString(row['fechaProgramacion']),
      usuarioCancelacionId: this.api.nullableNumber(row['usuarioCancelacionId']),
      fechaCancelacion: this.api.nullableString(row['fechaCancelacion']),
      motivoCancelacion: this.api.nullableString(row['motivoCancelacion']),
      movimientos: this.api
        .array(row['movimientos'])
        .map((item) => this.movement(this.api.record(item))),
    };
  }

  destinations(response: unknown): readonly DestinoRecursoProgramado[] {
    const rows = this.api.array(this.api.data<unknown>(response));

    return rows.map((item) => {
      const row = this.api.record(item);
      const type = this.api.string(row['tipo']);

      return {
        tipo:
          type === 'CAMPANIA' || type === 'OPERATIVO' || type === 'SALIDA'
            ? type
            : 'SALIDA',
        destinoId: this.api.number(row['destinoId']),
        uotId: this.api.number(row['uotId']),
        uotCodigo: this.api.nullableString(row['uotCodigo']),
        uotNombre: this.api.nullableString(row['uotNombre']),
        codigo: this.api.nullableString(row['codigo']),
        nombre: this.api.string(row['nombre']),
        estadoProceso: this.api.nullableString(row['estadoProceso']),
        fechaReferencia: this.api.nullableString(row['fechaReferencia']),
        descripcion: this.api.nullableString(row['descripcion']),
      };
    });
  }

  availability(response: unknown): DisponibilidadRecurso {
    const row = this.api.record(this.api.data<unknown>(response));
    return {
      bienes: this.api.array(row['bienes']).map((item) => {
        const value = this.api.record(item);
        return {
          bienInventarioId: this.api.number(value['bienInventarioId']),
          uotId: this.api.number(value['uotId']),
          uotCodigo: this.api.nullableString(value['uotCodigo']),
          uotNombre: this.api.nullableString(value['uotNombre']),
          codigoPatrimonial: this.api.string(value['codigoPatrimonial']),
          nombre: this.api.string(value['nombre']),
          estadoBien: this.api.string(value['estadoBien']),
          disponible: this.api.boolean(value['disponible']),
        };
      }),
      suministros: this.api.array(row['suministros']).map((item) => {
        const value = this.api.record(item);
        return {
          suministroId: this.api.number(value['suministroId']),
          uotId: this.api.number(value['uotId']),
          uotCodigo: this.api.nullableString(value['uotCodigo']),
          uotNombre: this.api.nullableString(value['uotNombre']),
          codigo: this.api.string(value['codigo']),
          nombre: this.api.string(value['nombre']),
          unidadMedida: this.api.string(value['unidadMedida']),
          stockActual: this.api.number(value['stockActual']),
          stockReservado: this.api.number(value['stockReservado']),
          stockDisponible: this.api.number(value['stockDisponible']),
          stockMinimo: this.api.number(value['stockMinimo']),
          requiereReposicion: this.api.boolean(value['requiereReposicion']),
        };
      }),
    };
  }

  createdId(response: unknown): number {
    const row = this.api.record(this.api.data<unknown>(response));
    return this.api.number(row['recursoProgramadoId']);
  }

  void(response: unknown): void {
    this.api.void(response);
  }

  private summary(row: Record<string, unknown>): RecursoProgramado {
    return {
      recursoProgramadoId: this.api.number(row['recursoProgramadoId']),
      campaniaVentaId: this.api.nullableNumber(row['campaniaVentaId']),
      operativoVentaId: this.api.nullableNumber(row['operativoVentaId']),
      salidaCampoId: this.api.nullableNumber(row['salidaCampoId']),
      bienInventarioId: this.api.nullableNumber(row['bienInventarioId']),
      bien: this.api.nullableString(row['bien']),
      suministroId: this.api.nullableNumber(row['suministroId']),
      suministro: this.api.nullableString(row['suministro']),
      cantidadProgramada: this.api.number(row['cantidadProgramada']),
      estadoProceso: this.api.string(row['estadoProceso']),
      fechaProgramacion: this.api.nullableString(row['fechaProgramacion']),
      observacion: this.api.nullableString(row['observacion']),
      cantidadEjecutada: this.api.number(row['cantidadEjecutada']),
      cantidadDevuelta: this.api.number(row['cantidadDevuelta']),
      cantidadPendiente: this.api.number(row['cantidadPendiente']),
    };
  }

  private movement(row: Record<string, unknown>): RecursoProgramadoMovimiento {
    return {
      recursoMovimientoId: this.api.number(row['recursoMovimientoId']),
      tipoMovimiento: this.api.string(row['tipoMovimiento']),
      cantidad: this.api.number(row['cantidad']),
      fechaHora: this.api.nullableString(row['fechaHora']),
      observacion: this.api.nullableString(row['observacion']),
      usuario: this.api.nullableString(row['usuario']),
    };
  }
}
```

## `src/app/features/recursos/programados/adapter/in/ui/pages/recursos-programados-list/recursos-programados-list.ts`

Ruta: `src/app/features/recursos/programados/adapter/in/ui/pages/recursos-programados-list/recursos-programados-list.ts`
Contenido: completo

```typescript
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
```

## `src/app/features/recursos/programados/adapter/in/ui/pages/recurso-programado-form/recurso-programado-form.ts`

Ruta: `src/app/features/recursos/programados/adapter/in/ui/pages/recurso-programado-form/recurso-programado-form.ts`
Contenido: completo

```typescript
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRotateLeft,
  faBoxesStacked,
  faEye,
  faFloppyDisk,
  faPen,
  faPlus,
  faRotate,
  faBoxOpen,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ConsultarDisponibilidadRecursosUseCase } from '../../../../../application/use-case/consultar-disponibilidad-recursos.use-case';
import { EditarRecursoProgramadoUseCase } from '../../../../../application/use-case/editar-recurso-programado.use-case';
import { ListarDestinosRecursosUseCase } from '../../../../../application/use-case/listar-destinos-recursos.use-case';
import { ObtenerRecursoProgramadoUseCase } from '../../../../../application/use-case/obtener-recurso-programado.use-case';
import { ProgramarRecursoUseCase } from '../../../../../application/use-case/programar-recurso.use-case';
import { RegistrarConsumoRecursoUseCase } from '../../../../../application/use-case/registrar-consumo-recurso.use-case';
import { RegistrarDevolucionRecursoUseCase } from '../../../../../application/use-case/registrar-devolucion-recurso.use-case';
import { DisponibilidadRecurso } from '../../../../../domain/disponibilidad-recurso.model';
import {
  DestinoRecursoProgramado,
  RecursoProgramado,
  RecursoProgramadoDetalle,
  TipoDestinoRecurso,
  TipoRecursoProgramable,
} from '../../../../../domain/recurso-programado.model';

export type RecursoProgramadoFormMode =
  | 'create'
  | 'edit'
  | 'view'
  | 'return'
  | 'consume';

@Component({
  selector: 'app-recurso-programado-form',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, FaIconComponent, FormErrorComponent],
  templateUrl: './recurso-programado-form.html',
  styleUrl: './recurso-programado-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursoProgramadoFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly destinationsUseCase = inject(ListarDestinosRecursosUseCase);
  private readonly availabilityUseCase = inject(ConsultarDisponibilidadRecursosUseCase);
  private readonly getUseCase = inject(ObtenerRecursoProgramadoUseCase);
  private readonly programUseCase = inject(ProgramarRecursoUseCase);
  private readonly updateUseCase = inject(EditarRecursoProgramadoUseCase);
  private readonly returnUseCase = inject(RegistrarDevolucionRecursoUseCase);
  private readonly consumeUseCase = inject(RegistrarConsumoRecursoUseCase);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<RecursoProgramadoFormMode>('create');
  readonly loading = signal(false);
  readonly loadingDestinations = signal(false);
  readonly loadingAvailability = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly current = signal<RecursoProgramadoDetalle | null>(null);
  readonly destinations = signal<readonly DestinoRecursoProgramado[]>([]);
  readonly availability = signal<DisponibilidadRecurso>({
    bienes: [],
    suministros: [],
  });

  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly viewIcon = faEye;
  readonly resourceIcon = faBoxesStacked;
  readonly returnIcon = faArrowRotateLeft;
  readonly consumeIcon = faBoxOpen;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly refreshIcon = faRotate;

  private resolver: ((result: AdminModalResult<number>) => void) | null = null;

  readonly createForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    destinoTipo: ['SALIDA' as TipoDestinoRecurso, [Validators.required]],
    destinoId: [0, [Validators.required, Validators.min(1)]],
    recursoTipo: ['BIEN' as TipoRecursoProgramable, [Validators.required]],
    recursoId: [0, [Validators.required, Validators.min(1)]],
    cantidadProgramada: [1, [Validators.required, Validators.min(0.001)]],
    observacion: ['', [Validators.maxLength(300)]],
  });

  readonly editForm = this.fb.nonNullable.group({
    cantidadProgramada: [1, [Validators.required, Validators.min(0.001)]],
    observacion: ['', [Validators.maxLength(300)]],
  });

  readonly returnForm = this.fb.nonNullable.group({
    cantidadDevuelta: [1, [Validators.required, Validators.min(0.001)]],
    observacion: ['', [Validators.maxLength(300)]],
  });

  readonly consumeForm = this.fb.nonNullable.group({
    cantidadConsumida: [0, [Validators.min(0.001)]],
    observacion: ['', [Validators.maxLength(300)]],
  });

  readonly availableAssets = computed(() =>
    this.availability().bienes.filter((item) => item.disponible),
  );

  selectedSupply() {
    const id = Number(this.createForm.controls.recursoId.value);
    return (
      this.availability().suministros.find(
        (item) => item.suministroId === id,
      ) ?? null
    );
  }

  async openCreate(preferredUotId?: number): Promise<AdminModalResult<number>> {
    this.resetState('create');

    const uotId = this.uot.isSpecific()
      ? this.uot.selectedId() ?? 0
      : preferredUotId && preferredUotId > 0
        ? preferredUotId
        : 0;

    this.createForm.reset({
      uotId,
      destinoTipo: 'SALIDA',
      destinoId: 0,
      recursoTipo: 'BIEN',
      recursoId: 0,
      cantidadProgramada: 1,
      observacion: '',
    });
    this.createForm.controls.uotId[
      this.uot.isSpecific() ? 'disable' : 'enable'
    ]({ emitEvent: false });
    this.createForm.controls.cantidadProgramada.disable({ emitEvent: false });
    this.dialogRef.nativeElement.showModal();

    if (uotId > 0) {
      this.loadDestinations();
    }

    return this.resultPromise();
  }

  async openDetail(
    item: RecursoProgramado,
    mode: Exclude<RecursoProgramadoFormMode, 'create'>,
  ): Promise<AdminModalResult<number>> {
    if (
      mode === 'consume' &&
      ((item.bienInventarioId != null && item.bienInventarioId > 0) ||
       !!item.bien?.trim() || item.suministroId == null ||
       item.suministroId <= 0 || !item.suministro?.trim() ||
       !Number.isFinite(item.cantidadPendiente) || item.cantidadPendiente <= 0)
    ) {
      this.toast.error(
        'Consumo no aplicable',
        'Los bienes inventariables se devuelven. Solo se registra consumo de suministros.',
      );
      return { saved: false, value: null };
    }

    this.resetState(mode);
    this.dialogRef.nativeElement.showModal();
    this.loadDestinations(false);
    this.loading.set(true);

    this.getUseCase
      .execute(item.recursoProgramadoId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
          if (
            mode === 'consume' &&
            ((detail.bienInventarioId != null && detail.bienInventarioId > 0) ||
             !!detail.bien?.trim() || detail.suministroId == null ||
             detail.suministroId <= 0 || !detail.suministro?.trim() ||
             this.pendingQuantity(detail) <= 0)
          ) {
            this.mode.set('view');
            this.errorMessage.set(
              'Este recurso es un bien inventariable: corresponde registrarle devolución, no consumo.',
            );
          }
          this.current.set(detail);
          this.editForm.reset({
            cantidadProgramada: detail.cantidadProgramada,
            observacion: detail.observacion ?? '',
          });
          this.returnForm.reset({
            cantidadDevuelta: detail.bienInventarioId
              ? 1
              : Math.max(0.001, detail.cantidadProgramada),
            observacion: '',
          });
          this.consumeForm.reset({
            cantidadConsumida: this.pendingQuantity(detail),
            observacion: '',
          });
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });

    return this.resultPromise();
  }

  destinationsForSelectedType(): readonly DestinoRecursoProgramado[] {
    const type = this.createForm.controls.destinoTipo.value;
    const uotId = Number(this.createForm.getRawValue().uotId);

    return this.destinations().filter(
      (item) =>
        item.tipo === type &&
        (uotId <= 0 || item.uotId === uotId),
    );
  }

  selectedDestination(): DestinoRecursoProgramado | null {
    const type = this.createForm.controls.destinoTipo.value;
    const id = Number(this.createForm.controls.destinoId.value);
    return (
      this.destinations().find(
        (item) => item.tipo === type && item.destinoId === id,
      ) ?? null
    );
  }

  destinationOptionLabel(destination: DestinoRecursoProgramado): string {
    const code = destination.codigo ? `${destination.codigo} · ` : '';
    const unit = destination.uotNombre ? ` · ${destination.uotNombre}` : '';
    return `${code}${destination.nombre}${unit}`;
  }

  changeUot(value: string): void {
    const parsed = Number(value);
    const uotId = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;

    this.createForm.patchValue({
      uotId,
      destinoId: 0,
      recursoId: 0,
    });
    this.destinations.set([]);
    this.availability.set({ bienes: [], suministros: [] });
    this.errorMessage.set(null);

    if (uotId > 0) {
      this.loadDestinations();
    }
  }

  changeDestinationType(value: string): void {
    const type = value as TipoDestinoRecurso;
    this.createForm.patchValue({
      destinoTipo: type,
      destinoId: 0,
      recursoId: 0,
    });
    this.availability.set({ bienes: [], suministros: [] });
    this.errorMessage.set(null);
  }

  changeDestination(value: string): void {
    const parsed = Number(value);
    this.createForm.controls.destinoId.setValue(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    );
    this.createForm.controls.recursoId.setValue(0);
    this.availability.set({ bienes: [], suministros: [] });
    this.errorMessage.set(null);

    if (this.selectedDestination()) {
      this.loadAvailability();
    }
  }

  changeResourceType(type: string): void {
    const resourceType = type as TipoRecursoProgramable;
    this.createForm.patchValue({ recursoTipo: resourceType, recursoId: 0 });

    if (resourceType === 'BIEN') {
      this.createForm.controls.cantidadProgramada.setValue(1);
      this.createForm.controls.cantidadProgramada.disable({ emitEvent: false });
    } else {
      this.createForm.controls.cantidadProgramada.enable({ emitEvent: false });
      this.createForm.controls.cantidadProgramada.setValue(1);
    }
  }

  loadDestinations(reportError = true): void {
    if (this.loadingDestinations()) return;

    const createUotId = Number(this.createForm.getRawValue().uotId);
    const uotId =
      this.mode() === 'create'
        ? createUotId > 0
          ? createUotId
          : undefined
        : this.uot.isSpecific()
          ? this.uot.selectedId() ?? undefined
          : undefined;

    if (this.mode() === 'create' && !uotId) {
      this.destinations.set([]);
      return;
    }

    this.loadingDestinations.set(true);
    this.destinationsUseCase
      .execute(uotId)
      .pipe(finalize(() => this.loadingDestinations.set(false)))
      .subscribe({
        next: (destinations) => this.destinations.set(destinations),
        error: (error) => {
          if (reportError) {
            this.errorMessage.set(mapOpenApiError(error).message);
          }
        },
      });
  }

  loadAvailability(): void {
    const destination = this.selectedDestination();

    if (!destination) {
      this.availability.set({ bienes: [], suministros: [] });
      this.errorMessage.set('Seleccione un destino antes de consultar recursos.');
      return;
    }

    if (this.loadingAvailability()) return;

    this.loadingAvailability.set(true);
    this.errorMessage.set(null);
    this.availabilityUseCase
      .execute(destination.uotId)
      .pipe(finalize(() => this.loadingAvailability.set(false)))
      .subscribe({
        next: (availability) => this.availability.set(availability),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  save(): void {
    const mode = this.mode();
    if (this.saving() || this.loading() || mode === 'view') return;

    if (mode === 'create') {
      this.saveCreate();
    } else if (mode === 'edit') {
      this.saveEdit();
    } else if (mode === 'return') {
      this.saveReturn();
    } else {
      this.saveConsume();
    }
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  title(): string {
    switch (this.mode()) {
      case 'create':
        return 'Programar recurso';
      case 'edit':
        return 'Editar programación';
      case 'return':
        return 'Registrar devolución';
      case 'consume':
        return 'Registrar consumo';
      default:
        return 'Detalle del recurso programado';
    }
  }

  icon() {
    switch (this.mode()) {
      case 'create':
        return this.addIcon;
      case 'edit':
        return this.editIcon;
      case 'return':
        return this.returnIcon;
      case 'consume':
        return this.consumeIcon;
      default:
        return this.viewIcon;
    }
  }

  destinationLabel(detail: RecursoProgramadoDetalle): string {
    const identity = this.destinationIdentity(detail);

    if (identity) {
      const destination = this.destinations().find(
        (item) =>
          item.tipo === identity.tipo && item.destinoId === identity.id,
      );
      if (destination) return this.destinationOptionLabel(destination);

      if (identity.tipo === 'CAMPANIA') return `Campaña #${identity.id}`;
      if (identity.tipo === 'OPERATIVO') return `Operativo #${identity.id}`;
      return `Salida de campo #${identity.id}`;
    }

    return 'Sin destino';
  }

  resourceLabel(detail: RecursoProgramadoDetalle): string {
    return detail.bien ?? detail.suministro ?? 'Recurso';
  }

  pendingQuantity(detail: RecursoProgramadoDetalle): number {
    const delivered = detail.movimientos
      .filter((movement) => movement.tipoMovimiento === 'ENTREGA')
      .reduce((sum, movement) => sum + movement.cantidad, 0);
    const returned = detail.movimientos
      .filter((movement) => movement.tipoMovimiento === 'DEVOLUCION')
      .reduce((sum, movement) => sum + movement.cantidad, 0);
    const consumed = detail.movimientos
      .filter((movement) => movement.tipoMovimiento === 'CONSUMO')
      .reduce((sum, movement) => sum + movement.cantidad, 0);

    return Math.max(0, Number((delivered - returned - consumed).toFixed(3)));
  }

  private saveCreate(): void {
    this.createForm.markAllAsTouched();

    if (
      this.createForm.invalid ||
      this.loadingDestinations() ||
      this.loadingAvailability()
    ) {
      return;
    }

    const destination = this.selectedDestination();
    if (!destination) {
      this.errorMessage.set('Seleccione un destino válido.');
      return;
    }

    const raw = this.createForm.getRawValue();
    const resourceType = raw.recursoTipo as TipoRecursoProgramable;
    const quantity =
      resourceType === 'BIEN' ? 1 : Number(raw.cantidadProgramada);
    const selectedSupply = this.selectedSupply();

    if (
      resourceType === 'SUMINISTRO' &&
      selectedSupply &&
      quantity > selectedSupply.stockDisponible
    ) {
      this.errorMessage.set(
        `La cantidad supera el stock disponible (${selectedSupply.stockDisponible} ${selectedSupply.unidadMedida}).`,
      );
      return;
    }

    const input = {
      campaniaVentaId:
        destination.tipo === 'CAMPANIA' ? destination.destinoId : undefined,
      operativoVentaId:
        destination.tipo === 'OPERATIVO' ? destination.destinoId : undefined,
      salidaCampoId:
        destination.tipo === 'SALIDA' ? destination.destinoId : undefined,
      bienInventarioId:
        resourceType === 'BIEN' ? Number(raw.recursoId) : undefined,
      suministroId:
        resourceType === 'SUMINISTRO' ? Number(raw.recursoId) : undefined,
      cantidadProgramada: quantity,
      observacion: raw.observacion.trim() || undefined,
    };

    this.saving.set(true);
    this.errorMessage.set(null);
    this.programUseCase
      .execute(input)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (id) => {
          this.toast.success('Recurso programado');
          this.finish({ saved: true, value: id });
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private saveEdit(): void {
    this.editForm.markAllAsTouched();
    const detail = this.current();
    if (!detail || this.editForm.invalid) return;

    const raw = this.editForm.getRawValue();
    const quantity = detail.bienInventarioId
      ? 1
      : Number(raw.cantidadProgramada);

    this.saving.set(true);
    this.errorMessage.set(null);
    this.updateUseCase
      .execute(detail.recursoProgramadoId, {
        cantidadProgramada: quantity,
        observacion: raw.observacion.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Programación actualizada');
          this.finish({ saved: true, value: detail.recursoProgramadoId });
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private saveReturn(): void {
    this.returnForm.markAllAsTouched();
    const detail = this.current();
    if (!detail || this.returnForm.invalid) return;

    const raw = this.returnForm.getRawValue();
    const quantity = detail.bienInventarioId
      ? 1
      : Number(raw.cantidadDevuelta);
    const alreadyReturned = detail.movimientos
      .filter((movement) => movement.tipoMovimiento === 'DEVOLUCION')
      .reduce((sum, movement) => sum + movement.cantidad, 0);

    if (quantity + alreadyReturned > detail.cantidadProgramada) {
      this.errorMessage.set(
        'La devolución supera la cantidad programada pendiente.',
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.returnUseCase
      .execute(detail.recursoProgramadoId, {
        cantidadDevuelta: quantity,
        observacion: raw.observacion.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Devolución registrada');
          this.finish({ saved: true, value: detail.recursoProgramadoId });
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private saveConsume(): void {
    this.consumeForm.markAllAsTouched();
    const detail = this.current();
    if (
      !detail ||
      (detail.bienInventarioId != null && detail.bienInventarioId > 0) ||
      !!detail.bien?.trim() ||
      detail.suministroId == null ||
      detail.suministroId <= 0 ||
      !detail.suministro?.trim() ||
      this.pendingQuantity(detail) <= 0 ||
      this.consumeForm.invalid
    ) return;

    const raw = this.consumeForm.getRawValue();
    const pending = this.pendingQuantity(detail);
    const quantity = Number(raw.cantidadConsumida);

    if (quantity > pending) {
      this.errorMessage.set('La cantidad supera el pendiente por regularizar.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.consumeUseCase
      .execute(detail.recursoProgramadoId, {
        cantidadConsumida: quantity > 0 ? quantity : undefined,
        observacion: raw.observacion.trim() || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Consumo registrado');
          this.finish({ saved: true, value: detail.recursoProgramadoId });
        },
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private destinationIdentity(
    detail: RecursoProgramadoDetalle,
  ): { tipo: TipoDestinoRecurso; id: number } | null {
    if (detail.campaniaVentaId) {
      return { tipo: 'CAMPANIA', id: detail.campaniaVentaId };
    }
    if (detail.operativoVentaId) {
      return { tipo: 'OPERATIVO', id: detail.operativoVentaId };
    }
    if (detail.salidaCampoId) {
      return { tipo: 'SALIDA', id: detail.salidaCampoId };
    }
    return null;
  }

  private resetState(mode: RecursoProgramadoFormMode): void {
    this.mode.set(mode);
    this.loading.set(false);
    this.loadingDestinations.set(false);
    this.loadingAvailability.set(false);
    this.current.set(null);
    this.destinations.set([]);
    this.errorMessage.set(null);
    this.availability.set({ bienes: [], suministros: [] });
    this.createForm.controls.cantidadProgramada.disable({ emitEvent: false });
  }

  private resultPromise(): Promise<AdminModalResult<number>> {
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: AdminModalResult<number>): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.destinations.set([]);
    this.availability.set({ bienes: [], suministros: [] });
    this.errorMessage.set(null);
  }
}
```

