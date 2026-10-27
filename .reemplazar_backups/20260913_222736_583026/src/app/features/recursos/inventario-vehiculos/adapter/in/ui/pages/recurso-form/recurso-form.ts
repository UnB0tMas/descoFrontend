import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faFloppyDisk,
  faPen,
  faPlus,
  faRotate,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, Observable } from 'rxjs';

import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import {
  ResourceAssetIncidentRequest,
  ResourceAssetIncidentRequestTipoEnum,
} from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetIncidentRequest';
import { ResourceAssetResponse } from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetResponse';
import {
  ResourceAssetStateChangeRequestEstadoEnum,
} from '../../../../../../../../infrastructure/openapi/generated/model/resourceAssetStateChangeRequest';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  localDateTimeInputNow,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  notFutureDateValidator,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { ListarOrganizacionesUseCase } from '../../../../../../../administracion/organizaciones/application/use-case/listar-organizaciones.use-case';
import {
  AdminModalResult,
  AdminSelectOption,
} from '../../../../../../../administracion/shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ResourceApiService } from '../../../../../../shared/resource-api.service';

type ResourceFormMode = 'create' | 'edit' | 'state' | 'incident';

@Component({
  selector: 'app-recurso-form',
  standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent, NgTemplateOutlet],
  templateUrl: './recurso-form.html',
  styleUrl: './recurso-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursoFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ResourceApiService);
  private readonly refs = inject(ReferenceDataService);
  private readonly listOrganizations = inject(ListarOrganizacionesUseCase);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly mode = signal<ResourceFormMode>('create');
  readonly current = signal<ResourceAssetResponse | null>(null);
  readonly saving = signal(false);
  readonly referencesLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly assetTypes = signal<readonly AdminSelectOption[]>([]);
  readonly organizations = signal<readonly AdminSelectOption[]>([]);

  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly stateIcon = faRotate;
  readonly incidentIcon = faTriangleExclamation;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;
  readonly today = new Date().toISOString().slice(0, 10);

  readonly states = [
    { value: ResourceAssetStateChangeRequestEstadoEnum.Disponible, label: 'Disponible' },
    { value: ResourceAssetStateChangeRequestEstadoEnum.Asignado, label: 'Asignado' },
    { value: ResourceAssetStateChangeRequestEstadoEnum.Mantenimiento, label: 'Mantenimiento' },
    { value: ResourceAssetStateChangeRequestEstadoEnum.Averiado, label: 'Averiado' },
    { value: ResourceAssetStateChangeRequestEstadoEnum.NoDisponible, label: 'No disponible' },
    { value: ResourceAssetStateChangeRequestEstadoEnum.Inactivo, label: 'Inactivo' },
    { value: ResourceAssetStateChangeRequestEstadoEnum.Baja, label: 'Baja' },
  ] as const;

  readonly incidentTypes = [
    { value: ResourceAssetIncidentRequestTipoEnum.Averia, label: 'Avería' },
    { value: ResourceAssetIncidentRequestTipoEnum.Accidente, label: 'Accidente' },
    { value: ResourceAssetIncidentRequestTipoEnum.Perdida, label: 'Pérdida' },
    { value: ResourceAssetIncidentRequestTipoEnum.Robo, label: 'Robo' },
    { value: ResourceAssetIncidentRequestTipoEnum.Mantenimiento, label: 'Mantenimiento' },
    { value: ResourceAssetIncidentRequestTipoEnum.Otro, label: 'Otro' },
  ] as const;

  private resolver: ((value: AdminModalResult) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    tipoBienId: [0, [Validators.required, Validators.min(1)]],
    codigoPatrimonial: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(80)],
    ],
    nombre: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(180)],
    ],
    marca: ['', [Validators.maxLength(100)]],
    modelo: ['', [Validators.maxLength(100)]],
    serie: ['', [Validators.maxLength(120)]],
    fechaAdquisicion: ['', [notFutureDateValidator]],
    montoAdquisicion: [0, [Validators.min(0), Validators.max(999999999999)]],
    moneda: ['PEN', [Validators.required, Validators.maxLength(3)]],
    proveedorEmpresaId: [0],
    observacion: ['', [Validators.maxLength(500)]],
  });

  readonly stateForm = this.fb.nonNullable.group({
    estado: [
      ResourceAssetStateChangeRequestEstadoEnum.Disponible,
      [Validators.required],
    ],
    motivo: ['', [Validators.maxLength(500)]],
  });

  readonly incidentForm = this.fb.nonNullable.group({
    tipo: [ResourceAssetIncidentRequestTipoEnum.Averia, [Validators.required]],
    fechaHora: [localDateTimeInputNow(), [Validators.required]],
    descripcion: [
      '',
      [Validators.required, notBlankValidator, Validators.maxLength(1000)],
    ],
    costoEstimado: [0, [Validators.min(0), Validators.max(999999999999)]],
  });

  openCreate(preferredUotId?: number): Promise<AdminModalResult> {
    this.resetState();
    this.mode.set('create');
    const selected = preferredUotId ?? this.uot.selectedId() ?? this.uot.memberships()[0]?.uotId ?? 0;
    this.form.reset({
      uotId: selected,
      tipoBienId: 0,
      codigoPatrimonial: '',
      nombre: '',
      marca: '',
      modelo: '',
      serie: '',
      fechaAdquisicion: '',
      montoAdquisicion: 0,
      moneda: 'PEN',
      proveedorEmpresaId: 0,
      observacion: '',
    });
    this.form.controls.uotId[this.uot.modo() === 'GENERAL' ? 'enable' : 'disable']({ emitEvent: false });
    this.loadReferences();
    return this.show();
  }

  openEdit(item: ResourceAssetResponse): Promise<AdminModalResult> {
    this.resetState();
    this.mode.set('edit');
    this.current.set(item);
    this.form.reset({
      uotId: item.uotId ?? 0,
      tipoBienId: item.tipoBienId ?? 0,
      codigoPatrimonial: item.codigoPatrimonial ?? '',
      nombre: item.nombre ?? '',
      marca: item.marca ?? '',
      modelo: item.modelo ?? '',
      serie: item.serie ?? '',
      fechaAdquisicion: item.fechaAdquisicion ?? '',
      montoAdquisicion: item.montoAdquisicion ?? 0,
      moneda: item.monedaAdquisicion ?? 'PEN',
      proveedorEmpresaId: item.proveedorEmpresaId ?? 0,
      observacion: item.observacion ?? '',
    });
    this.form.controls.uotId.disable({ emitEvent: false });
    this.loadReferences();
    return this.show();
  }

  openState(item: ResourceAssetResponse): Promise<AdminModalResult> {
    this.resetState();
    this.mode.set('state');
    this.current.set(item);
    const valid = this.states.find((state) => state.value === item.estadoBien);
    this.stateForm.reset({
      estado: valid?.value ?? ResourceAssetStateChangeRequestEstadoEnum.Disponible,
      motivo: '',
    });
    return this.show();
  }

  openIncident(item: ResourceAssetResponse): Promise<AdminModalResult> {
    this.resetState();
    this.mode.set('incident');
    this.current.set(item);
    this.incidentForm.reset({
      tipo: ResourceAssetIncidentRequestTipoEnum.Averia,
      fechaHora: localDateTimeInputNow(),
      descripcion: '',
      costoEstimado: 0,
    });
    return this.show();
  }

  availableUnits() {
    return this.uot.memberships();
  }

  onUotChange(): void {
    this.form.controls.proveedorEmpresaId.setValue(0, { emitEvent: false });
    this.loadReferences();
  }

  close(): void {
    if (!this.saving()) this.finish({ saved: false, value: null });
  }

  save(): void {
    if (this.mode() === 'state') {
      this.saveState();
      return;
    }
    if (this.mode() === 'incident') {
      this.saveIncident();
      return;
    }
    this.saveAsset();
  }

  title(): string {
    switch (this.mode()) {
      case 'edit':
        return 'Editar bien';
      case 'state':
        return 'Cambiar estado';
      case 'incident':
        return 'Registrar incidencia';
      default:
        return 'Registrar bien';
    }
  }

  private saveAsset(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || this.referencesLoading()) return;

    const raw = this.form.getRawValue();
    const amount = Number(raw.montoAdquisicion);
    const providerId = Number(raw.proveedorEmpresaId);

    const common = {
      tipoBienId: Number(raw.tipoBienId),
      nombre: normalizeText(raw.nombre),
      marca: normalizeOptionalText(raw.marca),
      modelo: normalizeOptionalText(raw.modelo),
      serie: normalizeOptionalText(raw.serie),
      fechaAdquisicion: raw.fechaAdquisicion || undefined,
      montoAdquisicion: amount > 0 ? amount : undefined,
      moneda: raw.moneda.trim().toUpperCase() || 'PEN',
      proveedorEmpresaId: providerId > 0 ? providerId : undefined,
      observacion: normalizeOptionalText(raw.observacion),
    };

    const operation =
      this.mode() === 'edit' && this.current()?.bienInventarioId
        ? this.api.updateAsset(this.current()!.bienInventarioId!, common)
        : this.api.createAsset({
            uotId: Number(raw.uotId),
            codigoPatrimonial: raw.codigoPatrimonial.trim().toUpperCase(),
            ...common,
          });

    this.run(operation, this.mode() === 'edit' ? 'Bien actualizado' : 'Bien registrado');
  }

  private saveState(): void {
    const item = this.current();
    this.stateForm.markAllAsTouched();
    if (!item?.bienInventarioId || this.stateForm.invalid || this.saving()) return;

    const raw = this.stateForm.getRawValue();
    this.run(
      this.api.changeAssetState(item.bienInventarioId, {
        estado: raw.estado,
        motivo: normalizeOptionalText(raw.motivo),
      }),
      'Estado actualizado',
    );
  }

  private saveIncident(): void {
    const item = this.current();
    this.incidentForm.markAllAsTouched();
    if (!item?.bienInventarioId || this.incidentForm.invalid || this.saving()) {
      return;
    }

    const raw = this.incidentForm.getRawValue();
    const cost = Number(raw.costoEstimado);
    const body: ResourceAssetIncidentRequest = {
      tipo: raw.tipo,
      fechaHora: raw.fechaHora,
      descripcion: normalizeText(raw.descripcion),
      costoEstimado: cost > 0 ? cost : undefined,
    };

    this.run(
      this.api.reportAssetIncident(item.bienInventarioId, body),
      'Incidencia registrada',
    );
  }

  private run(operation: Observable<unknown>, success: string): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.toast.success(success);
        this.finish({ saved: true, value: null });
      },
      error: (error) => {
        const message = mapOpenApiError(error).message;
        this.errorMessage.set(message);
        this.toast.error('No se pudo completar la operación', message);
      },
    });
  }

  private loadReferences(): void {
    this.referencesLoading.set(true);
    forkJoin({
      types: this.refs.catalog('TIPO_BIEN'),
      organizations: this.listOrganizations.execute(1, 200, Number(this.form.getRawValue().uotId) || undefined),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ types, organizations }) => {
          this.assetTypes.set(
            types.map((item) => ({
              value: Number(item.id),
              label: item.label,
              description: item.code,
            })),
          );
          this.organizations.set(
            organizations.items
              .filter((item) => item.estado)
              .map((item) => ({
                value: item.empresaId,
                label: item.razonSocial,
                description: item.ruc,
              })),
          );
        },
        error: (error) => {
          this.errorMessage.set(mapOpenApiError(error).message);
        },
      });
  }

  private show(): Promise<AdminModalResult> {
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }

  private resetState(): void {
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
