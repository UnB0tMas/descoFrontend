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
  faBuilding,
  faFloppyDisk,
  faMagnifyingGlass,
  faSitemap,
  faUserGroup,
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
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  notFutureDateValidator,
  optionalNotBlankValidator,
  phoneValidator,
  rucValidator,
  sanitizeDocument,
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
import { CrearAreaUseCase } from '../../../../../application/use-case/crear-area.use-case';
import { CrearAsociacionUseCase } from '../../../../../application/use-case/crear-asociacion.use-case';
import { CrearEmpresaUseCase } from '../../../../../application/use-case/crear-empresa.use-case';
import { EditarAreaUseCase } from '../../../../../application/use-case/editar-area.use-case';
import { EditarAsociacionUseCase } from '../../../../../application/use-case/editar-asociacion.use-case';
import { EditarEmpresaUseCase } from '../../../../../application/use-case/editar-empresa.use-case';
import { Area } from '../../../../../domain/area.model';
import { Empresa, OrganizacionDetalle } from '../../../../../domain/empresa.model';

type OrganizationFormKind = 'company' | 'association' | 'area' | 'view';
type IdentityFeedbackTone = 'neutral' | 'success' | 'warning' | 'error';

interface IdentityFieldLocks {
  businessName: boolean;
  phone: boolean;
  email: boolean;
  geography: boolean;
  reference: boolean;
}

function emptyIdentityFieldLocks(): IdentityFieldLocks {
  return {
    businessName: false,
    phone: false,
    email: false,
    geography: false,
    reference: false,
  };
}

interface OrganizationFormOptions {
  preferredUotId?: number;
}

interface AreaModalOptions extends OrganizationFormOptions {
  areas: readonly Area[];
}

