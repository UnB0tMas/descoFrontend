import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  Input,
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

import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { PersonLookupComponent } from '../../../../../../../../shared/forms/person-registration/person-lookup';
import { PersonDataFieldsComponent } from '../../../../../../../../shared/forms/person-registration/person-data-fields';
import { GeographySelection } from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import {
  adultBirthDateValidator,
  dateOrderValidator,
  dniValidator,
  maxBirthDateIso,
  minBirthDateIso,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  notFutureDateValidator,
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
import {
  type PersonIdentityLocks, emptyPersonIdentityLocks, personIdentityLocks,
} from '../../../../../../../../shared/identity/person-identity-locks';
import {
  AdminModalResult,
  AdminSelectOption,
} from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearProductorUseCase } from '../../../../../application/use-case/crear-productor.use-case';
import { EditarProductorUseCase } from '../../../../../application/use-case/editar-productor.use-case';
import { ProductorDetalle } from '../../../../../domain/productor-detalle.model';
import {
  Productor,
  SituacionMembresia,
  TipoDocumentoProductor,
} from '../../../../../domain/productor.model';

type IdentityFeedbackTone = 'neutral' | 'success' | 'warning' | 'error';


@Component({
  selector: 'app-productor-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    PersonLookupComponent,
    PersonDataFieldsComponent,
    FormErrorComponent,
  ],
  templateUrl: './productor-form.html',
  styleUrl: './productor-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductorFormComponent {
  @Input() apappss = false;
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly createUseCase = inject(CrearProductorUseCase);
  private readonly updateUseCase = inject(EditarProductorUseCase);
  private readonly identities = inject(IdentityResolverService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);

  readonly current = signal<Productor | ProductorDetalle | null>(null);
  readonly associations = signal<readonly AdminSelectOption[]>([]);
  readonly saving = signal(false);
  readonly identityLoading = signal(false);
  readonly identityMessage = signal<string | null>(null);
  readonly identityTone = signal<IdentityFeedbackTone>('neutral');
  readonly identityBlocked = signal(false);
  readonly verifiedIdentityKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);
  readonly identityLocks = signal<PersonIdentityLocks>(emptyPersonIdentityLocks());
  readonly registrationStep = signal<'lookup' | 'form' | 'membership'>('lookup');
  readonly manualEntry = signal(false);
  readonly lookupMessage = signal<string | null>(null);
  readonly identityDocumentLocked = signal(false);
  private identityRequest = 0;
  readonly resolvedSex = signal<string | null>(null);
  readonly identityEditingEnabled = signal(false);
  readonly identityRecordLoaded = signal(false);

  readonly addIcon = faUserPlus;
  readonly editIcon = faPen;
  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly searchIcon = faMagnifyingGlass;
  readonly today = todayLocalIsoDate();
  readonly maxBirthDate = maxBirthDateIso();
  readonly minBirthDate = minBirthDateIso();

  readonly documentTypes: readonly {
    value: TipoDocumentoProductor;
    label: string;
  }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC de persona natural' },
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

  readonly form = this.fb.nonNullable.group(
    {
      tipoDocumento: [
        'DNI' as TipoDocumentoProductor,
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
      telefono: ['', [phoneValidator, Validators.maxLength(30)]],
      correo: ['', [Validators.email, Validators.maxLength(180)]],
      fechaNacimiento: ['', [adultBirthDateValidator()]],
      distritoCodigo: [
        '',
        [Validators.required, Validators.pattern(/^\d{6}$/)],
      ],
      centroPobladoId: [0],
      referencia: ['', [Validators.maxLength(300)]],
      fechaAlta: ['', [Validators.required, notFutureDateValidator]],
      asociacionId: [0, [Validators.required, Validators.min(1)]],
      fechaDesde: ['', [Validators.required, notFutureDateValidator]],
      situacionMembresia: [
        'ACTIVO' as SituacionMembresia,
        [Validators.required],
      ],
    },
    {
      validators: [
        dateOrderValidator(
          'fechaAlta',
          'fechaDesde',
          'membershipDateOrder',
        ),
      ],
    },
  );

  open(
    associations: readonly AdminSelectOption[],
    producer: Productor | ProductorDetalle | null = null,
  ): Promise<AdminModalResult<number>> {
    this.identityRequest++;
    this.associations.set(associations);
    this.current.set(producer);
    this.registrationStep.set(producer ? 'form' : 'lookup');
    this.manualEntry.set(false);
    this.identityDocumentLocked.set(!!producer);
    this.resetIdentityState();
    this.errorMessage.set(null);

    const detail = producer && 'fechaNacimiento' in producer
      ? (producer as ProductorDetalle)
      : null;
    const today = this.today;
    const type = this.normalizeProducerDocumentType(
      producer?.tipoDocumento,
    );

    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(
      detail?.centroPobladoId ?? null,
    );

    this.form.reset({
      tipoDocumento: type,
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
      asociacionId:
        (this.apappss ? associations[0]?.value : producer?.asociacionId) ?? associations[0]?.value ?? 0,
      fechaDesde:
        detail?.afiliaciones.find((item) => item.estado)?.fechaDesde
        ?? producer?.fechaAlta
        ?? today,
      situacionMembresia:
        (producer?.situacionMembresia as SituacionMembresia)
        || 'ACTIVO',
    });

    this.form.controls.fechaAlta[
      producer ? 'disable' : 'enable'
    ]({ emitEvent: false });

    this.applyDocumentValidators(false);
    this.applyRequiredPersonalFields(true);
    if (producer) this.form.controls.tipoDocumento.disable({emitEvent: false});
    else this.form.controls.tipoDocumento.enable({emitEvent: false});

    if (producer) {
      this.identityRecordLoaded.set(true);
      this.identityLocks.set({
        names: !!producer.nombres?.trim(),
        paternalSurname: !!producer.apellidoPaterno?.trim(),
        maternalSurname: !!producer.apellidoMaterno?.trim(),
        birthDate: !!detail?.fechaNacimiento,
        phone: !!producer.telefono?.trim(),
        email: !!producer.correo?.trim(),
        geography: !!detail?.distritoCodigo?.trim(),
        populationCenter: !!detail?.centroPobladoId,
        reference: !!detail?.referencia?.trim(),
      });

      if (type === 'DNI' || type === 'RUC') {
        this.verifiedIdentityKey.set(
          this.identityKey(type, producer.numeroDocumento),
        );
      }
    }

    this.dialogRef.nativeElement.showModal();

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  setGeography(selection: GeographySelection): void {
    if (this.isIdentityFieldReadOnly('geography')) {
      // El distrito oficial se conserva, pero se puede completar el centro poblado faltante.
      if (!this.isIdentityFieldReadOnly('populationCenter')) {
        this.form.patchValue({ centroPobladoId: selection.populationCenterId ?? 0 });
      }
      return;
    }

    this.form.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.form.controls.distritoCodigo.markAsTouched();
  }

  onDocumentTypeChange(): void {
    const type = this.form.controls.tipoDocumento.value;
    const control = this.form.controls.numeroDocumento;

    control.setValue(
      sanitizeDocument(type, control.value),
      { emitEvent: false },
    );

    this.applyDocumentValidators();
    this.resetIdentityLookup();
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

  /** Primera pantalla: DESCO local -> Factiliza si SQL lo permite. Nunca desde alta manual. */
  resolveIdentity(): void {
    if (this.current() || this.registrationStep() !== 'lookup' || !this.canResolveIdentity()) return;
    const type = this.form.controls.tipoDocumento.value;
    if (type !== 'DNI' && type !== 'RUC') return;
    const documentNumber = sanitizeDocument(type, this.form.controls.numeroDocumento.value);
    const key = this.identityKey(type, documentNumber);
    const request = ++this.identityRequest;
    this.identityLoading.set(true);
    this.identityBlocked.set(false);
    this.identityTone.set('neutral');
    this.identityMessage.set(null);
    this.errorMessage.set(null);
    this.identities.resolve('PERSONA', type, documentNumber)
      .pipe(finalize(() => { if (request === this.identityRequest) this.identityLoading.set(false); }))
      .subscribe({
        next: (result) => {
          if (request !== this.identityRequest || this.identityKey(this.form.controls.tipoDocumento.value, this.form.controls.numeroDocumento.value) !== key) return;
          this.applyPersonIdentity(result, type, documentNumber);
        },
        error: () => {
          if (request !== this.identityRequest) return;
          this.identityTone.set('warning');
          this.identityMessage.set('No se pudo realizar la búsqueda. Intente nuevamente.');
        },
      });
  }

  /** La segunda pantalla es solo alta: no consulta DESCO ni Factiliza. */
  startManualEntry(): void {
    if (this.current() || this.saving()) return;
    ++this.identityRequest;
    this.identityLoading.set(false);
    this.resetIdentityLookup();
    this.clearRegistrationFields();
    this.identityDocumentLocked.set(false);
    this.form.controls.tipoDocumento.enable({emitEvent: false});
    this.manualEntry.set(true);
    this.registrationStep.set('form');
    this.applyRequiredPersonalFields(true);
    this.identityTone.set('neutral');
    this.identityMessage.set(null);
  }

  backToLookup(): void {
    if (this.current() || this.saving()) return;
    ++this.identityRequest;
    this.identityLoading.set(false);
    this.resetIdentityLookup();
    this.clearRegistrationFields();
    this.identityDocumentLocked.set(false);
    this.form.controls.tipoDocumento.enable({emitEvent: false});
    this.manualEntry.set(false);
    this.registrationStep.set('lookup');
  }

  private applyRequiredPersonalFields(required: boolean): void {
    this.form.controls.nombres.setValidators([
      ...(required ? [Validators.required, notBlankValidator] : []),
      personNameValidator, Validators.maxLength(100),
    ]);
    this.form.controls.apellidoPaterno.setValidators([
      ...(required ? [Validators.required, notBlankValidator] : []),
      personNameValidator, Validators.maxLength(80),
    ]);
    this.form.controls.distritoCodigo.setValidators([
      ...(required ? [Validators.required] : []),
      Validators.pattern(/^\d{6}$/),
    ]);
    if (!required && !this.form.controls.distritoCodigo.value)
      this.form.controls.distritoCodigo.setValidators([Validators.pattern(/^(?:\d{6})?$/)]);
    for (const key of ['nombres', 'apellidoPaterno', 'distritoCodigo'])
      this.form.get(key)?.updateValueAndValidity({emitEvent: false});
  }

  /** Separa los datos personales de los datos de socio. */
  continueToMembership(): void {
    if (this.saving() || this.identityLoading() || this.identityBlocked()) return;
    if (!this.identityRecordLoaded()) {
      // Para personas nuevas se exigen los datos esenciales del registro.
      const required = ['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidoPaterno', 'distritoCodigo'];
      if (required.some(name => this.form.get(name)?.invalid)) {
        required.forEach(name => this.form.get(name)?.markAsTouched());
        this.errorMessage.set('Complete los datos obligatorios de la persona.');
        return;
      }
    }
    this.errorMessage.set(null);
    this.registrationStep.set('membership');
  }

  backToPersonalData(): void {
    if (!this.saving()) this.registrationStep.set('form');
  }

  save(): void {

    this.form.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();

    if (this.saving() || this.identityLoading()) return;
    if (this.form.invalid) {
      const personalRequired = ['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidoPaterno', 'distritoCodigo'];
      if (personalRequired.some(name => this.form.get(name)?.invalid)) {
        this.errorMessage.set('Complete los datos obligatorios de la persona para registrar al socio.');
        this.registrationStep.set('form');
      } else {
        this.errorMessage.set('Revise los datos del socio antes de guardar.');
      }
      return;
    }

    const current = this.current();
    const raw = this.form.getRawValue();
    const documentNumber = sanitizeDocument(
      raw.tipoDocumento,
      raw.numeroDocumento,
    );

    if (
      this.identityDocumentLocked()
      && !current
      && this.verifiedIdentityKey() !== this.identityKey(raw.tipoDocumento, documentNumber)
    ) {
      this.errorMessage.set(
        'El documento cambió. Vuelva a buscar a la persona.',
      );
      return;
    }

    if (this.identityBlocked()) {
      this.errorMessage.set(
        this.identityMessage()
          || 'No se puede usar esta persona para el socio.',
      );
      return;
    }

    const common = {
      tipoDocumento: raw.tipoDocumento,
      numeroDocumento: documentNumber,
      nombres: normalizeText(sanitizePersonName(raw.nombres)),
      apellidoPaterno: normalizeText(sanitizePersonName(raw.apellidoPaterno)),
      apellidoMaterno: normalizeOptionalText(sanitizePersonName(raw.apellidoMaterno)),
      telefono: normalizeOptionalText(sanitizePhone(raw.telefono)),
      correo: raw.correo.trim().toLowerCase() || undefined,
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
        referencia: normalizeOptionalText(raw.referencia),
      },
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const operation: Observable<number | void> = current
      ? this.updateUseCase.execute(current.socioId, common)
      : this.createUseCase.execute({
          ...common,
          fechaAlta: raw.fechaAlta,
        });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (value) => {
          this.toast.success(
            current
              ? 'Productor actualizado'
              : 'Productor registrado',
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

  sanitizePersonInput(
    field: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno',
  ): void {
    const control = this.form.controls[field];
    const clean = sanitizePersonName(control.value);

    if (clean !== control.value) {
      control.setValue(clean, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  sanitizePhoneInput(): void {
    const control = this.form.controls.telefono;
    const clean = sanitizePhone(control.value);

    if (clean !== control.value) {
      control.setValue(clean, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  close(): void {
    if (!this.saving() && !this.identityLoading()) {
      this.finish({ saved: false, value: null });
    }
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


  private applyPersonIdentity(
    result: IdentityResolution,
    type: 'DNI' | 'RUC',
    documentNumber: string,
  ): void {
    const current = this.current();
    if (result.isPartner && (!current || result.entityId !== current.socioId)) {
      this.identityBlocked.set(true);
      this.identityTone.set('error');
      this.identityMessage.set('Esta persona ya figura como socio. Utilice su registro existente.');
      return;
    }
    if (!result.found && !result.manualEntryAllowed) {
      this.identityBlocked.set(true);
      this.identityTone.set('warning');
      this.identityMessage.set('No se pudo completar la búsqueda. Intente nuevamente.');
      return;
    }
    this.identityBlocked.set(false);
    this.verifiedIdentityKey.set(result.found ? this.identityKey(type, documentNumber) : null);
    this.prefillPerson(result);
    this.identityDocumentLocked.set(result.found);
    if (result.found) this.form.controls.tipoDocumento.disable({emitEvent: false});
    else this.form.controls.tipoDocumento.enable({emitEvent: false});
    this.manualEntry.set(!result.found);
    this.registrationStep.set('form');
    this.identityRecordLoaded.set(result.found);
    this.applyRequiredPersonalFields(!result.found);
    this.identityTone.set(result.found ? 'success' : 'warning');
    this.identityMessage.set(result.found
      ? 'Puede completar los datos pendientes o continuar.'
      : null);
  }

  private prefillPerson(result: IdentityResolution): void {
    const districtCode = result.districtCode?.trim() ?? '';
    const populationCenterId = result.populationCenterId;
    const reference =
      result.locationReference
      ?? result.suggestedFiscalAddress;

    const locks = personIdentityLocks(result);

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
      telefono:
        result.phone
          ? sanitizePhone(result.phone).slice(0, 30)
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

  canEditIdentityData(): boolean {
    return this.permissions.has('VALIDACIONIDENTIDAD_EDITAR');
  }

  canToggleIdentityEditing(): boolean {
    // Los datos recuperados durante un ALTA nunca se desbloquean.
    return !!this.current() && this.identityRecordLoaded() && this.canEditIdentityData();
  }

  toggleIdentityEditing(enabled: boolean): void {
    this.identityEditingEnabled.set(
      enabled && this.canToggleIdentityEditing(),
    );
  }

  isIdentityFieldReadOnly(
    field: keyof PersonIdentityLocks,
  ): boolean {
    return this.identityLocks()[field]
      && !this.identityEditingEnabled();
  }

  effectiveIdentityLocks(): PersonIdentityLocks {
    return this.identityEditingEnabled() ? emptyPersonIdentityLocks() : this.identityLocks();
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
      this.initialPopulationCenterId.set(null);
    }

    this.identityLocks.set(emptyPersonIdentityLocks());
    this.identityEditingEnabled.set(false);
    this.identityRecordLoaded.set(false);
    this.resolvedSex.set(null);
    this.verifiedIdentityKey.set(null);
    this.identityBlocked.set(false);
    this.identityTone.set('neutral');
    this.identityMessage.set(null);
    this.errorMessage.set(null);
  }

  private clearRegistrationFields(): void {
    this.form.patchValue({
      nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '',
      fechaNacimiento: '', distritoCodigo: '', centroPobladoId: 0, referencia: '',
    }, {emitEvent: false});
    this.initialDistrictCode.set('');
    this.initialPopulationCenterId.set(null);
    this.resolvedSex.set(null);
  }

  private resetIdentityState(): void {
    this.identityLoading.set(false);
    this.resetIdentityLookup();
  }

  private identityKey(
    type: TipoDocumentoProductor,
    documentNumber: string,
  ): string {
    return `${type}:${sanitizeDocument(type, documentNumber)}`;
  }

  private normalizeProducerDocumentType(
    value: string | null | undefined,
  ): TipoDocumentoProductor {
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

  private finish(result: AdminModalResult<number>): void {
    if (this.dialogRef.nativeElement.open) {
      this.dialogRef.nativeElement.close();
    }

    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.errorMessage.set(null);
    this.identityRequest++;
    this.resetIdentityState();
  }
}
