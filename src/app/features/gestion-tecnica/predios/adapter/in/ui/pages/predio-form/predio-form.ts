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
import {
  faFloppyDisk,
  faPen,
  faPlus,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
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
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarProductoresUseCase } from '../../../../../../productores/application/use-case/listar-productores.use-case';
import { CrearPredioUseCase } from '../../../../../application/use-case/crear-predio.use-case';
import { EditarPredioUseCase } from '../../../../../application/use-case/editar-predio.use-case';
import { PredioDetalle } from '../../../../../domain/predio-detalle.model';
import {
  PredioCaracteristicas,
  PredioUbicacion,
  PredioUpdate,
} from '../../../../../domain/predio.model';
import {
  TipoTitularidad,
  TitularidadInput,
} from '../../../../../domain/titularidad.model';
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
    this.producers.set([]);
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

    if (!id) {
      this.error.set('Seleccione un titular.');
      return;
    }

    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      this.error.set('Revise el porcentaje de titularidad.');
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
      ownerPorcentaje: Math.max(0.01, 100 - this.totalOwnership()),
    });
  }

  removeOwner(index: number): void {
    this.owners.set(
      this.owners().filter((_, currentIndex) => currentIndex !== index),
    );
    this.error.set(null);
  }

  totalOwnership(): number {
    return this.owners().reduce(
      (sum, item) => sum + Number(item.porcentaje),
      0,
    );
  }

  producerLabel(id: number): string {
    return this.producers().find((item) => item.id === id)?.label
      ?? `Socio ${id}`;
  }

  save(): void {
    this.form.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();

    if (this.form.invalid || this.saving()) {
      this.error.set('Revise los campos obligatorios.');
      return;
    }

    if (Number(value.areaCultivableHa) > Number(value.areaTotalHa)) {
      this.error.set('El área cultivable no puede superar el área total.');
      return;
    }

    if (this.owners().length === 0) {
      this.error.set('Agregue al menos un titular.');
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

    const location: PredioUbicacion = {
      distritoCodigo: value.distritoCodigo.trim(),
      centroPobladoId:
        Number(value.centroPobladoId) > 0
          ? Number(value.centroPobladoId)
          : undefined,
      referencia: normalizeOptionalText(value.referencia),
      latitud: lat ?? undefined,
      longitud: lon ?? undefined,
      altitudM: Number(value.altitudM) || undefined,
    };

    const characteristics: PredioCaracteristicas = {
      areaTotalHa: Number(value.areaTotalHa),
      areaCultivableHa: Number(value.areaCultivableHa),
      tipoRiego: normalizeText(value.tipoRiego).toUpperCase(),
      fuenteAgua: normalizeOptionalText(value.fuenteAgua),
      infraestructura: normalizeOptionalText(value.infraestructura),
      observacion: normalizeOptionalText(value.observacion),
      fechaDesde: value.fechaDesde,
    };

    const name = normalizeText(value.nombre);
    const current = this.current();

    this.saving.set(true);
    this.error.set(null);

    const operation: Observable<unknown> = current
      ? this.update.execute(
          current.predioId,
          this.buildUpdate(current, name, location, characteristics),
        )
      : this.create.execute({
          nombre: name,
          fechaRegistro: value.fechaRegistro,
          ubicacion: location,
          caracteristicas: characteristics,
          titulares: this.owners(),
        });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            current ? 'Predio actualizado' : 'Predio registrado',
          );
          this.finish({ saved: true, value: null });
        },
        error: (requestError) => {
          const message = mapOpenApiError(requestError).message
            || 'No se pudo completar la operación.';
          this.error.set(message);
          this.toast.error(
            current
              ? 'No se pudo actualizar el predio'
              : 'No se pudo registrar el predio',
            message,
          );
        },
      });
  }

  private buildUpdate(
    current: PredioDetalle,
    nombre: string,
    ubicacion: PredioUbicacion,
    caracteristicas: PredioCaracteristicas,
  ): PredioUpdate {
    const ownersChanged = this.ownersChanged(current);

    return {
      nombre,
      ubicacion: this.locationChanged(current, ubicacion)
        ? ubicacion
        : undefined,
      caracteristicas: this.characteristicsChanged(current, caracteristicas)
        ? caracteristicas
        : undefined,
      titulares: ownersChanged ? this.owners() : undefined,
      fechaTitularidad: ownersChanged ? this.today : undefined,
    };
  }

  private locationChanged(
    current: PredioDetalle,
    next: PredioUbicacion,
  ): boolean {
    return current.distritoCodigo !== next.distritoCodigo
      || (current.centroPobladoId ?? undefined) !== next.centroPobladoId
      || this.text(current.referencia) !== this.text(next.referencia)
      || this.number(current.latitud) !== this.number(next.latitud)
      || this.number(current.longitud) !== this.number(next.longitud)
      || this.number(current.altitudM) !== this.number(next.altitudM);
  }

  private characteristicsChanged(
    current: PredioDetalle,
    next: PredioCaracteristicas,
  ): boolean {
    return this.number(current.areaTotalHa) !== this.number(next.areaTotalHa)
      || this.number(current.areaCultivableHa) !== this.number(next.areaCultivableHa)
      || this.text(current.tipoRiego).toUpperCase() !== this.text(next.tipoRiego).toUpperCase()
      || this.text(current.fuenteAgua) !== this.text(next.fuenteAgua)
      || this.text(current.infraestructura) !== this.text(next.infraestructura)
      || this.text(current.observacion) !== this.text(next.observacion)
      || (current.fechaDesde?.slice(0, 10) ?? '') !== next.fechaDesde;
  }

  private ownersChanged(current: PredioDetalle): boolean {
    const previous = current.titulares
      .filter((item) => item.estado)
      .map((item) => ({
        socioId: item.socioId,
        tipoTitularidad: item.tipoTitularidad as TipoTitularidad,
        porcentaje: Number(item.porcentaje),
      }))
      .sort((a, b) => a.socioId - b.socioId);

    const next = [...this.owners()]
      .map((item) => ({
        socioId: item.socioId,
        tipoTitularidad: item.tipoTitularidad,
        porcentaje: Number(item.porcentaje),
      }))
      .sort((a, b) => a.socioId - b.socioId);

    if (previous.length !== next.length) {
      return true;
    }

    return previous.some((item, index) => {
      const candidate = next[index];
      return item.socioId !== candidate.socioId
        || item.tipoTitularidad !== candidate.tipoTitularidad
        || Math.abs(item.porcentaje - candidate.porcentaje) > 0.0001;
    });
  }

  private text(value: string | null | undefined): string {
    return value?.trim() ?? '';
  }

  private number(value: number | null | undefined): number | null {
    return value === null || value === undefined
      ? null
      : Number(value);
  }

  private loadProducers(): void {
    this.referencesLoading.set(true);
    this.producersUseCase
      .execute({ situacion: 'ACTIVO', page: 1, size: 200 })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.producers.set(
            result.items.map((item) => ({
              id: item.socioId,
              label: [item.nombres, item.apellidoPaterno, item.apellidoMaterno]
                .filter(Boolean)
                .join(' '),
              document: item.numeroDocumento,
            })),
          );
        },
        error: (requestError) => {
          const message = mapOpenApiError(requestError).message
            || 'No se pudieron cargar los titulares disponibles.';
          this.producers.set([]);
          this.error.set(message);
          this.toast.error('No se pudieron cargar los titulares', message);
        },
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
    this.producers.set([]);
    this.owners.set([]);
    this.latitude.set(null);
    this.longitude.set(null);
  }
}
