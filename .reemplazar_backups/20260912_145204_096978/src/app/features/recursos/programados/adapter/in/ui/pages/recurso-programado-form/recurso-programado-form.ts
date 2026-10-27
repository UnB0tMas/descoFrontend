import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
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
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { ConsultarDisponibilidadRecursosUseCase } from '../../../../../application/use-case/consultar-disponibilidad-recursos.use-case';
import { EditarRecursoProgramadoUseCase } from '../../../../../application/use-case/editar-recurso-programado.use-case';
import { ObtenerRecursoProgramadoUseCase } from '../../../../../application/use-case/obtener-recurso-programado.use-case';
import { ProgramarRecursoUseCase } from '../../../../../application/use-case/programar-recurso.use-case';
import { RegistrarDevolucionRecursoUseCase } from '../../../../../application/use-case/registrar-devolucion-recurso.use-case';
import { DisponibilidadRecurso } from '../../../../../domain/disponibilidad-recurso.model';
import {
  RecursoProgramado,
  RecursoProgramadoDetalle,
  TipoDestinoRecurso,
  TipoRecursoProgramable,
} from '../../../../../domain/recurso-programado.model';

export type RecursoProgramadoFormMode = 'create' | 'edit' | 'view' | 'return';

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
  private readonly availabilityUseCase = inject(ConsultarDisponibilidadRecursosUseCase);
  private readonly getUseCase = inject(ObtenerRecursoProgramadoUseCase);
  private readonly programUseCase = inject(ProgramarRecursoUseCase);
  private readonly updateUseCase = inject(EditarRecursoProgramadoUseCase);
  private readonly returnUseCase = inject(RegistrarDevolucionRecursoUseCase);
  private readonly toast = inject(ToastService);

  readonly mode = signal<RecursoProgramadoFormMode>('create');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly current = signal<RecursoProgramadoDetalle | null>(null);
  readonly availability = signal<DisponibilidadRecurso>({ bienes: [], suministros: [] });

  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly viewIcon = faEye;
  readonly resourceIcon = faBoxesStacked;
  readonly returnIcon = faArrowRotateLeft;
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
    observacion: ['', [Validators.maxLength(500)]],
  });

  readonly editForm = this.fb.nonNullable.group({
    cantidadProgramada: [1, [Validators.required, Validators.min(0.001)]],
    observacion: ['', [Validators.maxLength(500)]],
  });

  readonly returnForm = this.fb.nonNullable.group({
    cantidadDevuelta: [1, [Validators.required, Validators.min(0.001)]],
    observacion: ['', [Validators.maxLength(500)]],
  });

  readonly availableAssets = computed(() =>
    this.availability().bienes.filter((item) => item.disponible),
  );

  readonly selectedSupply = computed(() => {
    const id = Number(this.createForm.controls.recursoId.value);
    return this.availability().suministros.find((item) => item.suministroId === id) ?? null;
  });

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
    this.dialogRef.nativeElement.showModal();
    this.loadAvailability();
    return this.resultPromise();
  }

  async openDetail(
    item: RecursoProgramado,
    mode: Exclude<RecursoProgramadoFormMode, 'create'>,
  ): Promise<AdminModalResult<number>> {
    this.resetState(mode);
    this.dialogRef.nativeElement.showModal();
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
            cantidadDevuelta: detail.bienInventarioId ? 1 : Math.max(0.001, detail.cantidadProgramada),
            observacion: '',
          });
        },
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });

    return this.resultPromise();
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

  loadAvailability(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.availabilityUseCase
      .execute()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (availability) => this.availability.set(availability),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  save(): void {
    const mode = this.mode();
    if (this.saving() || this.loading() || mode === 'view') return;

    if (mode === 'create') {
      this.saveCreate();
    } else if (mode === 'edit') {
      this.saveEdit();
    } else {
      this.saveReturn();
    }
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  title(): string {
    switch (this.mode()) {
      case 'create': return 'Programar recurso';
      case 'edit': return 'Editar programación';
      case 'return': return 'Registrar devolución';
      default: return 'Detalle del recurso programado';
    }
  }

  icon() {
    switch (this.mode()) {
      case 'create': return this.addIcon;
      case 'edit': return this.editIcon;
      case 'return': return this.returnIcon;
      default: return this.viewIcon;
    }
  }

  destinationLabel(detail: RecursoProgramadoDetalle): string {
    if (detail.campaniaVentaId) return `Campaña #${detail.campaniaVentaId}`;
    if (detail.operativoVentaId) return `Operativo #${detail.operativoVentaId}`;
    if (detail.salidaCampoId) return `Salida de campo #${detail.salidaCampoId}`;
    return 'Sin destino';
  }

  resourceLabel(detail: RecursoProgramadoDetalle): string {
    return detail.bien ?? detail.suministro ?? 'Recurso';
  }

  private saveCreate(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;

    const raw = this.createForm.getRawValue();
    const resourceType = raw.recursoTipo as TipoRecursoProgramable;
    const quantity = resourceType === 'BIEN' ? 1 : Number(raw.cantidadProgramada);
    const selectedSupply = this.selectedSupply();

    if (resourceType === 'SUMINISTRO' && selectedSupply && quantity > selectedSupply.stockDisponible) {
      this.errorMessage.set(`La cantidad supera el stock disponible (${selectedSupply.stockDisponible} ${selectedSupply.unidadMedida}).`);
      return;
    }

    const destinationId = Number(raw.destinoId);
    const input = {
      campaniaVentaId: raw.destinoTipo === 'CAMPANIA' ? destinationId : undefined,
      operativoVentaId: raw.destinoTipo === 'OPERATIVO' ? destinationId : undefined,
      salidaCampoId: raw.destinoTipo === 'SALIDA' ? destinationId : undefined,
      bienInventarioId: resourceType === 'BIEN' ? Number(raw.recursoId) : undefined,
      suministroId: resourceType === 'SUMINISTRO' ? Number(raw.recursoId) : undefined,
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
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private saveEdit(): void {
    this.editForm.markAllAsTouched();
    const detail = this.current();
    if (!detail || this.editForm.invalid) return;

    const raw = this.editForm.getRawValue();
    const quantity = detail.bienInventarioId ? 1 : Number(raw.cantidadProgramada);

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
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private saveReturn(): void {
    this.returnForm.markAllAsTouched();
    const detail = this.current();
    if (!detail || this.returnForm.invalid) return;

    const raw = this.returnForm.getRawValue();
    const quantity = detail.bienInventarioId ? 1 : Number(raw.cantidadDevuelta);
    const alreadyReturned = detail.movimientos
      .filter((movement) => movement.tipoMovimiento === 'DEVOLUCION')
      .reduce((sum, movement) => sum + movement.cantidad, 0);

    if (quantity + alreadyReturned > detail.cantidadProgramada) {
      this.errorMessage.set('La devolución supera la cantidad programada pendiente.');
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
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  private resetState(mode: RecursoProgramadoFormMode): void {
    this.mode.set(mode);
    this.current.set(null);
    this.errorMessage.set(null);
    this.availability.set({ bienes: [], suministros: [] });
    this.createForm.controls.cantidadProgramada.disable({ emitEvent: false });
  }

  private resultPromise(): Promise<AdminModalResult<number>> {
    return new Promise((resolve) => { this.resolver = resolve; });
  }

  private finish(result: AdminModalResult<number>): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
