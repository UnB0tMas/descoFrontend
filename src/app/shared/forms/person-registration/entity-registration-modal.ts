import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuilding, faUserPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Observable, finalize } from 'rxjs';
import { GeographyCascadeComponent, GeographySelection } from '../geography-cascade/geography-cascade';
import { PersonDataFieldsComponent } from './person-data-fields';
import { PersonDocumentOption } from './person-lookup';
import {
  dniValidator, maxBirthDateIso, minBirthDateIso, normalizeText, notFutureDateValidator,
  personNameValidator, phoneValidator, rucValidator, sanitizePersonName, sanitizePhone,
} from '../validators/desco-input.validators';
import { IdentityResolution, IdentityResolverService, IdentityTarget } from '../../identity/identity-resolver.service';
import { emptyPersonIdentityLocks, PersonIdentityLocks, personIdentityLocks } from '../../identity/person-identity-locks';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';

export type EntityKind = 'PERSONA' | 'EMPRESA';
export interface EntityDraft {
  tipoDocumento: string; numeroDocumento: string;
  nombres: string; apellidoPaterno: string; apellidoMaterno: string;
  fechaNacimiento: string; sexo: string; razonSocial: string; nombreComercial: string;
  telefono: string; correo: string; distritoCodigo: string;
  centroPobladoId: number; referencia: string;
}
export interface EntityLookupData {
  /** ID del socio/comprador, no el ID de org.Persona o org.Empresa. */
  roleId?: number | null;
  entityId?: number | null;
  data?: Partial<EntityDraft>;
}
export interface EntityExtraField {
  key: string; label: string; type: 'date' | 'text';
  value?: string; required?: boolean; max?: string;
}
export interface EntitySaveContext {
  roleId: number | null;
  identityId: number | null;
  resolution: IdentityResolution | null;
  existing: boolean;
  extras: Readonly<Record<string, string>>;
}
export interface EntityModalResult { id: number; unchanged: boolean; data?: EntityDraft; }
export interface EntityModalOptions {
  eyebrow: string;
  title: string;
  saveLabel: string;
  /** RUC de socio puede representar una persona natural. Para compradores, RUC es EMPRESA. */
  rucKind?: EntityKind;
  documents: readonly PersonDocumentOption[];
  initial?: Partial<EntityDraft>;
  /** Prellenar documento SIN considerar que la identidad existe ni bloquear el campo. */
  startDocument?: { type: string; number: string };
  /** Captura datos, no crea la relación laboral/empresarial/socio: la confirma la ventana llamadora. */
  captureOnly?: boolean;
  roleId?: number | null;
  /** La llamada local es opcional: si no existe, el resolver consulta BD -> Factiliza. */
  lookupLocal?: (type: string, document: string) => Observable<EntityLookupData | null>;
  /** Permite obtener ficha de socio ya registrado sin crear otro. */
  lookupRegistered?: (resolution: IdentityResolution) => Observable<EntityLookupData>;
  save?: (data: EntityDraft, context: EntitySaveContext) => Observable<number>;
  extras?: readonly EntityExtraField[];
  hiddenFields?: readonly (keyof PersonIdentityLocks | 'sexo' | 'nombreComercial')[];
  requireDistrictForManual?: boolean;
  allowOverwrite?: boolean;
}

