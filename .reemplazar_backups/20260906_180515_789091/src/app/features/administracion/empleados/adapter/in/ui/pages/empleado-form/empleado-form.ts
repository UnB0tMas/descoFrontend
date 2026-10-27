import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faFloppyDisk,
  faMagnifyingGlass,
  faPen,
  faUserPlus,
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
  dniValidator,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  notFutureDateValidator,
  rucValidator,
  sanitizeDocument,
  todayLocalIsoDate,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import {
  IdentityResolution,
  IdentityResolverService,
} from '../../../../../../../../shared/identity/identity-resolver.service';
import { buildSystemCode } from '../../../../../../shared/admin-code.util';
import {
  AdminModalResult,
  AdminSelectOption,
} from '../../../../../../shared/admin-modal.types';
import { CrearEmpleadoUseCase } from '../../../../../application/use-case/crear-empleado.use-case';
import { EditarEmpleadoUseCase } from '../../../../../application/use-case/editar-empleado.use-case';
import {
  Empleado,
  EmpleadoDetalle,
  TipoDocumentoEmpleado,
} from '../../../../../domain/empleado.model';
import { Area } from '../../../../../../organizaciones/domain/area.model';

interface EmployeeFormOptions {
  companies: readonly AdminSelectOption[];
  areas: readonly Area[];
}