@Component({
  selector: 'app-organizacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
  ],
  templateUrl: './organizacion-form.html',
  styleUrl: './organizacion-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizacionFormComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly fb = inject(FormBuilder);
  private readonly createCompanyUseCase = inject(CrearEmpresaUseCase);
  private readonly updateCompanyUseCase = inject(EditarEmpresaUseCase);
  private readonly createAssociationUseCase = inject(CrearAsociacionUseCase);
  private readonly updateAssociationUseCase = inject(EditarAsociacionUseCase);
  private readonly createAreaUseCase = inject(CrearAreaUseCase);
  private readonly updateAreaUseCase = inject(EditarAreaUseCase);
  private readonly identities = inject(IdentityResolverService);
  private readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);

  readonly kind = signal<OrganizationFormKind>('company');
  readonly saving = signal(false);
  readonly identityLoading = signal(false);
  readonly identityMessage = signal<string | null>(null);
  readonly identityTone = signal<IdentityFeedbackTone>('neutral');
  readonly identityBlocked = signal(false);
  readonly verifiedIdentityKey = signal<string | null>(null);
  readonly currentCompany = signal<Empresa | null>(null);
  readonly currentArea = signal<Area | null>(null);
  readonly detail = signal<OrganizacionDetalle | null>(null);
  readonly areaOptions = signal<readonly Area[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);
  readonly identityLocks = signal<IdentityFieldLocks>(
    emptyIdentityFieldLocks(),
  );

  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly searchIcon = faMagnifyingGlass;
  readonly today = todayLocalIsoDate();
  readonly companyIcon = faBuilding;
  readonly associationIcon = faUserGroup;
  readonly areaIcon = faSitemap;

  private resolver: ((result: AdminModalResult) => void) | null = null;

  readonly companyForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    ruc: [
      '',
      [
        Validators.required,
        rucValidator('JURIDICA'),
      ],
    ],
    razonSocial: [
      '',
      [
        Validators.required,
        notBlankValidator,
        Validators.maxLength(200),
      ],
    ],
    nombreComercial: ['', [optionalNotBlankValidator, Validators.maxLength(160)]],
    telefono: ['', [phoneValidator, Validators.maxLength(16)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: [
      '',
      [Validators.required, Validators.pattern(/^\d{6}$/)],
    ],
    centroPobladoId: [0],
    referencia: ['', [optionalNotBlankValidator, Validators.maxLength(300)]],
    fechaConstitucion: ['', [notFutureDateValidator]],
    numeroPartida: ['', [optionalNotBlankValidator, Validators.maxLength(50)]],
  });

  readonly areaForm = this.fb.nonNullable.group({
    uotId: [0, [Validators.required, Validators.min(1)]],
    areaPadreId: [0],
    codigo: [
      '',
      [
        Validators.required,
        notBlankValidator,
        Validators.maxLength(30),
      ],
    ],
    nombre: [
      '',
      [
        Validators.required,
        notBlankValidator,
        Validators.maxLength(120),
      ],
    ],
  });

  openCompany(
    options: OrganizationFormOptions = {},
    detail: OrganizacionDetalle | null = null,
  ): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('company');
    this.detail.set(detail);
    this.currentCompany.set(detail?.organizacion ?? null);
    this.resetCompanyForm(detail, options.preferredUotId);
    return this.show();
  }

  openAssociation(
    options: OrganizationFormOptions = {},
    detail: OrganizacionDetalle | null = null,
  ): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('association');
    this.detail.set(detail);
    this.currentCompany.set(detail?.organizacion ?? null);
    this.resetCompanyForm(detail, options.preferredUotId);
    return this.show();
  }

  openArea(
    options: AreaModalOptions,
    area: Area | null = null,
  ): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('area');
    this.currentArea.set(area);
    this.areaOptions.set(options.areas);

    const uotId = this.resolveTargetUotId(
      area?.uotId ?? options.preferredUotId,
    );

    this.areaForm.reset({
      uotId,
      areaPadreId: area?.areaPadreId ?? 0,
      codigo: area?.codigo ?? '',
      nombre: area?.nombre ?? '',
    });

    this.configureUotControl(this.areaForm.controls.uotId, Boolean(area));
    this.areaForm.controls.codigo[area ? 'disable' : 'enable']({
      emitEvent: false,
    });
    return this.show();
  }

  openView(detail: OrganizacionDetalle): Promise<AdminModalResult> {
    this.resetState();
    this.kind.set('view');
    this.detail.set(detail);
    this.currentCompany.set(detail.organizacion);
    return this.show();
  }

  setGeography(selection: GeographySelection): void {
    if (this.identityLocks().geography) {
      return;
    }

    this.companyForm.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.companyForm.controls.distritoCodigo.markAsTouched();
  }

  onRucInput(): void {
    const control = this.companyForm.controls.ruc;
    const sanitized = sanitizeDocument('RUC', control.value);

    if (sanitized !== control.value) {
      control.setValue(sanitized, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
    this.resetIdentityLookup();
  }

  canResolveRuc(): boolean {
    return !this.currentCompany()
      && !this.saving()
      && !this.identityLoading()
      && this.companyForm.controls.ruc.valid
      && this.companyForm.controls.ruc.value.length === 11;
  }

  resolveRuc(): void {
    const control = this.companyForm.controls.ruc;
    control.markAsTouched();
    control.updateValueAndValidity();

    if (!this.canResolveRuc()) {
      return;
    }

    const ruc = control.value.trim();

    this.identityLoading.set(true);
    this.identityBlocked.set(false);
    this.identityTone.set('neutral');
    this.identityMessage.set(null);

    this.identities
      .resolve('EMPRESA', 'RUC', ruc)
      .pipe(finalize(() => this.identityLoading.set(false)))
      .subscribe({
        next: (result) => this.applyCompanyIdentity(result, ruc),
        error: () => {
          this.verifiedIdentityKey.set(this.companyIdentityKey(ruc));
          this.identityBlocked.set(false);
          this.identityTone.set('warning');
          this.identityMessage.set(
            'No se pudieron obtener los datos de la empresa. Complete la información manualmente.',
          );
        },
      });
  }

  onOrganizationPhoneInput(): void {
    const control = this.companyForm.controls.telefono;
    const sanitized = sanitizePhone(control.value);

    if (sanitized !== control.value) {
      control.setValue(sanitized, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  save(): void {
    if (this.kind() === 'view') {
      this.close();
      return;
    }

    if (this.kind() === 'area') {
      this.saveArea();
      return;
    }

    this.saveOrganization();
  }

  close(): void {
    if (!this.saving() && !this.identityLoading()) {
      this.finish({ saved: false, value: null });
    }
  }

  areasForSelectedUot(): readonly Area[] {
    const currentAreaId = this.currentArea()?.areaId ?? null;
    const blockedIds = new Set<number>();

    if (currentAreaId !== null) {
      blockedIds.add(currentAreaId);

      let changed = true;
      while (changed) {
        changed = false;
        for (const area of this.areaOptions()) {
          if (
            area.areaPadreId !== null &&
            blockedIds.has(area.areaPadreId) &&
            !blockedIds.has(area.areaId)
          ) {
            blockedIds.add(area.areaId);
            changed = true;
          }
        }
      }
    }

    const uotId = Number(this.areaForm.getRawValue().uotId);

    return this.areaOptions().filter(
      (area) =>
        area.uotId === uotId &&
        !blockedIds.has(area.areaId) &&
        area.estado,
    );
  }

  title(): string {
    if (this.kind() === 'view') {
      return 'Detalle de organización';
    }

    const editing = Boolean(
      this.kind() === 'area'
        ? this.currentArea()
        : this.currentCompany(),
    );

    if (this.kind() === 'association') {
      return editing
        ? 'Editar asociación'
        : 'Registrar asociación';
    }

    if (this.kind() === 'area') {
      return editing ? 'Editar área' : 'Registrar área';
    }

    return editing ? 'Editar empresa' : 'Registrar empresa';
  }

  icon() {
    if (this.kind() === 'association') {
      return this.associationIcon;
    }

    if (this.kind() === 'area') {
      return this.areaIcon;
    }

    return this.companyIcon;
  }

  private resetCompanyForm(
    detail: OrganizacionDetalle | null,
    preferredUotId?: number,
  ): void {
    const company = detail?.organizacion ?? null;

    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(
      detail?.centroPobladoId ?? null,
    );

    this.companyForm.reset({
      uotId: this.resolveTargetUotId(company?.uotId ?? preferredUotId),
      ruc: company?.ruc ?? '',
      razonSocial: company?.razonSocial ?? '',
      nombreComercial: company?.nombreComercial ?? '',
      telefono: sanitizePhone(company?.telefono ?? ''),
      correo: (company?.correo ?? '').trim().toLowerCase().slice(0, 180),
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      fechaConstitucion: company?.fechaConstitucion ?? '',
      numeroPartida: company?.numeroPartida ?? '',
    });

    this.configureUotControl(this.companyForm.controls.uotId, Boolean(company));

    this.companyForm.controls.ruc[
      company ? 'disable' : 'enable'
    ]({ emitEvent: false });

    if (company) {
      this.verifiedIdentityKey.set(
        this.companyIdentityKey(company.ruc),
      );
    }
  }

  private saveOrganization(): void {
    this.companyForm.markAllAsTouched();

    if (
      this.companyForm.invalid ||
      this.saving() ||
      this.identityLoading()
    ) {
      return;
    }

    const values = this.companyForm.getRawValue();
    if (Number(values.uotId) <= 0) {
      this.errorMessage.set('Seleccione una UOT antes de guardar.');
      return;
    }

    const current = this.currentCompany();
    const association = this.kind() === 'association';
    const ruc = sanitizeDocument('RUC', values.ruc);

    if (!current) {
      if (
        this.verifiedIdentityKey() !==
        this.companyIdentityKey(ruc)
      ) {
        this.errorMessage.set(
          'Valide el RUC antes de guardar.',
        );
        return;
      }

      if (this.identityBlocked()) {
        this.errorMessage.set(
          this.identityMessage() ||
            'No se puede usar esta empresa para el registro.',
        );
        return;
      }
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const common = {
      uotId: Number(values.uotId),
      razonSocial: normalizeText(values.razonSocial),
      nombreComercial: normalizeOptionalText(
        values.nombreComercial,
      ),
      telefono: sanitizePhone(values.telefono) || undefined,
      correo: values.correo.trim().toLowerCase() || undefined,
      ubicacion: {
        distritoCodigo: values.distritoCodigo.trim(),
        centroPobladoId:
          Number(values.centroPobladoId) > 0
            ? Number(values.centroPobladoId)
            : undefined,
        referencia: normalizeOptionalText(values.referencia),
      },
    };

    const operation: Observable<unknown> = association
      ? current
        ? this.updateAssociationUseCase.execute(
            current.empresaId,
            {
              ...common,
              fechaConstitucion:
                values.fechaConstitucion || undefined,
              numeroPartida: normalizeOptionalText(
                values.numeroPartida,
              ),
            },
          )
        : this.createAssociationUseCase.execute({
            ruc,
            ...common,
            fechaConstitucion:
              values.fechaConstitucion || undefined,
            numeroPartida: normalizeOptionalText(
              values.numeroPartida,
            ),
          })
      : current
        ? this.updateCompanyUseCase.execute(
            current.empresaId,
            common,
          )
        : this.createCompanyUseCase.execute({
            ruc,
            ...common,
          });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            association
              ? current
                ? 'Asociación actualizada'
                : 'Asociación registrada'
              : current
                ? 'Empresa actualizada'
                : 'Empresa registrada',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error(
            'No se pudo guardar la organización',
            message,
          );
        },
      });
  }

  private saveArea(): void {
    const current = this.currentArea();

    if (!current) {
      const values = this.areaForm.getRawValue();
      this.areaForm.controls.codigo.setValue(
        buildSystemCode(
          `AREA_${Number(values.uotId)}`,
          normalizeText(values.nombre),
          30,
        ),
        { emitEvent: false },
      );
    }

    this.areaForm.markAllAsTouched();

    if (this.areaForm.invalid || this.saving()) {
      return;
    }

    const values = this.areaForm.getRawValue();
    if (Number(values.uotId) <= 0) {
      this.errorMessage.set('Seleccione una UOT antes de guardar.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const areaPadreId =
      Number(values.areaPadreId) > 0
        ? Number(values.areaPadreId)
        : undefined;

    const operation: Observable<unknown> = current
      ? this.updateAreaUseCase.execute(current.areaId, {
          uotId: Number(values.uotId),
          areaPadreId,
          nombre: normalizeText(values.nombre),
        })
      : this.createAreaUseCase.execute({
          uotId: Number(values.uotId),
          areaPadreId,
          codigo: values.codigo.trim().toUpperCase(),
          nombre: normalizeText(values.nombre),
        });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            current ? 'Área actualizada' : 'Área registrada',
          );
          this.finish({ saved: true, value: null });
        },
        error: (error) => {
          const message = mapOpenApiError(error).message;
          this.errorMessage.set(message);
          this.toast.error(
            'No se pudo guardar el área',
            message,
          );
        },
      });
  }

  private applyCompanyIdentity(
    result: IdentityResolution,
    ruc: string,
  ): void {
    this.verifiedIdentityKey.set(this.companyIdentityKey(ruc));
    this.identityBlocked.set(false);

    const districtCode = result.districtCode?.trim() ?? '';
    const populationCenterId = result.populationCenterId;
    const reference =
      result.locationReference
      ?? result.suggestedFiscalAddress;

    const locks: IdentityFieldLocks = {
      businessName:
        result.found && Boolean(result.businessName?.trim()),
      phone:
        result.found && Boolean(result.phone?.trim()),
      email:
        result.found && Boolean(result.email?.trim()),
      geography:
        result.found && Boolean(districtCode),
      reference:
        result.found && Boolean(reference?.trim()),
    };

    this.companyForm.patchValue({
      razonSocial:
        result.businessName
          ? normalizeText(result.businessName).slice(0, 200)
          : this.companyForm.controls.razonSocial.value,
      telefono:
        result.phone
          ? sanitizePhone(result.phone)
          : this.companyForm.controls.telefono.value,
      correo:
        result.email
          ? result.email.trim().toLowerCase().slice(0, 180)
          : this.companyForm.controls.correo.value,
      distritoCodigo:
        districtCode
          ? districtCode
          : this.companyForm.controls.distritoCodigo.value,
      centroPobladoId:
        populationCenterId && populationCenterId > 0
          ? populationCenterId
          : this.companyForm.controls.centroPobladoId.value,
      referencia:
        reference
          ? normalizeText(reference).slice(0, 300)
          : this.companyForm.controls.referencia.value,
    });

    this.identityLocks.set(locks);

    if (districtCode) {
      this.initialDistrictCode.set(districtCode);
      this.initialPopulationCenterId.set(
        populationCenterId && populationCenterId > 0
          ? populationCenterId
          : null,
      );
    }

    if (
      this.kind() === 'association'
      && result.found
      && result.isAssociation
    ) {
      this.identityBlocked.set(true);
      this.identityTone.set('error');
      this.identityMessage.set(
        'Esta asociación ya se encuentra registrada.',
      );
      return;
    }

    if (result.found) {
      this.identityTone.set('success');
      this.identityMessage.set(
        'Datos de la empresa cargados. Complete los campos faltantes.',
      );
      return;
    }

    this.identityTone.set(
      result.manualEntryAllowed ? 'warning' : 'error',
    );
    this.identityMessage.set(
      result.manualEntryAllowed
        ? 'No se pudieron obtener los datos de la empresa. Complete la información manualmente.'
        : 'No se pudieron obtener los datos de la empresa. Intente nuevamente.',
    );
  }

  private companyIdentityKey(ruc: string): string {
    return `EMPRESA:RUC:${ruc.trim()}`;
  }

  private resetIdentityLookup(): void {
    if (this.currentCompany()) {
      return;
    }

    const locks = this.identityLocks();

    this.companyForm.patchValue(
      {
        razonSocial:
          locks.businessName
            ? ''
            : this.companyForm.controls.razonSocial.value,
        telefono:
          locks.phone
            ? ''
            : this.companyForm.controls.telefono.value,
        correo:
          locks.email
            ? ''
            : this.companyForm.controls.correo.value,
        distritoCodigo:
          locks.geography
            ? ''
            : this.companyForm.controls.distritoCodigo.value,
        centroPobladoId:
          locks.geography
            ? 0
            : this.companyForm.controls.centroPobladoId.value,
        referencia:
          locks.reference
            ? ''
            : this.companyForm.controls.referencia.value,
      },
      { emitEvent: false },
    );

    if (locks.geography) {
      this.initialDistrictCode.set('');
      this.initialPopulationCenterId.set(null);
    }

    this.identityLocks.set(emptyIdentityFieldLocks());
    this.verifiedIdentityKey.set(null);
    this.identityBlocked.set(false);
    this.identityTone.set('neutral');
    this.identityMessage.set(null);
  }

  availableUnits() {
    return this.uot.memberships();
  }

  onUotChange(): void {
    if (this.kind() === 'area') {
      this.areaForm.controls.areaPadreId.setValue(0);
    }
  }

  uotLabel(uotId?: number | null): string {
    const id = uotId ?? (
      this.kind() === 'area'
        ? Number(this.areaForm.getRawValue().uotId)
        : Number(this.companyForm.getRawValue().uotId)
    );

    return this.uot.memberships().find((item) => item.uotId === id)?.nombre
      ?? 'UOT no seleccionada';
  }

  private resolveTargetUotId(preferredUotId?: number | null): number {
    if (this.uot.isSpecific()) {
      return this.uot.selectedId() ?? preferredUotId ?? 0;
    }

    return preferredUotId && preferredUotId > 0 ? preferredUotId : 0;
  }

  private configureUotControl(
    control: { enable(options?: { emitEvent?: boolean }): void; disable(options?: { emitEvent?: boolean }): void },
    editing: boolean,
  ): void {
    if (editing || this.uot.modo() === 'ESPECIFICA') {
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }
  }

  private show(): Promise<AdminModalResult> {
    openAnimatedDialog(this.dialogRef.nativeElement);
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private resetState(): void {
    this.errorMessage.set(null);
    this.currentCompany.set(null);
    this.currentArea.set(null);
    this.detail.set(null);
    this.areaOptions.set([]);
    this.initialDistrictCode.set('');
    this.initialPopulationCenterId.set(null);
    this.identityLoading.set(false);
    this.identityMessage.set(null);
    this.identityTone.set('neutral');
    this.identityBlocked.set(false);
    this.verifiedIdentityKey.set(null);
    this.identityLocks.set(emptyIdentityFieldLocks());
  }

  private finish(result: AdminModalResult): void {
    closeAnimatedDialog(this.dialogRef.nativeElement, () => {
      this.resolver?.(result);
      this.resolver = null;
      this.resetState();
    });
  }
}