const DEFAULT_DOCUMENTS: readonly PersonDocumentOption[] = [
  { value: 'DNI', label: 'DNI' }, { value: 'RUC', label: 'RUC' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];
const FALLBACK = 'No pudimos encontrar información de la persona o empresa. Puede registrarla manualmente.';

/** Modal y formulario únicos para alta/consulta/completitud de Persona y Empresa. */
@Component({
  selector: 'app-entity-registration-modal', standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, PersonDataFieldsComponent, GeographyCascadeComponent],
  templateUrl: './entity-registration-modal.html', styleUrl: './entity-registration-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityRegistrationModalComponent {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  private readonly fb = inject(FormBuilder);
  private readonly identities = inject(IdentityResolverService);
  private sequence = 0;
  private resolvePromise: ((value: EntityModalResult | null) => void) | null = null;
  private baseline: EntityDraft | null = null;
  private baselineExtras: string | null = null;

  readonly config = signal<EntityModalOptions | null>(null);
  readonly busy = signal(false);
  readonly saving = signal(false);
  readonly blocked = signal(false);
  readonly warning = signal<string | null>(null);
  readonly roleId = signal<number | null>(null);
  readonly identityId = signal<number | null>(null);
  readonly resolution = signal<IdentityResolution | null>(null);
  readonly found = signal(false);
  readonly district = signal('');
  readonly center = signal<number | null>(null);
  readonly locks = signal<PersonIdentityLocks>(emptyPersonIdentityLocks());
  readonly companyLocks = signal({razonSocial:false,nombreComercial:false,telefono:false,correo:false,geography:false,populationCenter:false,referencia:false});
  readonly documentLocked = signal(false);
  readonly iconPerson = faUserPlus;
  readonly iconCompany = faBuilding;
  readonly iconClose = faXmark;
  readonly minBirth = minBirthDateIso();
  readonly maxBirth = maxBirthDateIso();
  readonly extraForm = new FormRecord<FormControl<string>>({});

  readonly form = this.fb.nonNullable.group({
    tipoDocumento: ['DNI', Validators.required], numeroDocumento: ['', Validators.required],
    nombres: ['', [personNameValidator, Validators.maxLength(100)]],
    apellidoPaterno: ['', [personNameValidator, Validators.maxLength(80)]],
    apellidoMaterno: ['', [personNameValidator, Validators.maxLength(80)]],
    fechaNacimiento: ['', [notFutureDateValidator]], sexo: [''],
    razonSocial: ['', [Validators.maxLength(200)]],
    nombreComercial: ['', [Validators.maxLength(160)]],
    telefono: ['', [phoneValidator, Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: [''], centroPobladoId: [0],
    referencia: ['', Validators.maxLength(300)],
  });

  open(options: EntityModalOptions): Promise<EntityModalResult | null> {
    if (this.resolvePromise || this.dialog.nativeElement.open) {
      throw new Error('Ya hay un formulario de identidad abierto.');
    }
    ++this.sequence;
    this.config.set({ ...options, documents: options.documents.length ? options.documents : DEFAULT_DOCUMENTS });
    this.busy.set(false); this.saving.set(false); this.blocked.set(false); this.warning.set(null);
    this.roleId.set(options.roleId ?? null); this.identityId.set(null); this.resolution.set(null);
    this.found.set(!!options.initial); this.documentLocked.set(!!options.initial);
    this.form.reset({ tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '',
      apellidoMaterno: '', fechaNacimiento: '', sexo: '', razonSocial: '', nombreComercial: '',
      telefono: '', correo: '', distritoCodigo: '', centroPobladoId: 0, referencia: '' });
    for (const key of Object.keys(this.extraForm.controls)) this.extraForm.removeControl(key);
    for (const field of options.extras ?? []) {
      this.extraForm.addControl(field.key, new FormControl(field.value ?? '', {
        nonNullable: true, validators: field.required ? [Validators.required] : [],
      }));
    }
    const defaultType = options.initial?.tipoDocumento ?? options.startDocument?.type
      ?? (this.config()?.documents.some(d => d.value === 'DNI') ? 'DNI' : this.config()?.documents[0]?.value ?? 'DNI');
    this.form.controls.tipoDocumento.setValue(defaultType);
    this.setDocumentValidators();
    if (options.startDocument && !options.initial) {
      this.form.controls.numeroDocumento.setValue(this.cleanDoc(options.startDocument.number));
      this.form.controls.numeroDocumento.updateValueAndValidity({emitEvent:false});
    }
    if (options.initial) this.fill(options.initial, true);
    else this.resetLocks();
    this.setRequiredFields();
    this.baseline = options.initial ? this.form.getRawValue() : null;
    this.baselineExtras = options.initial ? JSON.stringify(this.extraForm.getRawValue()) : null;
    this.dialog.nativeElement.showModal();
    return new Promise(resolve => { this.resolvePromise = resolve; });
  }

  entityKind(): EntityKind {
    const doc = this.form.controls.tipoDocumento.value;
    return doc === 'RUC' ? (this.config()?.rucKind ?? 'EMPRESA') : 'PERSONA';
  }
  documents(): readonly PersonDocumentOption[] { return this.config()?.documents ?? DEFAULT_DOCUMENTS; }
  maxDoc(): number {
    switch (this.form.controls.tipoDocumento.value) {
      case 'DNI': return 8;
      case 'RUC': return 11;
      case 'CE': return 20;
      default: return 30;
    }
  }
  inputMode(): 'numeric' | 'text' {
    return ['DNI', 'RUC'].includes(this.form.controls.tipoDocumento.value) ? 'numeric' : 'text';
  }
  hidden(key: string): boolean { return !!this.config()?.hiddenFields?.includes(key as keyof PersonIdentityLocks); }
  private documentValid(): boolean { return this.form.controls.numeroDocumento.valid; }
  canSearch(): boolean { return !this.busy() && this.documentValid() && !this.documentLocked(); }

  documentTypeChanged(): void {
    if (this.documentLocked()) return;
    this.form.controls.numeroDocumento.setValue('');
    this.invalidateLookup();
    this.setDocumentValidators();
    this.setRequiredFields();
  }
  documentChanged(): void {
    if (this.documentLocked()) return;
    const control = this.form.controls.numeroDocumento;
    control.setValue(this.cleanDoc(control.value), { emitEvent: false });
    this.invalidateLookup();
    control.updateValueAndValidity({ emitEvent: false });
  }
  private cleanDoc(raw: string): string {
    const numeric = this.inputMode() === 'numeric';
    return (raw || '').toUpperCase().replace(numeric ? /\D/g : /[^A-Z0-9]/g, '').slice(0, this.maxDoc());
  }
  private setDocumentValidators(): void {
    const type = this.form.controls.tipoDocumento.value;
    const list = type === 'DNI' ? [Validators.required, dniValidator]
      : type === 'RUC' && this.config()?.rucKind === 'PERSONA'
        ? [Validators.required, rucValidator('NATURAL')]
        : type === 'RUC' ? [Validators.required, Validators.pattern(/^\d{11}$/)]
        : type === 'CE' ? [Validators.required, Validators.pattern(/^[A-Z0-9]{6,20}$/)]
        : [Validators.required, Validators.pattern(/^[A-Z0-9]{5,30}$/)];
    this.form.controls.numeroDocumento.setValidators(list);
    this.form.controls.numeroDocumento.updateValueAndValidity({ emitEvent: false });
  }
  private setRequiredFields(): void {
    // Registros ya persistidos por la búsqueda admiten completar cero campos opcionales.
    const manual = !this.found();
    this.form.controls.nombres.setValidators([
      ...(manual && this.entityKind() === 'PERSONA' ? [Validators.required] : []),
      personNameValidator, Validators.maxLength(100),
    ]);
    this.form.controls.apellidoPaterno.setValidators([
      ...(manual && this.entityKind() === 'PERSONA' ? [Validators.required] : []),
      personNameValidator, Validators.maxLength(80),
    ]);
    this.form.controls.razonSocial.setValidators([
      ...(manual && this.entityKind() === 'EMPRESA' ? [Validators.required] : []),
      Validators.maxLength(200),
    ]);
    this.form.controls.distritoCodigo.setValidators([
      ...(manual && this.config()?.requireDistrictForManual ? [Validators.required] : []),
      Validators.pattern(/^(?:\d{6})?$/),
    ]);
    for (const key of ['nombres','apellidoPaterno','razonSocial','distritoCodigo'] as const) {
      this.form.controls[key].updateValueAndValidity({ emitEvent: false });
    }
  }
  private resetLocks(): void {
    this.locks.set(emptyPersonIdentityLocks());
    this.companyLocks.set({razonSocial:false,nombreComercial:false,telefono:false,correo:false,
      geography:false,populationCenter:false,referencia:false});
    this.district.set(''); this.center.set(null);
  }
  private invalidateLookup(): void {
    ++this.sequence;
    this.busy.set(false); this.blocked.set(false); this.warning.set(null); this.roleId.set(null);
    this.identityId.set(null); this.resolution.set(null); this.found.set(false);
    this.baseline = null; this.baselineExtras = null;
    this.resetLocks();
    this.form.patchValue({nombres:'',apellidoPaterno:'',apellidoMaterno:'',fechaNacimiento:'',sexo:'',
      razonSocial:'',nombreComercial:'',telefono:'',correo:'',distritoCodigo:'',centroPobladoId:0,referencia:''}, {emitEvent:false});
    this.setRequiredFields();
  }
  private fill(data: Partial<EntityDraft>, established: boolean): void {
    this.form.patchValue(data, { emitEvent: false });
    this.district.set(data.distritoCodigo ?? ''); this.center.set(data.centroPobladoId || null);
    const has = (value: unknown): boolean => typeof value === 'string' ? value.trim().length > 0 : !!value;
    const isLocked = established && !this.config()?.allowOverwrite;
    const resolution = this.resolution();
    if (isLocked) {
      const fromApi = resolution ? personIdentityLocks(resolution) : emptyPersonIdentityLocks();
      this.locks.set({
        names:has(data.nombres)||fromApi.names,
        paternalSurname:has(data.apellidoPaterno)||fromApi.paternalSurname,
        maternalSurname:has(data.apellidoMaterno)||fromApi.maternalSurname,
        birthDate:has(data.fechaNacimiento)||fromApi.birthDate,
        phone:has(data.telefono)||fromApi.phone,
        email:has(data.correo)||fromApi.email,
        geography:has(data.distritoCodigo)||fromApi.geography,
        populationCenter:has(data.centroPobladoId)||fromApi.populationCenter,
        reference:has(data.referencia)||fromApi.reference,
      });
      this.companyLocks.set({razonSocial:has(data.razonSocial),nombreComercial:has(data.nombreComercial),
        telefono:has(data.telefono),correo:has(data.correo),geography:has(data.distritoCodigo),
        populationCenter:has(data.centroPobladoId),referencia:has(data.referencia)});
    } else this.resetLocksPreservingGeography();
    this.found.set(established);
    this.setRequiredFields();
    this.baseline = this.form.getRawValue();
    this.baselineExtras = JSON.stringify(this.extraForm.getRawValue());
  }
  private resetLocksPreservingGeography(): void {
    this.locks.set(emptyPersonIdentityLocks());
    this.companyLocks.set({razonSocial:false,nombreComercial:false,telefono:false,correo:false,
      geography:false,populationCenter:false,referencia:false});
  }
  private prefillResolution(result: IdentityResolution): void {
    this.resolution.set(result);
    this.identityId.set(result.entityId);
    if (!result.found) { this.found.set(false); this.setRequiredFields(); this.warning.set(FALLBACK); return; }
    const values: Partial<EntityDraft> = {
      nombres: result.names ?? '', apellidoPaterno: result.paternalSurname ?? '',
      apellidoMaterno: result.maternalSurname ?? '', fechaNacimiento: result.birthDate ?? '',
      sexo: result.sex ?? '', razonSocial: result.businessName ?? '',
      telefono: result.phone ?? '', correo: result.email ?? '',
      distritoCodigo: result.districtCode ?? '', centroPobladoId: result.populationCenterId ?? 0,
      referencia: result.locationReference ?? result.suggestedFiscalAddress ?? '',
    };
    this.fill(values, true);
    this.warning.set(null);
    this.documentLocked.set(true);
  }
  search(): void {
    if (!this.canSearch()) { this.warning.set('Ingrese un documento válido.'); return; }
    const config = this.config();
    if (!config) return;
    const type = this.form.controls.tipoDocumento.value;
    const document = this.cleanDoc(this.form.controls.numeroDocumento.value);
    const token = ++this.sequence;
    this.busy.set(true); this.warning.set(null);
    if (config.lookupLocal) {
      config.lookupLocal(type, document).subscribe({
        next: local => {
          if (token !== this.sequence) return;
          if (local) {
            this.busy.set(false);
            this.roleId.set(local.roleId ?? null); this.identityId.set(local.entityId ?? null);
            this.fill(local.data ?? {}, true); this.documentLocked.set(true);
            return;
          }
          this.queryIdentity(type, document, token);
        },
        error: e => { if (token === this.sequence) { this.busy.set(false); this.warning.set(mapOpenApiError(e).message); } },
      });
    } else this.queryIdentity(type, document, token);
  }
  private queryIdentity(type: string, document: string, token: number): void {
    if (type !== 'DNI' && type !== 'RUC') {
      this.busy.set(false); this.warning.set(FALLBACK); return;
    }
    const target: IdentityTarget = this.entityKind();
    this.identities.resolve(target, type, document).subscribe({
        next: result => {
          if (token !== this.sequence) return;
          if (result.found && result.isPartner && this.config()?.lookupRegistered) {
            if (!result.entityId) {
              this.busy.set(false); this.blocked.set(true);
              this.warning.set('El socio ya existe, pero no se pudo obtener su ficha.');
              return;
            }
            this.config()!.lookupRegistered!(result).pipe(finalize(() => {
              if (token === this.sequence) this.busy.set(false);
            })).subscribe({
              next: existing => {
                if (token !== this.sequence) return;
                this.prefillResolution(result);
                this.roleId.set(existing.roleId ?? null);
                if (existing.data) this.fill(existing.data, true);
              },
              error: e => {
                if (token === this.sequence) {
                  this.blocked.set(true);
                  this.warning.set('No se pudo recuperar el registro existente: ' + mapOpenApiError(e).message);
                }
              },
            });
            return;
          }
          this.prefillResolution(result);
          this.busy.set(false);
        },
        error: () => {
          if (token === this.sequence) { this.busy.set(false); this.warning.set(FALLBACK); }
        },
      });
  }
  geography(value: GeographySelection): void {
    if (this.locks().geography && this.entityKind() === 'PERSONA') {
      if (!this.locks().populationCenter) {
        this.center.set(value.populationCenterId ?? null);
        this.form.controls.centroPobladoId.setValue(value.populationCenterId ?? 0);
      }
      return;
    }
    if (this.companyLocks().geography && this.entityKind() === 'EMPRESA') {
      if (!this.companyLocks().populationCenter) {
        this.center.set(value.populationCenterId ?? null);
        this.form.controls.centroPobladoId.setValue(value.populationCenterId ?? 0);
      }
      return;
    }
    this.district.set(value.districtCode); this.center.set(value.populationCenterId ?? null);
    this.form.patchValue({distritoCodigo:value.districtCode,centroPobladoId:value.populationCenterId ?? 0});
  }
  sanitizeName(field: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'): void {
    const control = this.form.controls[field];
    control.setValue(sanitizePersonName(control.value), {emitEvent:false});
  }
  sanitizePhone(): void {
    const control = this.form.controls.telefono;
    control.setValue(sanitizePhone(control.value), {emitEvent:false});
  }
  changed(): boolean {
    return !this.baseline || JSON.stringify(this.form.getRawValue()) !== JSON.stringify(this.baseline)
      || JSON.stringify(this.extraForm.getRawValue()) !== this.baselineExtras;
  }
  save(): void {
    const config = this.config();
    if (!config || this.busy() || this.saving()) return;
    if (this.blocked()) { this.warning.set('Primero debe recuperarse el registro existente.'); return; }
    if (this.roleId() && !this.changed()) {
      this.finish({id:this.roleId()!,unchanged:true,data:this.form.getRawValue()}); return;
    }
    this.form.markAllAsTouched(); this.extraForm.markAllAsTouched();
    if (this.form.invalid || this.extraForm.invalid) {
      this.warning.set('Revise los campos obligatorios.'); return;
    }
    const raw = this.form.getRawValue();
    if (this.entityKind() === 'PERSONA' && !this.found() && (!raw.nombres.trim() || !raw.apellidoPaterno.trim())
      || this.entityKind() === 'EMPRESA' && !this.found() && !raw.razonSocial.trim()) {
      this.warning.set('Complete los datos de identidad.'); return;
    }
    if (!raw.distritoCodigo && (raw.centroPobladoId > 0 || (!this.found() && !!raw.referencia.trim()))) {
      this.warning.set('Seleccione un distrito para registrar la ubicación.'); return;
    }
    if (this.roleId() && !config.allowOverwrite && this.baseline) {
      const changes = Object.keys(raw).filter(k => raw[k as keyof EntityDraft] !== this.baseline![k as keyof EntityDraft]);
      const kind = this.entityKind();
      const protectedPerson: Record<string, keyof PersonIdentityLocks> = {
        nombres:'names',apellidoPaterno:'paternalSurname',apellidoMaterno:'maternalSurname',
        fechaNacimiento:'birthDate',telefono:'phone',correo:'email',distritoCodigo:'geography',
        centroPobladoId:'populationCenter',referencia:'reference',
      };
      const company = this.companyLocks();
      if (changes.some(key => {
        const personKey = protectedPerson[key];
        return kind === 'PERSONA' ? !!(personKey && this.locks()[personKey])
          : !!company[key as keyof typeof company];
      })) {
        this.warning.set('Los datos ya registrados no pueden reemplazarse desde aquí.'); return;
      }
    }
    const data: EntityDraft = {
      ...raw, numeroDocumento: this.cleanDoc(raw.numeroDocumento),
      nombres:normalizeText(raw.nombres),apellidoPaterno:normalizeText(raw.apellidoPaterno),
      apellidoMaterno:normalizeText(raw.apellidoMaterno),razonSocial:normalizeText(raw.razonSocial),
      nombreComercial:normalizeText(raw.nombreComercial),telefono:sanitizePhone(raw.telefono),
      correo:raw.correo.trim().toLowerCase(),referencia:normalizeText(raw.referencia),
    };
    if (config.captureOnly) {
      this.finish({id:this.roleId() ?? 0, unchanged:!this.changed(), data});
      return;
    }
    if (!config.save) { this.warning.set('No hay una operación de registro disponible.'); return; }
    this.saving.set(true); this.warning.set(null);
    try {
      config.save(data, {
        roleId:this.roleId(),identityId:this.identityId(),resolution:this.resolution(),
        existing:this.found(),extras:this.extraForm.getRawValue(),
      }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: id => {
        if (!Number.isSafeInteger(id) || id <= 0) { this.warning.set('No se confirmó el registro.'); return; }
        this.finish({id,unchanged:false,data});
      },
      error: error => this.warning.set(mapOpenApiError(error).message),
      });
    } catch (error) {
      this.saving.set(false);
      this.warning.set(error instanceof Error ? error.message : 'No se pudo guardar el registro.');
    }
  }
  close(): void {
    if (this.saving()) return;
    this.finish(null);
  }
  private finish(result: EntityModalResult | null): void {
    ++this.sequence;
    this.busy.set(false);
    if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
    const resolve = this.resolvePromise;
    this.resolvePromise = null;
    this.config.set(null);
    resolve?.(result);
  }
}
