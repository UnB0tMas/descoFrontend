import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faMagnifyingGlass, faUserPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable, map, of, throwError } from 'rxjs';
import { ReferenceDataService } from '../../../core/reference-data/reference-data.service';
import { ReferenceItem } from '../../../core/reference-data/reference-data.model';
import { todayLocalIsoDate } from '../../../shared/forms/validators/desco-input.validators';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { GeographyCascadeComponent, GeographySelection } from '../../../shared/forms/geography-cascade/geography-cascade';
import { PersonLookupComponent } from '../../../shared/forms/person-registration/person-lookup';
import { PersonRegistrationModalComponent } from '../../../shared/forms/person-registration/person-registration-modal';
import { PersonOwnerChoice, PersonOwnerInput } from '../../../shared/forms/person-registration/person-owner-picker';
import { PredioMapComponent } from '../predios/adapter/in/ui/components/predio-map/predio-map';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { registroPredioError } from '../../../shared/feedback/expediente-error/registro-predio-error';
import { ExpedienteE1UseCase } from '../predios/expediente/application/expediente-e1.use-case';
import { PersonaE1, PredioE1 } from '../predios/expediente/domain/expediente-e1.model';
import { AdminModalResult } from '../../administracion/shared/admin-modal.types';
import { type IdentityResolution, IdentityResolverService } from '../../../shared/identity/identity-resolver.service';
import { personIdentityLocks, type PersonIdentityLocks, emptyPersonIdentityLocks } from '../../../shared/identity/person-identity-locks';
import {
  dniValidator, notBlankValidator, personNameValidator, notFutureDateValidator, maxBirthDateIso, minBirthDateIso, phoneValidator, sanitizePhone,
  normalizeText, sanitizeDocument, sanitizePersonName,
} from '../../../shared/forms/validators/desco-input.validators';

type TipoDocumentoFundo = 'DNI' | 'CE' | 'PASAPORTE';

