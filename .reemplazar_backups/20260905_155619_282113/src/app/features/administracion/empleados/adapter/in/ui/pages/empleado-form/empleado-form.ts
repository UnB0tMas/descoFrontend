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
import { buildSystemCode } from '../../../../../../shared/admin-code.util';
import { AdminModalResult, AdminSelectOption } from '../../../../../../shared/admin-modal.types';
import { CrearEmpleadoUseCase } from '../../../../../application/use-case/crear-empleado.use-case';
import { EditarEmpleadoUseCase } from '../../../../../application/use-case/editar-empleado.use-case';
import { Empleado, EmpleadoDetalle, TipoDocumentoEmpleado } from '../../../../../domain/empleado.model';
import { Area } from '../../../../../../organizaciones/domain/area.model';

interface EmployeeFormOptions {
  companies: readonly AdminSelectOption[];
  areas: readonly Area[];
}

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
  ],
  templateUrl: './empleado-form.html',
  styleUrl: './empleado-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadoFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly createUseCase = inject(CrearEmpleadoUseCase);
  private readonly updateUseCase = inject(EditarEmpleadoUseCase);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly current = signal<Empleado | EmpleadoDetalle | null>(null);
  readonly companies = signal<readonly AdminSelectOption[]>([]);
  readonly areas = signal<readonly Area[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);

  readonly addIcon = faUserPlus;
  readonly editIcon = faPen;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;

  readonly documentTypes: readonly {
    value: TipoDocumentoEmpleado;
    label: string;
  }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'OTRO', label: 'Otro' },
  ];

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly form = this.fb.nonNullable.group({
    tipoDocumento: ['DNI' as TipoDocumentoEmpleado, [Validators.required]],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(30)]],
    nombres: ['', [Validators.required, Validators.maxLength(120)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80)]],
    apellidoMaterno: ['', [Validators.maxLength(80)]],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    fechaNacimiento: [''],
    distritoCodigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    centroPobladoId: [0],
    referencia: ['', [Validators.maxLength(300)]],
    empresaId: [0, [Validators.required, Validators.min(1)]],
    codigoEmpleado: ['', [Validators.required, Validators.maxLength(40)]],
    fechaIngreso: ['', [Validators.required]],
    areaId: [0],
    cargo: ['', [Validators.maxLength(120)]],
    fechaAsignacionArea: [''],
  });

  open(
    options: EmployeeFormOptions,
    employee: Empleado | EmpleadoDetalle | null = null,
  ): Promise<AdminModalResult> {
    this.current.set(employee);
    this.companies.set(options.companies);
    this.areas.set(options.areas);
    this.errorMessage.set(null);

    const detail = employee && 'fechaNacimiento' in employee
      ? employee as EmpleadoDetalle
      : null;

    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(detail?.centroPobladoId ?? null);

    this.form.reset({
      tipoDocumento: (employee?.tipoDocumento as TipoDocumentoEmpleado) || 'DNI',
      numeroDocumento: employee?.numeroDocumento ?? '',
      nombres: employee?.nombres ?? '',
      apellidoPaterno: employee?.apellidoPaterno ?? '',
      apellidoMaterno: employee?.apellidoMaterno ?? '',
      telefono: employee?.telefono ?? '',
      correo: employee?.correo ?? '',
      fechaNacimiento: detail?.fechaNacimiento ?? '',
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      empresaId: employee?.empresaId ?? options.companies[0]?.value ?? 0,
      codigoEmpleado: employee?.codigoEmpleado ?? '',
      fechaIngreso: employee?.fechaIngreso ?? '',
      areaId: employee?.areaId ?? 0,
      cargo: employee?.cargo ?? '',
      fechaAsignacionArea: '',
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

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  availableAreas(): readonly Area[] {
    const companyId = Number(this.form.getRawValue().empresaId);
    return this.areas().filter((area) => area.empresaId === companyId && area.estado);
  }

  save(): void {
    const current = this.current();

    if (!current) {
      this.form.controls.codigoEmpleado.setValue(
        buildSystemCode('EMP', this.form.controls.numeroDocumento.value, 30),
        { emitEvent: false },
      );
    }

    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const values = this.form.getRawValue();
    this.errorMessage.set(null);
    this.saving.set(true);

    const common = {
      tipoDocumento: values.tipoDocumento,
      numeroDocumento: values.numeroDocumento.trim(),
      nombres: values.nombres.trim(),
      apellidoPaterno: values.apellidoPaterno.trim(),
      apellidoMaterno: values.apellidoMaterno.trim() || undefined,
      telefono: values.telefono.trim() || undefined,
      correo: values.correo.trim() || undefined,
      fechaNacimiento: values.fechaNacimiento || undefined,
      empresaId: Number(values.empresaId),
      codigoEmpleado: values.codigoEmpleado.trim().toUpperCase(),
      fechaIngreso: values.fechaIngreso,
      areaId: Number(values.areaId) > 0 ? Number(values.areaId) : undefined,
      cargo: values.cargo.trim() || undefined,
      ubicacion: {
        distritoCodigo: values.distritoCodigo.trim(),
        centroPobladoId:
          Number(values.centroPobladoId) > 0
            ? Number(values.centroPobladoId)
            : undefined,
        referencia: values.referencia.trim() || undefined,
      },
    };

    const operation: Observable<unknown> = current
      ? this.updateUseCase.execute(current.empleadoId, {
          ...common,
          fechaAsignacionArea: values.fechaAsignacionArea || undefined,
        })
      : this.createUseCase.execute(common);

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(current ? 'Empleado actualizado' : 'Empleado registrado');
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error(
            current ? 'No se pudo actualizar el empleado' : 'No se pudo registrar el empleado',
            message,
          );
        },
      });
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close();
    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
  }
}
