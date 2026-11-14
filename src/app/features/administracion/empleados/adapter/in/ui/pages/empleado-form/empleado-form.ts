import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
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
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ReferenceItem } from '../../../../../../../../core/reference-data/reference-data.model';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { EntityRegistrationModalComponent } from '../../../../../../../../shared/forms/person-registration/entity-registration-modal';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import {
  adultBirthDateValidator,
  addYearsIsoDate,
  dateAfterMinimumAgeValidator,
  dateOrderValidator,
  dniValidator,
  maxBirthDateIso,
  minBirthDateIso,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  personNameValidator,
  phoneValidator,
  rucValidator,
  sanitizeDocument,
  sanitizePersonName,
  sanitizePhone,
  todayLocalIsoDate,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import {
  IdentityResolution,
  IdentityResolverService,
} from '../../../../../../../../shared/identity/identity-resolver.service';
import { buildSystemCode } from '../../../../../../shared/admin-code.util';
import { closeAnimatedDialog, openAnimatedDialog } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { AdminModalResult } from '../../../../../../shared/admin-modal.types';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { CrearEmpleadoUseCase } from '../../../../../application/use-case/crear-empleado.use-case';
import { EditarEmpleadoUseCase } from '../../../../../application/use-case/editar-empleado.use-case';
import {
  Empleado,
  EmpleadoDetalle,
  TipoDocumentoEmpleado,
} from '../../../../../domain/empleado.model';
import { Area } from '../../../../../../organizaciones/domain/area.model';

interface EmployeeFormOptions {
  areas: readonly Area[];
  preferredUotId?: number;
}

type IdentityFeedbackTone = 'neutral' | 'success' | 'warning' | 'error';

interface IdentityFieldLocks {
  names: boolean;
  paternalSurname: boolean;
  maternalSurname: boolean;
  birthDate: boolean;
  phone: boolean;
  email: boolean;
  geography: boolean;
  populationCenter: boolean;
  reference: boolean;
}

function emptyIdentityFieldLocks(): IdentityFieldLocks {
  return {
    names: false,
    paternalSurname: false,
    maternalSurname: false,
    birthDate: false,
    phone: false,
    email: false,
    geography: false,
    populationCenter: false,
    reference: false,
  };
}

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
    EntityRegistrationModalComponent,
  ],
  templateUrl: './empleado-form.html',
  styleUrl: './empleado-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpleadoFormComponent {
  @ViewChild(EntityRegistrationModalComponent) private identityModal!: EntityRegistrationModalComponent;
  readonly identityCaptured = signal(false);
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly createUseCase = inject(CrearEmpleadoUseCase);
  private readonly updateUseCase = inject(EditarEmpleadoUseCase);
  private readonly identities = inject(IdentityResolverService);
  private readonly references = inject(ReferenceDataService);
  private readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly identityLoading = signal(false);
  readonly identityMessage = signal<string | null>(null);
  readonly identityTone = signal<IdentityFeedbackTone>('neutral');
  readonly identityBlocked = signal(false);
  readonly verifiedIdentityKey = signal<string | null>(null);
  readonly current = signal<Empleado | EmpleadoDetalle | null>(null);
  readonly areas = signal<readonly Area[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);
  readonly identityLocks = signal<IdentityFieldLocks>(
    emptyIdentityFieldLocks(),
  );
  readonly resolvedSex = signal<string | null>(null);
  readonly cargoOptions = signal<readonly ReferenceItem[]>([]);
  readonly cargoLoading = signal(false);
  readonly cargoError = signal<string | null>(null);
  readonly assignmentChanged = signal(false);
  readonly currentAssignmentDate = signal('');

  private initialAssignmentAreaId = 0;
  private initialAssignmentCargo = '';
  private initialAssignmentDate = '';

  readonly addIcon = faUserPlus;
  readonly editIcon = faPen;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly searchIcon = faMagnifyingGlass;
  readonly today = todayLocalIsoDate();
  readonly maxBirthDate = maxBirthDateIso();
  readonly minBirthDate = minBirthDateIso();

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

  private readonly notPastEntryDateValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value || this.current()) {
      return null;
    }

    return value < this.today ? { pastDate: true } : null;
  };

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
          personNameValidator,
          Validators.maxLength(100),
        ],
      ],
      apellidoPaterno: [
        '',
        [
          Validators.required,
          notBlankValidator,
          personNameValidator,
          Validators.maxLength(80),
        ],
      ],
      apellidoMaterno: ['', [personNameValidator, Validators.maxLength(80)]],
      telefono: ['', [phoneValidator, Validators.maxLength(16)]],
      correo: [
        '',
        [
          Validators.email,
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
          Validators.maxLength(180),
        ],
      ],
      fechaNacimiento: ['', [adultBirthDateValidator()]],
      distritoCodigo: [
        '',
        [Validators.required, Validators.pattern(/^\d{6}$/)],
      ],
      centroPobladoId: [0],
      referencia: ['', [Validators.maxLength(300)]],
      uotId: [0, [Validators.required, Validators.min(1)]],
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
        dateAfterMinimumAgeValidator(
          'fechaNacimiento',
          'fechaIngreso',
          18,
          'entryBeforeAdult',
        ),
      ],
    },
  );

  open(
    options: EmployeeFormOptions,
    employee: Empleado | EmpleadoDetalle | null = null,
  ): Promise<AdminModalResult> {
    this.current.set(employee);
    this.areas.set(options.areas);
    this.resetIdentityState();
    this.identityCaptured.set(!!employee);
    this.errorMessage.set(null);
    this.loadCargoOptions();

    const detail = employee && 'fechaNacimiento' in employee
      ? (employee as EmpleadoDetalle)
      : null;

    const currentAssignment =
      detail?.areas.find(
        (item) => item.estado && !item.fechaHasta,
      ) ?? null;

    this.initialAssignmentAreaId =
      currentAssignment?.areaId
      ?? employee?.areaId
      ?? 0;
    this.initialAssignmentCargo =
      currentAssignment?.cargo
      ?? employee?.cargo
      ?? '';
    this.initialAssignmentDate =
      currentAssignment?.fechaDesde
      ?? '';

    this.currentAssignmentDate.set(
      this.initialAssignmentDate,
    );
    this.assignmentChanged.set(false);

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
      nombres: sanitizePersonName(employee?.nombres ?? '').slice(0, 100),
      apellidoPaterno: sanitizePersonName(employee?.apellidoPaterno ?? '').slice(0, 80),
      apellidoMaterno: sanitizePersonName(employee?.apellidoMaterno ?? '').slice(0, 80),
      telefono: sanitizePhone(employee?.telefono ?? ''),
      correo: (employee?.correo ?? '').trim().toLowerCase().slice(0, 180),
      fechaNacimiento: detail?.fechaNacimiento ?? '',
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      uotId: this.resolveTargetUotId(employee?.uotId ?? options.preferredUotId),
      codigoEmpleado: employee?.codigoEmpleado ?? '',
      fechaIngreso: employee?.fechaIngreso ?? '',
      areaId: this.initialAssignmentAreaId,
      cargo: this.initialAssignmentCargo,
      fechaAsignacionArea: this.initialAssignmentDate,
    });

    this.applyEntryDateValidators(false);

    if (employee) {
      this.form.controls.tipoDocumento.disable({ emitEvent: false });
      this.form.controls.numeroDocumento.disable({ emitEvent: false });
      this.form.controls.uotId.disable({ emitEvent: false });
      this.form.controls.fechaIngreso.disable({ emitEvent: false });
    } else {
      this.form.controls.tipoDocumento.enable({ emitEvent: false });
      this.form.controls.numeroDocumento.enable({ emitEvent: false });
      this.form.controls.fechaIngreso.enable({ emitEvent: false });

      if (this.uot.modo() === 'ESPECIFICA') {
        this.form.controls.uotId.disable({ emitEvent: false });
      } else {
        this.form.controls.uotId.enable({ emitEvent: false });
      }
    }

    this.applyDocumentValidators(false);
    this.syncAreaValidators(false);
    this.syncAssignmentDateState(false);

    if (employee && (type === 'DNI' || type === 'RUC')) {
      this.verifiedIdentityKey.set(
        this.identityKey(type, employee.numeroDocumento),
      );
      this.loadExistingIdentityPolicy(
        employee,
        type,
      );
    } else {
      this.identityLocks.set(emptyIdentityFieldLocks());
    }

    openAnimatedDialog(this.dialogRef.nativeElement);

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  /** Identidad común; el empleado se registra solo al confirmar los datos laborales. */
  async openSharedIdentity():Promise<void> {
    if (this.saving() || this.identityLoading() || this.current()) return;
    const result=await this.identityModal.open({
      eyebrow:'Empleados',title:'Datos de la persona',saveLabel:'Continuar',
      documents:this.documentTypes.map(item=>({value:item.value,label:item.label})),
      rucKind:'PERSONA',captureOnly:true,requireDistrictForManual:true,
      startDocument:{type:this.form.controls.tipoDocumento.value,
        number:this.form.controls.numeroDocumento.value},
    });
    if (!result?.data) return;
    const data=result.data;
    this.form.patchValue({
      tipoDocumento:data.tipoDocumento as TipoDocumentoEmpleado,
      numeroDocumento:data.numeroDocumento,nombres:data.nombres,
      apellidoPaterno:data.apellidoPaterno,apellidoMaterno:data.apellidoMaterno,
      fechaNacimiento:data.fechaNacimiento,telefono:data.telefono,correo:data.correo,
      distritoCodigo:data.distritoCodigo,centroPobladoId:data.centroPobladoId,
      referencia:data.referencia,
    });
    this.initialDistrictCode.set(data.distritoCodigo);
    this.initialPopulationCenterId.set(data.centroPobladoId||null);
    this.resolvedSex.set(data.sexo||null);
    this.applyDocumentValidators(false);
    this.verifiedIdentityKey.set(this.identityKey(data.tipoDocumento as TipoDocumentoEmpleado,data.numeroDocumento));
    this.identityBlocked.set(false);
    this.identityMessage.set(null);
    this.identityCaptured.set(true);
    this.errorMessage.set(null);
  }

  setGeography(selection: GeographySelection): void {
    const geographyLocked =
      this.isIdentityFieldReadOnly('geography');
    const populationCenterLocked =
      this.isIdentityFieldReadOnly('populationCenter');

    if (geographyLocked && populationCenterLocked) {
      return;
    }

    this.form.patchValue({
      distritoCodigo:
        geographyLocked
          ? this.form.controls.distritoCodigo.value
          : selection.districtCode,
      centroPobladoId:
        populationCenterLocked
          ? this.form.controls.centroPobladoId.value
          : selection.populationCenterId ?? 0,
    });

    if (!geographyLocked) {
      this.form.controls.distritoCodigo.markAsTouched();
    }
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
    this.identityMessage.set(null);

    this.identities
      .resolve('PERSONA', type, documentNumber)
      .pipe(finalize(() => this.identityLoading.set(false)))
      .subscribe({
        next: (result) =>
          this.applyPersonIdentity(result, type, documentNumber),
        error: () => {
          this.verifiedIdentityKey.set(
            this.identityKey(type, documentNumber),
          );
          this.identityBlocked.set(false);
          this.identityTone.set('warning');
          this.identityMessage.set(
            'No se pudieron obtener los datos de la persona. Complete la información manualmente.',
          );
        },
      });
  }

  onPersonNameInput(
    field: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno',
  ): void {
    const control = this.form.controls[field];
    const maxLength = field === 'nombres' ? 100 : 80;
    const sanitized = sanitizePersonName(control.value).slice(0, maxLength);

    if (sanitized !== control.value) {
      control.setValue(sanitized, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  onPhoneInput(): void {
    const control = this.form.controls.telefono;
    const sanitized = sanitizePhone(control.value);

    if (sanitized !== control.value) {
      control.setValue(sanitized, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  onAreaChange(): void {
    if (Number(this.form.controls.areaId.value) <= 0) {
      this.form.controls.cargo.setValue('');
    }

    this.syncAreaValidators();
    this.syncAssignmentDateState();
  }

  onCargoChange(): void {
    this.syncAssignmentDateState();
  }

  minimumEntryDate(): string | null {
    const adulthoodDate = addYearsIsoDate(
      this.form.controls.fechaNacimiento.value,
      18,
    );

    if (this.current()) {
      return adulthoodDate;
    }

    if (!adulthoodDate) {
      return this.today;
    }

    return adulthoodDate > this.today
      ? adulthoodDate
      : this.today;
  }

  availableCargoOptions(): readonly ReferenceItem[] {
    const options = this.cargoOptions();
    const currentCargo = this.form.controls.cargo.value.trim();

    if (
      !currentCargo
      || options.some(
        (item) =>
          item.label.localeCompare(
            currentCargo,
            undefined,
            { sensitivity: 'accent' },
          ) === 0,
      )
    ) {
      return options;
    }

    return [
      {
        id: `current:${currentCargo}`,
        code: currentCargo,
        label: currentCargo,
        description: null,
        active: true,
        inUse: true,
        usageCount: 1,
      },
      ...options,
    ];
  }

  availableUnits() {
    return this.uot.memberships();
  }

  onUotChange(): void {
    this.form.controls.areaId.setValue(0);
    this.form.controls.cargo.setValue('');
    this.syncAreaValidators();
    this.syncAssignmentDateState();
  }

  availableAreas(): readonly Area[] {
    const uotId = Number(this.form.getRawValue().uotId);

    return this.areas().filter(
      (area) =>
        area.uotId === uotId
        && (
          area.estado
          || area.areaId === this.initialAssignmentAreaId
        ),
    );
  }

  assignmentChangeMinimumDate(): string | null {
    const entryDate =
      this.form.controls.fechaIngreso.value.trim();
    const assignmentDate =
      this.initialAssignmentDate.trim();

    if (!entryDate) {
      return assignmentDate || null;
    }

    if (!assignmentDate) {
      return entryDate;
    }

    return assignmentDate > entryDate
      ? assignmentDate
      : entryDate;
  }

  uotLabel(): string {
    const id = Number(this.form.getRawValue().uotId);
    return this.uot.memberships().find((item) => item.uotId === id)?.nombre
      ?? 'UOT no seleccionada';
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

    if (this.saving() || this.identityLoading()) {
      return;
    }

    if (!current && !this.identityCaptured()) {
      this.errorMessage.set('Registre primero los datos de la persona.');
      return;
    }

    if (this.form.invalid) {
      const message = this.validationMessage();
      this.errorMessage.set(message);
      this.focusFirstInvalidControl();
      return;
    }

    const values = this.form.getRawValue();

    if (
      Number(values.areaId) > 0
      && this.cargoError()
    ) {
      this.errorMessage.set(this.cargoError());
      return;
    }

    if (Number(values.uotId) <= 0) {
      this.errorMessage.set('Seleccione una UOT antes de guardar.');
      return;
    }

    const documentNumber = sanitizeDocument(
      values.tipoDocumento,
      values.numeroDocumento,
    );

    if (
      !current
      && this.shouldResolveIdentity()
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
          || 'No se puede usar esta persona para el empleado.',
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
      telefono: sanitizePhone(values.telefono) || undefined,
      correo: values.correo.trim().toLowerCase() || undefined,
      fechaNacimiento: values.fechaNacimiento || undefined,
      uotId: Number(values.uotId),
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
            this.assignmentChanged()
            && values.fechaAsignacionArea
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

  private validationMessage(): string {
    const controls = this.form.controls;

    if (
      controls.tipoDocumento.invalid
      || controls.numeroDocumento.invalid
    ) {
      return 'Revise el documento.';
    }

    if (
      controls.nombres.invalid
      || controls.apellidoPaterno.invalid
      || controls.apellidoMaterno.invalid
    ) {
      return 'Revise los nombres y apellidos.';
    }

    if (controls.fechaNacimiento.invalid) {
      return 'Revise la fecha de nacimiento.';
    }

    if (controls.telefono.invalid) {
      return 'Revise el teléfono.';
    }

    if (controls.correo.invalid) {
      return 'Ingrese un correo válido.';
    }

    if (controls.distritoCodigo.invalid) {
      return 'Seleccione un distrito válido.';
    }

    if (controls.uotId.invalid) {
      return 'Seleccione una UOT.';
    }

    if (controls.fechaIngreso.invalid) {
      return 'Revise la fecha de ingreso.';
    }

    if (this.form.hasError('entryBeforeAdult')) {
      return 'La fecha de ingreso no es válida.';
    }

    if (this.form.hasError('areaDateBeforeEntry')) {
      return 'Revise la fecha de asignación del área.';
    }

    if (controls.cargo.invalid) {
      return 'Seleccione un cargo.';
    }

    if (
      this.assignmentChanged()
      && controls.fechaAsignacionArea.invalid
    ) {
      return 'Indique la fecha efectiva del cambio.';
    }

    return 'Revise los campos obligatorios.';
  }

  private focusFirstInvalidControl(): void {
    queueMicrotask(() => {
      const invalid =
        this.dialogRef.nativeElement.querySelector<HTMLElement>(
          'form .ng-invalid:not(form), form [aria-invalid="true"]',
        );

      invalid?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      invalid?.focus({ preventScroll: true });
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
        ...(this.current()
          ? []
          : [Validators.pattern(/^10\d{9}$/)]),
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

  private syncAssignmentDateState(
    emitEvent = true,
  ): void {
    const control = this.form.controls.fechaAsignacionArea;
    const current = this.current();

    if (!current) {
      this.assignmentChanged.set(false);
      this.currentAssignmentDate.set('');
      control.clearValidators();
      control.setValue('', { emitEvent: false });
      control.disable({ emitEvent: false });
      control.updateValueAndValidity({ emitEvent });
      return;
    }

    const areaId = Number(this.form.controls.areaId.value);
    const cargo =
      normalizeOptionalText(this.form.controls.cargo.value)
      ?? '';

    const changed =
      areaId !== this.initialAssignmentAreaId
      || cargo.localeCompare(
        this.initialAssignmentCargo,
        undefined,
        { sensitivity: 'accent' },
      ) !== 0;

    this.assignmentChanged.set(changed);

    if (!changed) {
      this.currentAssignmentDate.set(
        this.initialAssignmentDate,
      );
      control.clearValidators();
      control.setValue(
        this.initialAssignmentDate,
        { emitEvent: false },
      );
      control.disable({ emitEvent: false });
      control.updateValueAndValidity({ emitEvent });
      return;
    }

    this.currentAssignmentDate.set('');
    control.enable({ emitEvent: false });
    control.setValidators([Validators.required]);

    if (
      !control.value
      || control.value === this.initialAssignmentDate
    ) {
      const minimum =
        this.assignmentChangeMinimumDate();
      const suggested =
        minimum && minimum > this.today
          ? minimum
          : this.today;

      control.setValue(
        suggested,
        { emitEvent: false },
      );
    }

    control.updateValueAndValidity({ emitEvent });
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

    this.verifiedIdentityKey.set(key);
    this.identityBlocked.set(false);
    this.prefillPerson(result);

    if (result.found) {
      const resolvedType = this.form.controls.tipoDocumento.value;
      const resolvedDocument = this.form.controls.numeroDocumento.value;

      if (resolvedType === 'DNI' || resolvedType === 'RUC') {
        this.verifiedIdentityKey.set(
          this.identityKey(resolvedType, resolvedDocument),
        );
      }

      this.identityTone.set('success');
      this.identityMessage.set('Datos de la persona cargados.');
      return;
    }

    if (result.manualEntryAllowed) {
      this.identityTone.set('warning');
      this.identityMessage.set(
        'No se pudieron obtener los datos de la persona. Complete la información manualmente.',
      );
      return;
    }

    this.identityBlocked.set(true);
    this.identityTone.set('error');
    this.identityMessage.set(
      'No se pudieron obtener los datos de la persona. Intente nuevamente.',
    );
  }

  private prefillPerson(result: IdentityResolution): void {
    const districtCode = result.districtCode?.trim() ?? '';
    const populationCenterId = result.populationCenterId;
    const reference =
      result.locationReference
      ?? result.suggestedFiscalAddress;

    const locks = this.factilizaFieldLocks(result);

    this.form.patchValue({
      tipoDocumento:
        result.documentType === 'RUC' ? 'RUC' :
        result.documentType === 'DNI' ? 'DNI' :
        this.form.controls.tipoDocumento.value,
      numeroDocumento:
        result.documentNumber?.trim() ||
        this.form.controls.numeroDocumento.value,
      nombres:
        result.names
          ? sanitizePersonName(result.names).slice(0, 100)
          : this.form.controls.nombres.value,
      apellidoPaterno:
        result.paternalSurname
          ? sanitizePersonName(result.paternalSurname).slice(0, 80)
          : this.form.controls.apellidoPaterno.value,
      apellidoMaterno:
        result.maternalSurname
          ? sanitizePersonName(result.maternalSurname).slice(0, 80)
          : this.form.controls.apellidoMaterno.value,
      telefono:
        result.phone
          ? sanitizePhone(result.phone)
          : this.form.controls.telefono.value,
      correo:
        result.email
          ? result.email.trim().toLowerCase().slice(0, 180)
          : this.form.controls.correo.value,
      fechaNacimiento:
        result.birthDate
          ? result.birthDate
          : this.form.controls.fechaNacimiento.value,
      distritoCodigo:
        districtCode
          ? districtCode
          : this.form.controls.distritoCodigo.value,
      centroPobladoId:
        populationCenterId && populationCenterId > 0
          ? populationCenterId
          : this.form.controls.centroPobladoId.value,
      referencia:
        reference
          ? normalizeText(reference).slice(0, 300)
          : this.form.controls.referencia.value,
    });

    this.resolvedSex.set(result.sex?.trim() || null);
    this.identityLocks.set(locks);

    if (districtCode) {
      this.initialDistrictCode.set(districtCode);
      this.initialPopulationCenterId.set(
        populationCenterId && populationCenterId > 0
          ? populationCenterId
          : null,
      );
    }
  }

  isIdentityFieldReadOnly(
    field: keyof IdentityFieldLocks,
  ): boolean {
    return this.identityLocks()[field];
  }

  private loadExistingIdentityPolicy(
    employee: Empleado | EmpleadoDetalle,
    type: 'DNI' | 'RUC',
  ): void {
    const documentNumber =
      sanitizeDocument(type, employee.numeroDocumento);

    this.identityLoading.set(true);

    this.identities
      .resolve('PERSONA', type, documentNumber)
      .pipe(finalize(() => this.identityLoading.set(false)))
      .subscribe({
        next: (result) => {
          if (
            result.entityId !== null
            && result.entityId !== employee.empleadoId
          ) {
            this.identityLocks.set(emptyIdentityFieldLocks());
            return;
          }

          this.identityLocks.set(
            this.factilizaFieldLocks(result),
          );
          this.resolvedSex.set(result.sex?.trim() || null);
        },
        error: () => {
          this.identityLocks.set(emptyIdentityFieldLocks());
        },
      });
  }

  private factilizaFieldLocks(
    result: IdentityResolution,
  ): IdentityFieldLocks {
    const status =
      (result.queryStatus ?? '').trim().toUpperCase();

    if (!status.startsWith('EXITO')) {
      return emptyIdentityFieldLocks();
    }

    const separator = status.indexOf('|');
    const encodedFields =
      separator >= 0
        ? status.slice(separator + 1)
        : '';

    const fields = new Set(
      encodedFields
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );

    if (fields.size === 0) {
      return {
        names: Boolean(result.names?.trim()),
        paternalSurname: Boolean(result.paternalSurname?.trim()),
        maternalSurname: Boolean(result.maternalSurname?.trim()),
        birthDate: Boolean(result.birthDate),
        phone: false,
        email: false,
        geography: Boolean(result.districtCode?.trim()),
        populationCenter:
          result.populationCenterId !== null
          && result.populationCenterId > 0,
        reference: Boolean(
          result.locationReference?.trim()
          || result.suggestedFiscalAddress?.trim(),
        ),
      };
    }

    return {
      names: fields.has('NOMBRES'),
      paternalSurname: fields.has('APELLIDO_PATERNO'),
      maternalSurname: fields.has('APELLIDO_MATERNO'),
      birthDate: fields.has('FECHA_NACIMIENTO'),
      phone: fields.has('TELEFONO'),
      email: fields.has('CORREO'),
      geography: fields.has('GEOGRAFIA'),
      populationCenter: fields.has('CENTRO_POBLADO'),
      reference: fields.has('REFERENCIA'),
    };
  }

  private loadCargoOptions(): void {
    this.cargoLoading.set(true);
    this.cargoError.set(null);

    this.references
      .catalog('CARGO_EMPLEADO', true)
      .pipe(finalize(() => this.cargoLoading.set(false)))
      .subscribe({
        next: (items) => this.cargoOptions.set(items),
        error: () => {
          this.cargoOptions.set([]);
          this.cargoError.set(
            'No se pudieron cargar los cargos.',
          );
        },
      });
  }

  private applyEntryDateValidators(
    emitEvent = true,
  ): void {
    const control = this.form.controls.fechaIngreso;

    control.setValidators(
      this.current()
        ? [Validators.required]
        : [
            Validators.required,
            this.notPastEntryDateValidator,
          ],
    );

    control.updateValueAndValidity({ emitEvent });
  }

  private resetIdentityLookup(): void {
    const locks = this.identityLocks();

    this.form.patchValue(
      {
        nombres: locks.names ? '' : this.form.controls.nombres.value,
        apellidoPaterno:
          locks.paternalSurname
            ? ''
            : this.form.controls.apellidoPaterno.value,
        apellidoMaterno:
          locks.maternalSurname
            ? ''
            : this.form.controls.apellidoMaterno.value,
        telefono:
          locks.phone ? '' : this.form.controls.telefono.value,
        correo:
          locks.email ? '' : this.form.controls.correo.value,
        fechaNacimiento:
          locks.birthDate
            ? ''
            : this.form.controls.fechaNacimiento.value,
        distritoCodigo:
          locks.geography
            ? ''
            : this.form.controls.distritoCodigo.value,
        centroPobladoId:
          locks.populationCenter
            ? 0
            : this.form.controls.centroPobladoId.value,
        referencia:
          locks.reference
            ? ''
            : this.form.controls.referencia.value,
      },
      { emitEvent: false },
    );

    if (locks.geography) {
      this.initialDistrictCode.set('');
    }

    if (locks.populationCenter) {
      this.initialPopulationCenterId.set(null);
    }

    this.identityLocks.set(emptyIdentityFieldLocks());
    this.resolvedSex.set(null);
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

  private resolveTargetUotId(preferredUotId?: number | null): number {
    if (this.uot.isSpecific()) {
      return this.uot.selectedId() ?? preferredUotId ?? 0;
    }

    return preferredUotId && preferredUotId > 0 ? preferredUotId : 0;
  }

  private finish(result: AdminModalResult): void {
    closeAnimatedDialog(this.dialogRef.nativeElement, () => {
      this.resolver?.(result);
      this.resolver = null;
      this.current.set(null);
      this.errorMessage.set(null);
      this.initialAssignmentAreaId = 0;
      this.initialAssignmentCargo = '';
      this.initialAssignmentDate = '';
      this.assignmentChanged.set(false);
      this.currentAssignmentDate.set('');
      this.resetIdentityState();
    });
  }
}