/** Registro tradicional de fundo: persona de org.Persona, sin afiliación de convenio. */
@Component({
  selector: 'app-gestion-productiva-alta-predio', standalone: true,
  imports: [DecimalPipe, FormsModule, ReactiveFormsModule, FaIconComponent, GeographyCascadeComponent, PredioMapComponent, PersonLookupComponent, PersonRegistrationModalComponent],
  templateUrl: './gestion-productiva-alta-predio.html',
  styleUrls: ['./gestion-productiva.css', './gestion-productiva-alta-predio.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaAltaPredio {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(PersonRegistrationModalComponent) private personModal!: PersonRegistrationModalComponent;
  private readonly caso = inject(ExpedienteE1UseCase);
  private readonly identities = inject(IdentityResolverService);
  private readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly catalogos = inject(ReferenceDataService);
  private resolver: ((result: AdminModalResult) => void) | null = null;
  private personSwitching = false;
  private busquedaFundosId = 0;
  private busquedaPersonasId = 0;
  private consultaDocumentoId = 0;

  readonly searchIcon = faMagnifyingGlass;
  readonly addIcon = faUserPlus;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;
  readonly loading = signal(false);
  readonly identityLoading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly identityMessage = signal<string | null>(null);
  readonly persons = signal<PersonaE1[]>([]);
  readonly prediosExistentes = signal<PredioE1[]>([]);
  readonly buscandoPredios = signal(false);
  readonly searched = signal(false);
  readonly selected = signal<PersonaE1 | null>(null);
  readonly tiposTitularidad = signal<readonly ReferenceItem[]>([]);
  readonly tiposLoading = signal(false);
  readonly adicionales = signal<{ persona: PersonaE1; tipoTitularidad: string; porcentaje: number }[]>([]);
  readonly anadirTitular = signal(false);
  readonly personaAdicional = signal<PersonaE1 | null>(null);
  readonly resultadosAdicional = signal<PersonaE1[]>([]);
  readonly buscandoAdicional = signal(false);
  readonly registradoAdicional = signal(false);
  adicionalTipoDocumento: TipoDocumentoFundo = 'DNI';
  adicionalDocumento = '';
  adicionalTipo = 'COPROPIETARIO';
  adicionalPorcentaje = 50;
  titularidadPrincipal = 'PROPIETARIO';
  altitudM: number | null = null;
  fuenteAgua = '';
  infraestructura = '';
  observacion = '';
  fechaRegistro = '';
  fechaDesde = '';
  readonly createPerson = signal(false);
  readonly resolvedDocument = signal(false);
  readonly resolvedPersonId = signal<number | null>(null);
  private resolvedSnapshot: string | null = null;
  readonly identityLocks = signal<PersonIdentityLocks>(emptyPersonIdentityLocks());
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);
  readonly resolvedSex = signal<string | null>(null);
  readonly today = todayLocalIsoDate();
  readonly minBirthDate = minBirthDateIso();
  readonly maxBirthDate = maxBirthDateIso();
  readonly documentTypes: readonly { value: TipoDocumentoFundo; label: string }[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
  ];

  readonly personForm = this.fb.nonNullable.group({
    tipoDocumento: ['DNI' as TipoDocumentoFundo, [Validators.required]],
    numeroDocumento: ['', [Validators.required, dniValidator]],
    nombres: ['', [Validators.required, notBlankValidator, personNameValidator, Validators.minLength(2), Validators.maxLength(100)]],
    apellidoPaterno: ['', [Validators.required, notBlankValidator, personNameValidator, Validators.minLength(2), Validators.maxLength(80)]],
    apellidoMaterno: ['', [personNameValidator, Validators.maxLength(80)]],
    fechaNacimiento: ['', [notFutureDateValidator]],
    telefono: ['', [phoneValidator, Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    centroPobladoId: [0],
    referencia: ['', [Validators.maxLength(300)]],
  });

  nombre = '';
  areaTotalHa: number | null = null;
  areaCultivableHa: number | null = null;
  tipoRiego = '';
  referencia = '';
  distrito = '';
  centroPobladoId: number | null = null;
  latitude: number | undefined;
  longitude: number | undefined;

  open(): Promise<AdminModalResult> {
    this.busquedaFundosId++;
    this.busquedaPersonasId++;
    this.consultaDocumentoId++;
    this.nombre = ''; this.referencia = ''; this.distrito = '';
    this.altitudM = null; this.fuenteAgua = ''; this.infraestructura = ''; this.observacion = '';
    this.fechaRegistro = todayLocalIsoDate(); this.fechaDesde = this.fechaRegistro;
    this.titularidadPrincipal = 'PROPIETARIO'; this.adicionalTipo = 'COPROPIETARIO';
    this.adicionalTipoDocumento = 'DNI'; this.adicionalDocumento = '';
    this.adicionalPorcentaje = 50; this.adicionales.set([]); this.anadirTitular.set(false);
    this.personaAdicional.set(null); this.resultadosAdicional.set([]);
    this.registradoAdicional.set(false); this.buscandoAdicional.set(false);
    this.loadTiposTitularidad();
    this.areaTotalHa = null; this.areaCultivableHa = null; this.tipoRiego = '';
    this.centroPobladoId = null; this.latitude = undefined; this.longitude = undefined;
    this.personForm.controls.tipoDocumento.enable({emitEvent: false});
    this.personForm.reset({tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '', telefono: '', correo: '', distritoCodigo: '', centroPobladoId: 0, referencia: ''});
    this.initialDistrictCode.set(''); this.initialPopulationCenterId.set(null); this.resolvedSex.set(null);
    this.applyRequiredPersonalFields(true);
    this.loading.set(false); this.identityLoading.set(false); this.saving.set(false);
    this.persons.set([]); this.prediosExistentes.set([]); this.selected.set(null);
    this.buscandoPredios.set(false); this.searched.set(false);
    this.createPerson.set(false); this.resolvedDocument.set(false); this.resolvedPersonId.set(null); this.resolvedSnapshot = null;
    this.identityLocks.set(emptyPersonIdentityLocks()); this.identityMessage.set(null); this.error.set(null);
    this.resolvedSnapshot = null;
    this.dialog.nativeElement.showModal();
    return new Promise(resolve => { this.resolver = resolve; });
  }

  private loadTiposTitularidad(): void {
    this.tiposLoading.set(true);
    this.catalogos.catalog('TIPO_TITULARIDAD', true).pipe(finalize(() => this.tiposLoading.set(false))).subscribe({
      next: options => {
        this.tiposTitularidad.set(options.filter(x => !!x.code));
        if (!this.tiposTitularidad().some(x => x.code === this.titularidadPrincipal))
          this.titularidadPrincipal = this.tiposTitularidad()[0]?.code ?? '';
        if (!this.tiposTitularidad().some(x => x.code === this.adicionalTipo))
          this.adicionalTipo = this.tiposTitularidad()[0]?.code ?? '';
      },
      error: () => { this.tiposTitularidad.set([]); this.error.set('No se pudieron cargar los tipos de titularidad.'); },
    });
  }

  restanteTitularidad(): number {
    return Math.round((100 - this.adicionales().reduce((a,x) => a + x.porcentaje,0)) * 100) / 100;
  }

  cancelarRegistroAdicional(): void {
    this.registradoAdicional.set(false);
    this.createPerson.set(false);
    this.anadirTitular.set(true);
    this.error.set(null);
  }
  registrarAdicional(): void {
    this.registradoAdicional.set(true);
    this.manualRegistration(this.adicionalDocumento,this.adicionalTipoDocumento);
    this.anadirTitular.set(false);
  }
  buscarAdicional(): void {
    const uot=this.uot.selectedId();
    const documento=sanitizeDocument(this.adicionalTipoDocumento,this.adicionalDocumento);
    if (!uot || !documento || this.buscandoAdicional() || this.saving()) return;
    this.buscandoAdicional.set(true); this.resultadosAdicional.set([]); this.personaAdicional.set(null);
    this.caso.buscarPersonas(uot,documento).pipe(finalize(()=>this.buscandoAdicional.set(false))).subscribe({
      next: items=>{
        const filtrados=items.filter(x=>x.tipoDocumento===this.adicionalTipoDocumento && x.numeroDocumento===documento);
        this.resultadosAdicional.set(filtrados);
        if (!filtrados.length) this.error.set('Persona no encontrada. Regístrela para continuar.');
        else this.error.set(null);
      },
      error:()=>this.error.set('No se pudo buscar a la persona.'),
    });
  }
  seleccionarAdicional(persona: PersonaE1): void {
    if (this.selected()?.personaId===persona.personaId || this.adicionales().some(x=>x.persona.personaId===persona.personaId)) {
      this.error.set('La persona ya está registrada como titular.'); return;
    }
    this.personaAdicional.set(persona); this.resultadosAdicional.set([]); this.error.set(null);
  }
  agregarAdicional(): void {
    const persona=this.personaAdicional();
    const porcentaje=Number(this.adicionalPorcentaje);
    if (!persona || !this.tiposTitularidad().some(x=>x.code===this.adicionalTipo)) {
      this.error.set('Seleccione la persona y el tipo de titularidad.'); return;
    }
    if (!Number.isFinite(porcentaje)||porcentaje<=0 || Math.abs(porcentaje*100-Math.round(porcentaje*100))>0.000001 || porcentaje>=this.restanteTitularidad()) {
      this.error.set('Revise el porcentaje de titularidad.'); return;
    }
    if (this.selected()?.personaId===persona.personaId || this.adicionales().some(x=>x.persona.personaId===persona.personaId)) {
      this.error.set('La persona ya está registrada como titular.'); return;
    }
    this.adicionales.update(items=>[...items,{persona,tipoTitularidad:this.adicionalTipo,porcentaje}]);
    this.personaAdicional.set(null); this.adicionalDocumento=''; this.anadirTitular.set(false);
    this.error.set(null);
  }
  quitarAdicional(id:number):void { this.adicionales.update(items=>items.filter(x=>x.persona.personaId!==id)); }

  readonly findPersonForModal = (type: string, document: string): Observable<readonly PersonOwnerChoice[]> => {
    const uot = this.uot.selectedId();
    return uot ? this.caso.buscarPersonas(uot, document).pipe(
      map(people => people.filter(p => p.tipoDocumento === type && p.numeroDocumento === document))
    ) : of([]);
  };

  readonly savePersonForModal = (data: PersonOwnerInput): Observable<number> => {
    const uot = this.uot.selectedId();
    return uot ? this.caso.crearPersona(uot, data) : throwError(() => new Error('Seleccione el ámbito.'));
  };

  async openPersonaModal(target: 'principal' | 'adicional', mode: 'manual' | 'lookup' = 'lookup'): Promise<void> {
    if (this.personSwitching || this.saving() || this.loading() || this.identityLoading() || this.buscandoAdicional()) return;
    this.personSwitching = true;
    const dialog = this.dialog.nativeElement;
    if (!dialog.open) return;
    const scroll = dialog.querySelector<HTMLElement>('.gp-fundo-scroll');
    const previousScroll = scroll?.scrollTop ?? 0;
    const type = target === 'principal' ? this.personForm.controls.tipoDocumento.value : this.adicionalTipoDocumento;
    const document = target === 'principal' ? this.personForm.controls.numeroDocumento.value : this.adicionalDocumento;
    dialog.classList.add('gp-fundo-switching-out');
    await new Promise<void>(resolve => setTimeout(resolve, 140));
    dialog.classList.remove('gp-fundo-switching-out');
    dialog.close();
    try {
      const person = await this.personModal.open(type, document, mode);
      if (person) {
        const selected = person as PersonaE1;
        if (target === 'principal') this.select(selected);
        else { this.seleccionarAdicional(selected); this.anadirTitular.set(true); }
      }
    } catch {
      this.error.set('No se pudo abrir el registro de persona.');
    } finally {
      dialog.showModal();
      if (scroll) scroll.scrollTop = previousScroll;
      this.personSwitching = false;
    }
  }

  close(saved = false): void {
    if (this.saving()) return;
    this.busquedaFundosId++;
    this.busquedaPersonasId++;
    this.consultaDocumentoId++;
    if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
    this.resolver?.({ saved, value: null });
    this.resolver = null;
  }

  /** Identificación con el mismo diseño que el alta de socios. */
  search(): void {
    const uot = this.uot.selectedId();
    const type = this.personForm.controls.tipoDocumento.value;
    const term = sanitizeDocument(type, this.personForm.controls.numeroDocumento.value);
    if (!uot || this.loading() || this.identityLoading() || this.personForm.controls.numeroDocumento.invalid) return;
    if (type === 'DNI') { this.consultDni(); return; }
    const request = ++this.busquedaPersonasId;
    this.loading.set(true); this.error.set(null); this.searched.set(false); this.persons.set([]);
    this.caso.buscarPersonas(uot, term).pipe(finalize(() => {
      if (request === this.busquedaPersonasId) this.loading.set(false);
    })).subscribe({
      next: people => {
        if (request !== this.busquedaPersonasId) return;
        this.persons.set(people.filter(p => p.tipoDocumento === type && p.numeroDocumento === term));
        this.searched.set(true);
      },
      error: e => { if (request === this.busquedaPersonasId) this.error.set(mapOpenApiError(e).message); },
    });
  }

  changeLookupType(value: string): void {
    this.personForm.controls.tipoDocumento.setValue(value as TipoDocumentoFundo);
    this.personForm.controls.numeroDocumento.setValue('');
    this.onDocumentTypeChange();
  }

  changeLookupNumber(value: string): void {
    this.personForm.controls.numeroDocumento.setValue(value);
    this.onDocumentInput();
  }

  canSearchPerson(): boolean {
    return !!this.uot.selectedId() && !this.loading() && !this.identityLoading()
      && !this.saving() && this.personForm.controls.numeroDocumento.valid;
  }

  select(persona: PersonaE1): void {
    if (this.registradoAdicional()) {
      this.registradoAdicional.set(false); this.seleccionarAdicional(persona);
      this.createPerson.set(false); this.anadirTitular.set(true); return;
    }
    this.consultaDocumentoId++;
    this.selected.set(persona);
    this.createPerson.set(false);
    this.resolvedDocument.set(false); this.resolvedPersonId.set(null);
    this.identityLocks.set(emptyPersonIdentityLocks());
    this.persons.set([]);
    this.identityLoading.set(false);
    this.identityMessage.set(null);
    this.error.set(null);
    this.buscarFundos();
  }

  changePerson(): void {
    this.busquedaFundosId++;
    this.selected.set(null);
    this.createPerson.set(false); this.resolvedDocument.set(false); this.resolvedPersonId.set(null); this.resolvedSnapshot = null;
    this.personForm.controls.tipoDocumento.enable({emitEvent: false});
    this.identityLocks.set(emptyPersonIdentityLocks()); this.identityMessage.set(null);
    this.prediosExistentes.set([]);
    this.buscandoPredios.set(false);
    this.error.set(null);
  }

  /** Entrada manual: ninguna llamada a DESCO ni Factiliza desde el formulario de alta. */
  toggleRegistration(): void {
    if (this.createPerson()) {
      this.createPerson.set(false);
      this.resolvedDocument.set(false);
      this.identityLocks.set(emptyPersonIdentityLocks());
      this.identityMessage.set(null);
      this.personForm.controls.tipoDocumento.enable({emitEvent: false});
    } else {
      this.manualRegistration(this.personForm.controls.numeroDocumento.value, this.personForm.controls.tipoDocumento.value);
    }
  }

  private manualRegistration(document = '', type: TipoDocumentoFundo = this.personForm.controls.tipoDocumento.value): void {
    ++this.consultaDocumentoId;
    ++this.busquedaPersonasId; this.persons.set([]); this.searched.set(false); this.loading.set(false);
    this.personForm.controls.tipoDocumento.enable({emitEvent: false});
    this.personForm.reset({tipoDocumento: type, numeroDocumento: sanitizeDocument(type, document),
      nombres: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '',
      telefono: '', correo: '', distritoCodigo: '', centroPobladoId: 0, referencia: ''});
    this.initialDistrictCode.set(''); this.initialPopulationCenterId.set(null); this.resolvedSex.set(null);
    this.applyRequiredPersonalFields(true);
    this.createPerson.set(true);
    this.onDocumentTypeChange();
    this.resolvedDocument.set(false); this.resolvedPersonId.set(null);
    this.identityLocks.set(emptyPersonIdentityLocks());
    this.identityLoading.set(false);
    this.identityMessage.set(null);
    this.error.set(null);
  }

  onDocumentTypeChange(): void {
    const type = this.personForm.controls.tipoDocumento.value;
    const document = this.personForm.controls.numeroDocumento;
    document.setValue(sanitizeDocument(type, document.value));
    document.setValidators(type === 'DNI'
      ? [Validators.required, dniValidator]
      : type === 'CE'
        ? [Validators.required, Validators.pattern(/^[A-Z0-9]{9,12}$/)]
        : [Validators.required, Validators.pattern(/^[A-Z0-9]{6,20}$/)]);
    document.updateValueAndValidity();
    this.invalidateIdentity();
  }

  onDocumentInput(): void {
    const type = this.personForm.controls.tipoDocumento.value;
    const control = this.personForm.controls.numeroDocumento;
    const cleaned = sanitizeDocument(type, control.value);
    if (cleaned !== control.value) control.setValue(cleaned, {emitEvent: false});
    control.updateValueAndValidity({emitEvent: false});
    this.invalidateIdentity();
  }

  documentMaxLength(): number {
    return this.personForm.controls.tipoDocumento.value === 'DNI' ? 8 :
      this.personForm.controls.tipoDocumento.value === 'CE' ? 12 : 20;
  }

  private invalidateIdentity(): void {
    // El documento y su tipo son inmutables si proceden de una resolución.
    if (this.resolvedDocument()) return;
    this.consultaDocumentoId++;
    this.identityMessage.set(null);
    this.identityLocks.set(emptyPersonIdentityLocks());
    this.identityLoading.set(false);
  }

  sanitizeName(field: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'): void {
    const control = this.personForm.controls[field];
    const clean = sanitizePersonName(control.value);
    if (clean !== control.value) control.setValue(clean, {emitEvent: false});
    control.updateValueAndValidity({emitEvent: false});
  }

  /** Primera pantalla: la API resuelve primero BD y solo después Factiliza si está habilitado. */
  consultDni(): void {
    const document = this.personForm.controls.numeroDocumento.value.trim();
    if (!this.uot.selectedId() || this.loading() || this.identityLoading() || this.saving() || !/^\d{8}$/.test(document)) return;
    const request = ++this.consultaDocumentoId;
    this.identityLoading.set(true); this.identityMessage.set(null); this.error.set(null);
    this.identities.resolve('PERSONA', 'DNI', document)
      .pipe(finalize(() => { if (request === this.consultaDocumentoId) this.identityLoading.set(false); }))
      .subscribe({
        next: result => {
          if (request !== this.consultaDocumentoId || this.personForm.controls.numeroDocumento.value.trim() !== document) return;
          if (result.found && result.entityId && result.entityId > 0) {
            this.select({personaId: result.entityId, tipoDocumento: 'DNI', numeroDocumento: document,
              nombreCompleto: [result.names, result.paternalSurname, result.maternalSurname].filter(Boolean).join(' ').trim() || document});
          } else if (result.manualEntryAllowed) {
            this.identityLoading.set(false);
            void this.openPersonaModal('principal', 'manual');
          } else {
            this.identityMessage.set('No se pudo completar la búsqueda.');
          }
        },
        error: () => {
          if (request === this.consultaDocumentoId) this.identityMessage.set('No se pudo realizar la búsqueda.');
        },
      });
  }

  private prefillResolvedPerson(result: IdentityResolution, document: string): void {
    // El backend ya persistió los campos válidos de Factiliza y retorna el estado DESCO actualizado.
    const locks = personIdentityLocks(result);
    this.personForm.reset({
      tipoDocumento: 'DNI', numeroDocumento: document,
      nombres: normalizeText(sanitizePersonName(result.names ?? '')).slice(0, 100),
      apellidoPaterno: normalizeText(sanitizePersonName(result.paternalSurname ?? '')).slice(0, 80),
      apellidoMaterno: normalizeText(sanitizePersonName(result.maternalSurname ?? '')).slice(0, 80),
      fechaNacimiento: result.birthDate ?? '', telefono: sanitizePhone(result.phone ?? ''),
      correo: (result.email ?? '').trim().toLowerCase(), distritoCodigo: result.districtCode ?? '',
      centroPobladoId: result.populationCenterId ?? 0,
      referencia: result.locationReference ?? result.suggestedFiscalAddress ?? '',
    });
    this.initialDistrictCode.set(result.districtCode ?? '');
    this.initialPopulationCenterId.set(result.populationCenterId ?? null);
    this.resolvedSex.set(result.sex ?? null);
    this.onDocumentTypeChange();
    this.identityLocks.set(locks);
    this.resolvedPersonId.set(result.entityId && result.entityId > 0 ? result.entityId : null);
    this.applyRequiredPersonalFields(false);
    this.resolvedSnapshot = JSON.stringify(this.personForm.getRawValue());
    this.resolvedDocument.set(true);
    this.personForm.controls.tipoDocumento.disable({emitEvent: false});
    this.createPerson.set(true);
    this.persons.set([]);
    this.searched.set(false);
    this.identityMessage.set('Puede completar los datos pendientes o continuar.');
  }

  private applyRequiredPersonalFields(required: boolean): void {
    this.personForm.controls.nombres.setValidators([
      ...(required ? [Validators.required, notBlankValidator] : []),
      personNameValidator, Validators.maxLength(100),
    ]);
    this.personForm.controls.apellidoPaterno.setValidators([
      ...(required ? [Validators.required, notBlankValidator] : []),
      personNameValidator, Validators.maxLength(80),
    ]);
    this.personForm.controls.distritoCodigo.setValidators([
      ...(required ? [Validators.required] : []),
      Validators.pattern(required ? /^\d{6}$/ : /^(?:\d{6})?$/),
    ]);
    for (const key of ['nombres', 'apellidoPaterno', 'distritoCodigo'])
      this.personForm.get(key)?.updateValueAndValidity({emitEvent: false});
  }

  /** Reutiliza la persona ya registrada sin obligar a completar datos opcionales. */
  continueWithFoundPerson(): void {
    const id = this.resolvedPersonId();
    const p = this.personForm.getRawValue();
    if (!id || this.saving() || this.identityLoading()) return;
    if (this.resolvedSnapshot && JSON.stringify(this.personForm.getRawValue()) !== this.resolvedSnapshot) {
      this.registerPerson(); // Guarda solo complementos, preservando los datos originales.
      return;
    }
    this.select({
      personaId: id, tipoDocumento: p.tipoDocumento,
      numeroDocumento: p.numeroDocumento,
      nombreCompleto: [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ').trim()
        || p.numeroDocumento,
    });
  }

  isPersonFieldReadOnly(field: keyof PersonIdentityLocks): boolean {
    return this.identityLocks()[field];
  }

  geographyPerson(selection: GeographySelection): void {
    if (this.identityLocks().geography) {
      if (!this.identityLocks().populationCenter)
        this.personForm.controls.centroPobladoId.setValue(selection.populationCenterId ?? 0);
      return;
    }
    this.personForm.patchValue({distritoCodigo: selection.districtCode, centroPobladoId: selection.populationCenterId ?? 0});
  }

  sanitizePhoneInput(): void {
    const control = this.personForm.controls.telefono;
    control.setValue(sanitizePhone(control.value), {emitEvent: false});
    control.updateValueAndValidity({emitEvent: false});
  }

  personaValida(): boolean {
    return this.personForm.valid;
  }

  registerPerson(): void {
    const uot = this.uot.selectedId();
    this.personForm.markAllAsTouched();
    if (!uot || !this.createPerson() || this.saving() || this.identityLoading()) return;
    if (!this.personaValida()) {
      this.error.set('Complete el documento, los nombres y el distrito de la persona.');
      return;
    }
    const p = this.personForm.getRawValue();
    const num = sanitizeDocument(p.tipoDocumento, p.numeroDocumento);
    this.saving.set(true); this.error.set(null);
    this.caso.crearPersona(uot, {
      tipoDocumento: p.tipoDocumento, numeroDocumento: num,
      nombres: normalizeText(p.nombres), apellidoPaterno: normalizeText(p.apellidoPaterno),
      apellidoMaterno: normalizeText(p.apellidoMaterno) || undefined,
      fechaNacimiento: p.fechaNacimiento || undefined,
      telefono: sanitizePhone(p.telefono) || undefined,
      correo: p.correo.trim().toLowerCase() || undefined,
      distritoCodigo: p.distritoCodigo.trim(),
      centroPobladoId: Number(p.centroPobladoId) > 0 ? Number(p.centroPobladoId) : undefined,
      referencia: normalizeText(p.referencia) || undefined,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: id => {
        this.toast.success('Persona identificada');
        this.select({personaId: id, tipoDocumento: p.tipoDocumento,
          numeroDocumento: num,
          nombreCompleto: [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ').trim()});
      },
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }

  buscarFundos(): void {
    const uot = this.uot.selectedId(), persona = this.selected();
    if (!uot || !persona) return;
    const request = ++this.busquedaFundosId;
    this.prediosExistentes.set([]);
    this.buscandoPredios.set(true);
    this.caso.buscarPredios(uot, persona.numeroDocumento).pipe(finalize(() => {
      if (request === this.busquedaFundosId) this.buscandoPredios.set(false);
    })).subscribe({
      next: lista => {
        if (request === this.busquedaFundosId && this.selected()?.personaId === persona.personaId)
          this.prediosExistentes.set(lista);
      },
      error: e => { if (request === this.busquedaFundosId) this.error.set(mapOpenApiError(e).message); },
    });
  }

  geography(value: GeographySelection): void {
    this.distrito = value.districtCode;
    this.centroPobladoId = value.populationCenterId;
  }
  point(value: {latitude: number; longitude: number}): void {
    this.latitude = value.latitude;
    this.longitude = value.longitude;
  }

  private superficieValida(): boolean {
    const t = this.areaTotalHa, c = this.areaCultivableHa;
    return t !== null && c !== null && Number.isFinite(t) && Number.isFinite(c) &&
      t >= 0.0001 && t <= 999999.9999 && c >= 0 && c <= t &&
      Math.abs(t * 10000 - Math.round(t * 10000)) < 0.00001 &&
      Math.abs(c * 10000 - Math.round(c * 10000)) < 0.00001;
  }

  private gpsValido(): boolean {
    return this.latitude !== undefined && this.longitude !== undefined &&
      Number.isFinite(this.latitude) && Number.isFinite(this.longitude) &&
      this.latitude >= -90 && this.latitude <= 90 && this.longitude >= -180 && this.longitude <= 180;
  }

  puedeGuardar(): boolean {
    return !!this.uot.selectedId() && !!this.selected() && !this.tiposLoading() &&
      this.tiposTitularidad().some(x=>x.code===this.titularidadPrincipal) &&
      this.restanteTitularidad()>0 && this.nombre.trim().length >= 2 &&
      this.nombre.trim().length <= 140 && /^\d{6}$/.test(this.distrito) &&
      this.superficieValida() && this.tipoRiego.trim().length > 0 && this.tipoRiego.trim().length <= 30 &&
      this.gpsValido() && !this.saving() && !this.buscandoPredios() &&
      (this.altitudM === null || Number.isFinite(this.altitudM) && this.altitudM >= -500 && this.altitudM <= 7000) &&
      this.fuenteAgua.length<=150 && this.infraestructura.length<=300 && this.observacion.length<=500 &&
      !!this.fechaRegistro && !!this.fechaDesde && this.fechaDesde>=this.fechaRegistro &&
      this.fechaRegistro<=todayLocalIsoDate();
  }

  save(): void {
    const uot = this.uot.selectedId(), persona = this.selected();
    if (!uot || !persona || this.saving()) return;
    if (!this.puedeGuardar()) {
      this.error.set('Complete el nombre, la ubicación, las superficies y el tipo de riego del fundo.');
      return;
    }
    if ((this.latitude === undefined) !== (this.longitude === undefined)) {
      this.error.set('La latitud y longitud deben registrarse juntas.'); return;
    }
    if (this.prediosExistentes().some(p =>
      normalizeText(p.nombre).toLocaleLowerCase() === normalizeText(this.nombre).toLocaleLowerCase()
        && p.distritoCodigo === this.distrito)) {
      this.error.set('Este fundo ya está registrado para la persona y el distrito. Revise los registros existentes.');
      return;
    }
    this.saving.set(true); this.error.set(null);
    this.caso.altaPredio(uot, {
      personaId: persona.personaId,
      nombre: normalizeText(this.nombre),
      distritoCodigo: this.distrito,
      centroPobladoId: this.centroPobladoId ?? undefined,
      referencia: normalizeText(this.referencia) || undefined,
      latitud: Number(this.latitude!.toFixed(6)), longitud: Number(this.longitude!.toFixed(6)),
      areaTotalHa: this.areaTotalHa!, areaCultivableHa: this.areaCultivableHa!,
      tipoRiego: normalizeText(this.tipoRiego),
      altitudM: this.altitudM ?? undefined,
      fuenteAgua: normalizeText(this.fuenteAgua) || undefined,
      infraestructura: normalizeText(this.infraestructura) || undefined,
      observacion: normalizeText(this.observacion) || undefined,
      fechaRegistro: this.fechaRegistro, fechaDesde: this.fechaDesde,
      tipoTitularidadPrincipal: this.titularidadPrincipal,
      titularesAdicionales: this.adicionales().map(x=>({personaId:x.persona.personaId,
        tipoTitularidad:x.tipoTitularidad,porcentaje:x.porcentaje})),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Fundo registrado'); this.close(true); },
      error: e => this.error.set(registroPredioError(e)),
    });
  }
}
