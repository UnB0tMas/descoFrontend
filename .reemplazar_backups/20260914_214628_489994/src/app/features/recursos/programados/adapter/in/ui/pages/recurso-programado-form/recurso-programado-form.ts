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
  faUtensils,
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
  readonly consumeIcon = faUtensils;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly refreshIcon = faRotate;

  private resolver: ((result: AdminModalResult<number>) => void) | null = null;

  readonly createForm = this.fb.nonNullable.group({
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

  async openCreate(): Promise<AdminModalResult<number>> {
    this.resetState('create');
    this.createForm.reset({
      destinoTipo: 'SALIDA',
      destinoId: 0,
      recursoTipo: 'BIEN',
      recursoId: 0,
      cantidadProgramada: 1,
      observacion: '',
    });
    this.createForm.controls.cantidadProgramada.disable({ emitEvent: false });
    this.dialogRef.nativeElement.showModal();
    this.loadDestinations();
    return this.resultPromise();
  }

  async openDetail(
    item: RecursoProgramado,
    mode: Exclude<RecursoProgramadoFormMode, 'create'>,
  ): Promise<AdminModalResult<number>> {
    this.resetState(mode);
    this.dialogRef.nativeElement.showModal();
    this.loadDestinations(false);
    this.loading.set(true);

    this.getUseCase
      .execute(item.recursoProgramadoId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => {
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
    return this.destinations().filter((item) => item.tipo === type);
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

    const uotId =
      this.uot.modo() === 'ESPECIFICA'
        ? this.uot.selectedId() ?? undefined
        : undefined;

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
    if (!detail || detail.bienInventarioId || this.consumeForm.invalid) return;

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
