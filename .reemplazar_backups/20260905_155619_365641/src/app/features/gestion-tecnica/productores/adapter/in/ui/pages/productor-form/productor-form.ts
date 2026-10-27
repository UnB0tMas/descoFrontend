import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faPen, faUserPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearProductorUseCase } from '../../../../../application/use-case/crear-productor.use-case';
import { EditarProductorUseCase } from '../../../../../application/use-case/editar-productor.use-case';
import { ProductorDetalle } from '../../../../../domain/productor-detalle.model';
import {
  Productor,
  SituacionMembresia,
  TipoDocumentoProductor,
} from '../../../../../domain/productor.model';

@Component({
  selector: 'app-productor-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
  ],
  templateUrl: './productor-form.html',
  styleUrl: './productor-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductorFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly createUseCase = inject(CrearProductorUseCase);
  private readonly updateUseCase = inject(EditarProductorUseCase);
  private readonly toast = inject(ToastService);

  readonly current = signal<Productor | ProductorDetalle | null>(null);
  readonly associations = signal<readonly AdminSelectOption[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);

  readonly addIcon = faUserPlus;
  readonly editIcon = faPen;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;

  readonly documentTypes: readonly {
    value: TipoDocumentoProductor;
    label: string;
  }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'OTRO', label: 'Otro' },
  ];

  readonly memberships: readonly {
    value: SituacionMembresia;
    label: string;
  }[] = [
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'SUSPENDIDO', label: 'Suspendido' },
  ];

  private resolver: ((result: AdminModalResult<number>) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    tipoDocumento: ['DNI' as TipoDocumentoProductor, [Validators.required]],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(30)]],
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80)]],
    apellidoMaterno: ['', [Validators.maxLength(80)]],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    fechaNacimiento: [''],
    distritoCodigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    centroPobladoId: [0],
    referencia: ['', [Validators.maxLength(300)]],
    fechaAlta: ['', [Validators.required]],
    asociacionId: [0, [Validators.required, Validators.min(1)]],
    fechaDesde: ['', [Validators.required]],
    situacionMembresia: ['ACTIVO' as SituacionMembresia, [Validators.required]],
  });

  open(
    associations: readonly AdminSelectOption[],
    producer: Productor | ProductorDetalle | null = null,
  ): Promise<AdminModalResult<number>> {
    this.associations.set(associations);
    this.current.set(producer);
    this.errorMessage.set(null);

    const detail = producer && 'fechaNacimiento' in producer
      ? producer as ProductorDetalle
      : null;
    const today = this.today();

    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(detail?.centroPobladoId ?? null);

    this.form.reset({
      tipoDocumento: (producer?.tipoDocumento as TipoDocumentoProductor) || 'DNI',
      numeroDocumento: producer?.numeroDocumento ?? '',
      nombres: producer?.nombres ?? '',
      apellidoPaterno: producer?.apellidoPaterno ?? '',
      apellidoMaterno: producer?.apellidoMaterno ?? '',
      telefono: producer?.telefono ?? '',
      correo: producer?.correo ?? '',
      fechaNacimiento: detail?.fechaNacimiento ?? '',
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      fechaAlta: producer?.fechaAlta ?? today,
      asociacionId: producer?.asociacionId ?? associations[0]?.value ?? 0,
      fechaDesde:
        detail?.afiliaciones.find((item) => item.estado)?.fechaDesde ??
        producer?.fechaAlta ??
        today,
      situacionMembresia:
        (producer?.situacionMembresia as SituacionMembresia) || 'ACTIVO',
    });

    this.form.controls.fechaAlta[producer ? 'disable' : 'enable']({
      emitEvent: false,
    });

    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  setGeography(selection: GeographySelection): void {
    this.form.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.form.controls.distritoCodigo.markAsTouched();
  }

  save(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.saving()) {
      return;
    }

    const current = this.current();
    const raw = this.form.getRawValue();

    const common = {
      tipoDocumento: raw.tipoDocumento,
      numeroDocumento: raw.numeroDocumento.trim(),
      nombres: raw.nombres.trim(),
      apellidoPaterno: raw.apellidoPaterno.trim(),
      apellidoMaterno: raw.apellidoMaterno.trim() || undefined,
      telefono: raw.telefono.trim() || undefined,
      correo: raw.correo.trim() || undefined,
      fechaNacimiento: raw.fechaNacimiento || undefined,
      asociacionId: Number(raw.asociacionId),
      fechaDesde: raw.fechaDesde,
      situacionMembresia: raw.situacionMembresia,
      ubicacion: {
        distritoCodigo: raw.distritoCodigo.trim(),
        centroPobladoId:
          Number(raw.centroPobladoId) > 0
            ? Number(raw.centroPobladoId)
            : undefined,
        referencia: raw.referencia.trim() || undefined,
      },
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const operation: Observable<number | void> = current
      ? this.updateUseCase.execute(current.socioId, common)
      : this.createUseCase.execute({ ...common, fechaAlta: raw.fechaAlta });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (value) => {
          this.toast.success(
            current ? 'Productor actualizado' : 'Productor registrado',
          );
          this.finish({
            saved: true,
            value:
              typeof value === 'number'
                ? value
                : current?.socioId ?? null,
          });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error(
            current
              ? 'No se pudo actualizar el productor'
              : 'No se pudo registrar el productor',
            message,
          );
        },
      });
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  private today(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  private finish(result: AdminModalResult<number>): void {
    if (this.dialogRef.nativeElement.open) {
      this.dialogRef.nativeElement.close();
    }
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