type IdentityFeedbackTone = 'neutral' | 'success' | 'warning' | 'error';

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
  private readonly identities = inject(IdentityResolverService);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly identityLoading = signal(false);
  readonly identityMessage = signal<string | null>(null);
  readonly identityTone = signal<IdentityFeedbackTone>('neutral');
  readonly identityBlocked = signal(false);
  readonly verifiedIdentityKey = signal<string | null>(null);
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
  readonly searchIcon = faMagnifyingGlass;
  readonly today = todayLocalIsoDate();

  readonly documentTypes: readonly {
    value: TipoDocumentoEmpleado;
    label: string;
  }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC de persona natural' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'OTRO', label: 'Otro' },
  ];

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly form = this.fb.nonNullable.group(
    {
      tipoDocumento: [
        'DNI' as TipoDocumentoEmpleado,
        [Validators.required],
      ],
      numeroDocumento: [
        '',
        [Validators.required, dniValidator],
      ],
      nombres: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(100),
        ],
      ],
      apellidoPaterno: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(80),
        ],
      ],
      apellidoMaterno: ['', [Validators.maxLength(80)]],
      telefono: ['', [Validators.maxLength(30)]],
      correo: ['', [Validators.email, Validators.maxLength(180)]],
      fechaNacimiento: ['', [notFutureDateValidator]],
      distritoCodigo: [
        '',
        [Validators.required, Validators.pattern(/^\d{6}$/)],
      ],
      centroPobladoId: [0],
      referencia: ['', [Validators.maxLength(300)]],
      empresaId: [0, [Validators.required, Validators.min(1)]],
      codigoEmpleado: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(30),
        ],
      ],
      fechaIngreso: ['', [Validators.required]],
      areaId: [0],
      cargo: ['', [Validators.maxLength(120)]],
      fechaAsignacionArea: [''],
    },
    {
      validators: [
        dateOrderValidator(
          'fechaIngreso',
          'fechaAsignacionArea',
          'areaDateBeforeEntry',
        ),
      ],
    },
  );

  open(
    options: EmployeeFormOptions,
    employee: Empleado | EmpleadoDetalle | null = null,
  ): Promise<AdminModalResult> {
    this.current.set(employee);
    this.companies.set(options.companies);
    this.areas.set(options.areas);
    this.resetIdentityState();
    this.errorMessage.set(null);

    const detail = employee && 'fechaNacimiento' in employee
      ? (employee as EmpleadoDetalle)
      : null;

    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(
      detail?.centroPobladoId ?? null,
    );

    const type = this.normalizeEmployeeDocumentType(
      employee?.tipoDocumento,
    );

    this.form.reset({
      tipoDocumento: type,
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
      empresaId:
        employee?.empresaId ?? options.companies[0]?.value ?? 0,
      codigoEmpleado: employee?.codigoEmpleado ?? '',
      fechaIngreso: employee?.fechaIngreso ?? '',
      areaId: employee?.areaId ?? 0,
      cargo: employee?.cargo ?? '',
      fechaAsignacionArea: '',
    });

    this.applyDocumentValidators(false);
    this.syncAreaValidators(false);

    if (
      employee
      && (type === 'DNI' || type === 'RUC')
    ) {
      this.verifiedIdentityKey.set(
        this.identityKey(type, employee.numeroDocumento),
      );
    }

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

  onDocumentTypeChange(): void {
    const control = this.form.controls.numeroDocumento;
    const type = this.form.controls.tipoDocumento.value;

    control.setValue(
      sanitizeDocument(type, control.value),
      { emitEvent: false },
    );

    this.applyDocumentValidators();
    this.resetIdentityLookup();

    if (!this.current()) {
      this.refreshGeneratedEmployeeCode();
    }
  }

  onDocumentInput(): void {
    const type = this.form.controls.tipoDocumento.value;
    const control = this.form.controls.numeroDocumento;
    const sanitized = sanitizeDocument(type, control.value);

    if (sanitized !== control.value) {
      control.setValue(sanitized, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
    this.resetIdentityLookup();

    if (!this.current()) {
      this.refreshGeneratedEmployeeCode();
    }
  }

  documentMaxLength(): number {
    switch (this.form.controls.tipoDocumento.value) {
      case 'DNI':
        return 8;
      case 'RUC':
        return 11;
      default:
        return 30;
    }
  }

  documentInputMode(): 'numeric' | 'text' {
    const type = this.form.controls.tipoDocumento.value;

    return type === 'DNI' || type === 'RUC'
      ? 'numeric'
      : 'text';
  }

  shouldResolveIdentity(): boolean {
    const type = this.form.controls.tipoDocumento.value;
    return type === 'DNI' || type === 'RUC';
  }

  canResolveIdentity(): boolean {
    const type = this.form.controls.tipoDocumento.value;
    const expectedLength = type === 'DNI' ? 8 : 11;

    return this.shouldResolveIdentity()
      && !this.saving()
      && !this.identityLoading()
      && this.form.controls.numeroDocumento.valid
      && this.form.controls.numeroDocumento.value.length
        === expectedLength;
  }

  resolveIdentity(): void {
    const type = this.form.controls.tipoDocumento.value;

    if (type !== 'DNI' && type !== 'RUC') {
      return;
    }

    const control = this.form.controls.numeroDocumento;
    control.markAsTouched();
    control.updateValueAndValidity();

    if (!this.canResolveIdentity()) {
      return;
    }

    const documentNumber = sanitizeDocument(type, control.value);

    this.identityLoading.set(true);
    this.identityBlocked.set(false);
    this.identityTone.set('neutral');
    this.identityMessage.set(
      'Buscando información del documento...',
    );

    this.identities
      .resolve('PERSONA', type, documentNumber)
      .pipe(finalize(() => this.identityLoading.set(false)))
      .subscribe({
        next: (result) =>
          this.applyPersonIdentity(result, type, documentNumber),
        error: (error) => {
          const mapped = mapOpenApiError(error);

          if (mapped.status === 400) {
            this.identityTone.set('error');
            this.identityBlocked.set(true);
            this.identityMessage.set(mapped.message);
            return;
          }

          this.verifiedIdentityKey.set(
            this.identityKey(type, documentNumber),
          );
          this.identityTone.set('warning');
          this.identityMessage.set(
            'No se pudieron obtener los datos del documento. Complete la información manualmente.',
          );
        },
      });
  }

  onCompanyChange(): void {
    const selectedArea = Number(this.form.controls.areaId.value);

    if (
      selectedArea > 0
      && !this.availableAreas().some(
        (area) => area.areaId === selectedArea,
      )
    ) {
      this.form.controls.areaId.setValue(0);
      this.form.controls.cargo.setValue('');
    }

    this.syncAreaValidators();
  }

  onAreaChange(): void {
    this.syncAreaValidators();
  }

  availableAreas(): readonly Area[] {
    const companyId = Number(this.form.getRawValue().empresaId);

    return this.areas().filter(
      (area) => area.empresaId === companyId && area.estado,
    );
  }

  close(): void {
    if (!this.saving() && !this.identityLoading()) {
      this.finish({ saved: false, value: null });
    }
  }

  save(): void {
    const current = this.current();

    if (!current) {
      this.refreshGeneratedEmployeeCode();
    }

    this.syncAreaValidators(false);
    this.form.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();

    if (
      this.form.invalid
      || this.saving()
      || this.identityLoading()
    ) {
      return;
    }

    const values = this.form.getRawValue();
    const documentNumber = sanitizeDocument(
      values.tipoDocumento,
      values.numeroDocumento,
    );

    if (
      this.shouldResolveIdentity()
      && this.verifiedIdentityKey()
        !== this.identityKey(values.tipoDocumento, documentNumber)
    ) {
      this.errorMessage.set(
        `Valide el ${values.tipoDocumento} antes de guardar.`,
      );
      return;
    }

    if (this.identityBlocked()) {
      this.errorMessage.set(
        this.identityMessage()
          || 'La identidad encontrada no puede utilizarse para este empleado.',
      );
      return;
    }

    this.errorMessage.set(null);
    this.saving.set(true);

    const areaId = Number(values.areaId);

    const common = {
      tipoDocumento: values.tipoDocumento,
      numeroDocumento: documentNumber,
      nombres: normalizeText(values.nombres),
      apellidoPaterno: normalizeText(values.apellidoPaterno),
      apellidoMaterno: normalizeOptionalText(values.apellidoMaterno),
      telefono: normalizeOptionalText(values.telefono),
      correo: values.correo.trim().toLowerCase() || undefined,
      fechaNacimiento: values.fechaNacimiento || undefined,
      empresaId: Number(values.empresaId),
      codigoEmpleado: values.codigoEmpleado.trim().toUpperCase(),
      fechaIngreso: values.fechaIngreso,
      areaId: areaId > 0 ? areaId : undefined,
      cargo:
        areaId > 0
          ? normalizeOptionalText(values.cargo)
          : undefined,
      ubicacion: {
        distritoCodigo: values.distritoCodigo.trim(),
        centroPobladoId:
          Number(values.centroPobladoId) > 0
            ? Number(values.centroPobladoId)
            : undefined,
        referencia: normalizeOptionalText(values.referencia),
      },
    };

    const operation: Observable<unknown> = current
      ? this.updateUseCase.execute(current.empleadoId, {
          ...common,
          fechaAsignacionArea:
            areaId > 0 && values.fechaAsignacionArea
              ? values.fechaAsignacionArea
              : undefined,
        })
      : this.createUseCase.execute(common);

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            current
              ? 'Empleado actualizado'
              : 'Empleado registrado',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error(
            current
              ? 'No se pudo actualizar el empleado'
              : 'No se pudo registrar el empleado',
            message,
          );
        },
      });
  }

  private applyDocumentValidators(
    emitEvent = true,
  ): void {
    const type = this.form.controls.tipoDocumento.value;
    const control = this.form.controls.numeroDocumento;

    if (type === 'DNI') {
      control.setValidators([
        Validators.required,
        dniValidator,
      ]);
    } else if (type === 'RUC') {
      control.setValidators([
        Validators.required,
        rucValidator('NATURAL'),
      ]);
    } else {
      control.setValidators([
        Validators.required,
        notBlankValidator,
        Validators.maxLength(30),
      ]);
    }

    control.updateValueAndValidity({ emitEvent });
  }

  private syncAreaValidators(
    emitEvent = true,
  ): void {
    const areaSelected = Number(this.form.controls.areaId.value) > 0;
    const cargo = this.form.controls.cargo;

    if (areaSelected) {
      cargo.setValidators([
        Validators.required,
        notBlankValidator,
        Validators.maxLength(120),
      ]);
    } else {
      cargo.setValidators([Validators.maxLength(120)]);
    }

    cargo.updateValueAndValidity({ emitEvent });
  }

  private refreshGeneratedEmployeeCode(): void {
    const document = sanitizeDocument(
      this.form.controls.tipoDocumento.value,
      this.form.controls.numeroDocumento.value,
    );

    this.form.controls.codigoEmpleado.setValue(
      buildSystemCode('EMP', document, 30),
      { emitEvent: false },
    );
  }

  private applyPersonIdentity(
    result: IdentityResolution,
    type: 'DNI' | 'RUC',
    documentNumber: string,
  ): void {
    const key = this.identityKey(type, documentNumber);
    const current = this.current();

    this.verifiedIdentityKey.set(key);

    if (
      result.isEmployee
      && (!current || result.entityId !== current.empleadoId)
    ) {
      this.identityBlocked.set(true);
      this.identityTone.set('error');
      this.identityMessage.set(
        `El ${type} ya está vinculado a otro empleado. No se puede crear o reasignar un empleado a la misma persona.`,
      );
      return;
    }

    this.identityBlocked.set(false);
    this.prefillPerson(result);

    if (result.found) {
      this.identityTone.set('success');
      this.identityMessage.set(
        result.insertedAutomatically
          ? 'Los datos disponibles fueron obtenidos correctamente. Revise la información y complete los campos faltantes.'
          : 'La persona ya se encuentra registrada. Se utilizarán sus datos disponibles y puede completar la información faltante.',
      );
      return;
    }

    if (result.manualEntryAllowed) {
      this.identityTone.set('warning');
      this.identityMessage.set(
        'No se pudieron obtener los datos del documento. Complete la información manualmente.',
      );
      return;
    }

    this.identityBlocked.set(true);
    this.identityTone.set('error');
    this.identityMessage.set(
      `No fue posible validar el ${type}. Verifique el documento e intente nuevamente.`,
    );
  }

  private prefillPerson(result: IdentityResolution): void {
    this.form.patchValue({
      nombres:
        result.names
          ? normalizeText(result.names).slice(0, 100)
          : this.form.controls.nombres.value,
      apellidoPaterno:
        result.paternalSurname
          ? normalizeText(result.paternalSurname).slice(0, 80)
          : this.form.controls.apellidoPaterno.value,
      apellidoMaterno:
        result.maternalSurname
          ? normalizeText(result.maternalSurname).slice(0, 80)
          : this.form.controls.apellidoMaterno.value,
    });
  }

  private resetIdentityLookup(): void {
    this.verifiedIdentityKey.set(null);
    this.identityBlocked.set(false);
    this.identityTone.set('neutral');
    this.identityMessage.set(null);
    this.errorMessage.set(null);
  }

  private resetIdentityState(): void {
    this.identityLoading.set(false);
    this.resetIdentityLookup();
  }

  private identityKey(
    type: TipoDocumentoEmpleado,
    documentNumber: string,
  ): string {
    return `${type}:${sanitizeDocument(type, documentNumber)}`;
  }

  private normalizeEmployeeDocumentType(
    value: string | null | undefined,
  ): TipoDocumentoEmpleado {
    switch ((value ?? '').trim().toUpperCase()) {
      case 'RUC':
        return 'RUC';
      case 'CE':
        return 'CE';
      case 'PASAPORTE':
        return 'PASAPORTE';
      case 'OTRO':
        return 'OTRO';
      default:
        return 'DNI';
    }
  }

  private finish(result: AdminModalResult): void {
    if (this.dialogRef.nativeElement.open) {
      this.dialogRef.nativeElement.close();
    }

    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
    this.resetIdentityState();
  }
}
