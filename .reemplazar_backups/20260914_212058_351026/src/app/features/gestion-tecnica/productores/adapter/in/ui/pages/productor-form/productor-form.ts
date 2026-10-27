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

import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
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
import { buildSystemCode } from '../../../../../../../administracion/shared/admin-code.util';
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

interface IdentityFieldLocks {
  names: boolean;
  paternalSurname: boolean;
  maternalSurname: boolean;
  birthDate: boolean;
  phone: boolean;
  email: boolean;
  geography: boolean;
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
    reference: false,
  };
}

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
  readonly identityLocks = signal<IdentityFieldLocks>(
    emptyIdentityFieldLocks(),
  );
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
      codigoSocio: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(30),
        ],
      ],
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
    this.associations.set(associations);
    this.current.set(producer);
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
        producer?.asociacionId ?? associations[0]?.value ?? 0,
      codigoSocio:
        producer?.codigoSocio
          ?? buildSystemCode(
            'SOC',
            producer?.numeroDocumento ?? '',
            30,
          ),
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

    if (producer) {
      this.identityRecordLoaded.set(true);
      this.identityLocks.set({
        names: true,
        paternalSurname: true,
        maternalSurname: true,
        birthDate: true,
        phone: true,
        email: true,
        geography: true,
        reference: true,
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
      this.form.patchValue({
        centroPobladoId: selection.populationCenterId ?? 0,
      });
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
    this.refreshGeneratedPartnerCode();
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
      this.refreshGeneratedPartnerCode();
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

  save(): void {
    if (!this.current()) {
      this.refreshGeneratedPartnerCode();
    }

    this.form.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();

    if (
      this.form.invalid
      || this.saving()
      || this.identityLoading()
    ) {
      return;
    }

    const current = this.current();
    const raw = this.form.getRawValue();
    const documentNumber = sanitizeDocument(
      raw.tipoDocumento,
      raw.numeroDocumento,
    );

    if (
      this.shouldResolveIdentity()
      && this.verifiedIdentityKey()
        !== this.identityKey(raw.tipoDocumento, documentNumber)
    ) {
      this.errorMessage.set(
        `Valide el ${raw.tipoDocumento} antes de guardar.`,
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
      codigoSocio: raw.codigoSocio.trim().toUpperCase(),
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

  private refreshGeneratedPartnerCode(): void {
    if (this.current()) {
      return;
    }

    const document = sanitizeDocument(
      this.form.controls.tipoDocumento.value,
      this.form.controls.numeroDocumento.value,
    );

    this.form.controls.codigoSocio.setValue(
      buildSystemCode('SOC', document, 30),
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

    const current = this.current();

    if (
      result.isPartner
      && (!current || result.entityId !== current.socioId)
    ) {
      this.identityBlocked.set(true);
      this.identityTone.set('error');
      this.identityMessage.set(
        'Esta persona ya está registrada como socio.',
      );
      return;
    }

    this.identityBlocked.set(false);
    this.prefillPerson(result);

    if (result.found) {
      this.identityRecordLoaded.set(true);

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

    const locks: IdentityFieldLocks = result.found
      ? {
          names: true,
          paternalSurname: true,
          maternalSurname: true,
          birthDate: true,
          phone: true,
          email: true,
          geography: true,
          reference: true,
        }
      : emptyIdentityFieldLocks();

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
    return this.identityRecordLoaded()
      && this.canEditIdentityData();
  }

  toggleIdentityEditing(enabled: boolean): void {
    this.identityEditingEnabled.set(
      enabled && this.canToggleIdentityEditing(),
    );
  }

  isIdentityFieldReadOnly(
    field: keyof IdentityFieldLocks,
  ): boolean {
    return this.identityLocks()[field]
      && !this.identityEditingEnabled();
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
          locks.geography
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

    this.identityLocks.set(emptyIdentityFieldLocks());
    this.identityEditingEnabled.set(false);
    this.identityRecordLoaded.set(false);
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
    this.resetIdentityState();
  }
}
