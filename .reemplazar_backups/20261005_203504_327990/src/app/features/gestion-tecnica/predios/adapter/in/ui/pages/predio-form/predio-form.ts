import { DecimalPipe } from '@angular/common';
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
import { faFloppyDisk, faPen, faPlus, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import {
  dateOrderValidator,
  decimalPrecisionValidator,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  notFutureDateValidator,
  optionalNotBlankValidator,
  todayLocalIsoDate,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarProductoresUseCase } from '../../../../../../productores/application/use-case/listar-productores.use-case';
import { CrearPredioUseCase } from '../../../../../application/use-case/crear-predio.use-case';
import { EditarPredioUseCase } from '../../../../../application/use-case/editar-predio.use-case';
import { PredioDetalle } from '../../../../../domain/predio-detalle.model';
import { TipoTitularidad, TitularidadInput } from '../../../../../domain/titularidad.model';
import { PredioMapComponent } from '../../components/predio-map/predio-map';

interface ProducerOption {
  id: number;
  label: string;
  document: string;
}

@Component({
  selector: 'app-predio-form',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
    PredioMapComponent,
  ],
  templateUrl: './predio-form.html',
  styleUrl: './predio-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredioFormComponent {
  @ViewChild('dialog', { static: true })
  private dialog!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly create = inject(CrearPredioUseCase);
  private readonly update = inject(EditarPredioUseCase);
  private readonly producersUseCase = inject(ListarProductoresUseCase);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly referencesLoading = signal(false);
  readonly current = signal<PredioDetalle | null>(null);
  readonly error = signal<string | null>(null);
  readonly producers = signal<readonly ProducerOption[]>([]);
  readonly owners = signal<readonly TitularidadInput[]>([]);
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly deleteIcon = faTrashCan;

  readonly ownershipTypes: readonly TipoTitularidad[] = [
    'PROPIETARIO',
    'COPROPIETARIO',
    'POSESIONARIO',
    'ARRENDATARIO',
    'OTRO',
  ];

  readonly today = todayLocalIsoDate();

  readonly form = this.fb.nonNullable.group(
    {
      nombre: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(150),
        ],
      ],
      fechaRegistro: [
        '',
        [Validators.required, notFutureDateValidator],
      ],
      distritoCodigo: [
        '',
        [Validators.required, Validators.pattern(/^\d{6}$/)],
      ],
      centroPobladoId: [0, [Validators.min(0)]],
      referencia: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(300)],
      ],
      altitudM: [
        0,
        [
          Validators.min(-500),
          Validators.max(7000),
          decimalPrecisionValidator(6, 2),
        ],
      ],
      areaTotalHa: [
        0,
        [
          Validators.required,
          Validators.min(0.0001),
          Validators.max(999999.9999),
          decimalPrecisionValidator(6, 4),
        ],
      ],
      areaCultivableHa: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(999999.9999),
          decimalPrecisionValidator(6, 4),
        ],
      ],
      tipoRiego: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(30),
        ],
      ],
      fuenteAgua: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(150)],
      ],
      infraestructura: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(300)],
      ],
      observacion: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(500)],
      ],
      fechaDesde: [
        '',
        [Validators.required, notFutureDateValidator],
      ],
      ownerSocioId: [0, [Validators.min(0)]],
      ownerTipo: ['PROPIETARIO' as TipoTitularidad],
      ownerPorcentaje: [
        100,
        [
          Validators.min(0.01),
          Validators.max(100),
          decimalPrecisionValidator(3, 2),
        ],
      ],
    },
    {
      validators: [
        dateOrderValidator(
          'fechaRegistro',
          'fechaDesde',
          'characteristicsBeforeRegistration',
        ),
      ],
    },
  );

  open(detail: PredioDetalle | null = null): Promise<AdminModalResult> {
    this.current.set(detail);
    this.error.set(null);
    this.owners.set(
      detail?.titulares
        .filter((item) => item.estado)
        .map((item) => ({
          socioId: item.socioId,
          tipoTitularidad: item.tipoTitularidad as TipoTitularidad,
          porcentaje: item.porcentaje,
        })) ?? [],
    );
    this.latitude.set(detail?.latitud ?? null);
    this.longitude.set(detail?.longitud ?? null);
    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(detail?.centroPobladoId ?? null);

    const today = this.today;
    this.form.reset({
      nombre: detail?.nombre ?? '',
      fechaRegistro: detail?.fechaRegistro?.slice(0, 10) ?? today,
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      altitudM: detail?.altitudM ?? 0,
      areaTotalHa: detail?.areaTotalHa ?? 0,
      areaCultivableHa: detail?.areaCultivableHa ?? 0,
      tipoRiego: detail?.tipoRiego ?? '',
      fuenteAgua: detail?.fuenteAgua ?? '',
      infraestructura: detail?.infraestructura ?? '',
      observacion: detail?.observacion ?? '',
      fechaDesde: detail?.fechaDesde?.slice(0, 10) ?? today,
      ownerSocioId: 0,
      ownerTipo: 'PROPIETARIO',
      ownerPorcentaje: 100,
    });

    this.form.controls.fechaRegistro[
      detail ? 'disable' : 'enable'
    ]({ emitEvent: false });

    this.loadProducers();
    this.dialog.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  setGeography(selection: GeographySelection): void {
    this.form.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.form.controls.distritoCodigo.markAsTouched();
  }

  setLocation(point: { latitude: number; longitude: number }): void {
    this.latitude.set(point.latitude);
    this.longitude.set(point.longitude);
  }

  addOwner(): void {
    const value = this.form.getRawValue();
    const id = Number(value.ownerSocioId);
    const percentage = Number(value.ownerPorcentaje);

    if (!id || percentage <= 0 || percentage > 100) {
      return;
    }
    if (this.owners().some((item) => item.socioId === id)) {
      this.error.set('El socio ya forma parte de la titularidad.');
      return;
    }
    if (this.totalOwnership() + percentage > 100.0001) {
      this.error.set('La suma de porcentajes no puede superar el 100 %.');
      return;
    }

    this.error.set(null);
    this.owners.set([
      ...this.owners(),
      {
        socioId: id,
        tipoTitularidad: value.ownerTipo,
        porcentaje: percentage,
      },
    ]);
    this.form.patchValue({
      ownerSocioId: 0,
      ownerPorcentaje: Math.max(0, 100 - this.totalOwnership()),
    });
  }

  removeOwner(index: number): void {
    this.owners.set(this.owners().filter((_, current) => current !== index));
  }

  totalOwnership(): number {
    return this.owners().reduce((sum, item) => sum + item.porcentaje, 0);
  }

  producerLabel(id: number): string {
    return this.producers().find((item) => item.id === id)?.label ?? `Socio ${id}`;
  }

  save(): void {
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();

    if (this.form.invalid || this.saving()) {
      return;
    }
    if (value.areaCultivableHa > value.areaTotalHa) {
      this.error.set('El área cultivable no puede superar el área total.');
      return;
    }
    if (this.owners().length === 0) {
      this.error.set('Agrega al menos un titular.');
      return;
    }

    if (this.totalOwnership() > 100.0001) {
      this.error.set('La suma de porcentajes no puede superar el 100 %.');
      return;
    }

    const lat = this.latitude();
    const lon = this.longitude();

    if (
      (lat === null) !== (lon === null)
      || (lat !== null && (lat < -90 || lat > 90))
      || (lon !== null && (lon < -180 || lon > 180))
    ) {
      this.error.set('La ubicación geográfica no es válida.');
      return;
    }

    const base = {
      nombre: normalizeText(value.nombre),
      ubicacion: {
        distritoCodigo: value.distritoCodigo.trim(),
        centroPobladoId:
          Number(value.centroPobladoId) > 0
            ? Number(value.centroPobladoId)
            : undefined,
        referencia: normalizeOptionalText(value.referencia),
        latitud: this.latitude() ?? undefined,
        longitud: this.longitude() ?? undefined,
        altitudM: Number(value.altitudM) || undefined,
      },
      caracteristicas: {
        areaTotalHa: Number(value.areaTotalHa),
        areaCultivableHa: Number(value.areaCultivableHa),
        tipoRiego: normalizeText(value.tipoRiego).toUpperCase(),
        fuenteAgua: normalizeOptionalText(value.fuenteAgua),
        infraestructura: normalizeOptionalText(value.infraestructura),
        observacion: normalizeOptionalText(value.observacion),
        fechaDesde: value.fechaDesde,
      },
      titulares: this.owners(),
    };

    this.saving.set(true);
    this.error.set(null);

    const operation: Observable<unknown> = this.current()
      ? this.update.execute(this.current()!.predioId, {
          nombre: base.nombre,
          fechaTitularidad: value.fechaDesde,
          ubicacion: base.ubicacion,
          caracteristicas: base.caracteristicas,
          titulares: base.titulares,
        })
      : this.create.execute({ ...base, fechaRegistro: value.fechaRegistro });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            this.current() ? 'Predio actualizado' : 'Predio registrado',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.error.set(message);
          this.toast.error(
            this.current()
              ? 'No se pudo actualizar el predio'
              : 'No se pudo registrar el predio',
            message,
          );
        },
      });
  }

  private loadProducers(): void {
    this.referencesLoading.set(true);
    this.producersUseCase
      .execute({ situacion: 'ACTIVO', page: 1, size: 200 })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (result) =>
          this.producers.set(
            result.items.map((item) => ({
              id: item.socioId,
              label: [item.nombres, item.apellidoPaterno, item.apellidoMaterno]
                .filter(Boolean)
                .join(' '),
              document: item.numeroDocumento,
            })),
          ),
        error: () => this.producers.set([]),
      });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialog.nativeElement.open) {
      this.dialog.nativeElement.close();
    }
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.error.set(null);
  }
}
