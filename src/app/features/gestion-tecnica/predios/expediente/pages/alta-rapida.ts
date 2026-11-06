import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';
import { PageHeaderComponent } from '../../../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../../../shared/feedback/toast-center/toast.service';
import { GeographyCascadeComponent, GeographySelection } from '../../../../../shared/forms/geography-cascade/geography-cascade';
import { PersonDataFieldsComponent } from '../../../../../shared/forms/person-registration/person-data-fields';
import { dniValidator, notBlankValidator, personNameValidator, notFutureDateValidator, phoneValidator, maxBirthDateIso, minBirthDateIso, sanitizeDocument, sanitizePersonName, sanitizePhone, normalizeText } from '../../../../../shared/forms/validators/desco-input.validators';
import { UotContextStore } from '../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { registroPredioError } from '../../../../../shared/feedback/expediente-error/registro-predio-error';
import { PredioMapComponent } from '../../adapter/in/ui/components/predio-map/predio-map';
import { ExpedienteE1UseCase } from '../application/expediente-e1.use-case';
import { PersonaE1, PredioE1 } from '../domain/expediente-e1.model';

@Component({
  selector: 'app-predio-alta-rapida', standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, GeographyCascadeComponent, PredioMapComponent, PersonDataFieldsComponent],
  templateUrl: './alta-rapida.html', styleUrl: './expediente-e1.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredioAltaRapidaPage implements OnInit {
  private readonly caso = inject(ExpedienteE1UseCase);
  private readonly fb = inject(FormBuilder);
  private readonly uot = inject(UotContextStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly convenioId = Number(this.route.snapshot.queryParamMap.get('convenioId')) || undefined;
  private readonly toast = inject(ToastService);
  readonly icon = faMapLocationDot;
  readonly buscando = signal(false);
  readonly guardando = signal(false);
  readonly encontrados = signal<PersonaE1[]>([]);
  readonly busquedaRealizada = signal(false);
  readonly predios = signal<PredioE1[]>([]);
  readonly seleccionado = signal<PersonaE1 | null>(null);
  readonly error = signal<string | null>(null);
  busqueda = '';
  nombre = '';
  distrito = '';
  referencia = '';
  areaTotalHa: number | null = null;
  areaCultivableHa: number | null = null;
  tipoRiego = '';
  latitud: number | undefined;
  longitud: number | undefined;
  readonly documentTypes = [
    {value: 'DNI',label: 'DNI'}, {value: 'CE',label: 'Carné de extranjería'},
    {value: 'PASAPORTE',label: 'Pasaporte'},
  ];
  readonly minBirthDate = minBirthDateIso();
  readonly maxBirthDate = maxBirthDateIso();
  readonly personDistrict = signal('');
  readonly personCenter = signal<number | null>(null);
  readonly personForm = this.fb.nonNullable.group({
    tipoDocumento: ['DNI',Validators.required],
    numeroDocumento: ['', [Validators.required,dniValidator]],
    nombres: ['', [Validators.required,notBlankValidator,personNameValidator]],
    apellidoPaterno: ['', [Validators.required,notBlankValidator,personNameValidator]],
    apellidoMaterno: ['', personNameValidator],
    fechaNacimiento: ['', notFutureDateValidator],
    telefono: ['', phoneValidator], correo: ['', Validators.email],
    distritoCodigo: ['', [Validators.required,Validators.pattern(/^\d{6}$/)]],
    centroPobladoId: [0], referencia: [''],
  });

  ngOnInit(): void {
    if (!this.uot.selectedId()) {
      this.error.set('Seleccione primero su UOT.');
      return;
    }
    const initialSearch = this.route.snapshot.queryParamMap.get('buscar')?.trim();
    if (initialSearch) {
      this.busqueda = initialSearch;
      this.buscar();
    }
  }
  buscar(): void {
    const id = this.uot.selectedId();
    if (!id || this.busqueda.trim().length < 3) return;
    this.buscando.set(true);
    this.busquedaRealizada.set(false);
    this.error.set(null);
    this.caso.buscarPersonas(id, this.busqueda.trim())
      .pipe(finalize(() => this.buscando.set(false)))
      .subscribe({ next: people => {
        this.encontrados.set(people);
        this.busquedaRealizada.set(true);
        const exact = people.find(person => person.numeroDocumento === this.busqueda.trim());
        if (exact) this.seleccionar(exact);
      }, error: e => this.error.set(mapOpenApiError(e).message) });
  }
  seleccionar(p: PersonaE1): void {
    this.seleccionado.set(p);
    this.encontrados.set([]);
    this.predios.set([]);
    this.buscarPredios();
  }
  cambiarPersona(): void {
    this.seleccionado.set(null);
    this.predios.set([]);
    this.busquedaRealizada.set(false);
  }
  buscarPredios(): void {
    const uot = this.uot.selectedId();
    const persona = this.seleccionado();
    if (!uot || !persona) return;
    this.caso.buscarPredios(uot, persona.numeroDocumento, this.convenioId).subscribe({
      next: d => this.predios.set(d.filter(p => !this.nombre.trim() || p.nombre.toLowerCase().includes(this.nombre.toLowerCase()))),
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }
  onPersonDocumentChange(): void {
    const type = this.personForm.controls.tipoDocumento.value;
    const control = this.personForm.controls.numeroDocumento;
    control.setValue(sanitizeDocument(type,control.value),{emitEvent:false});
    control.setValidators(type === 'DNI' ? [Validators.required,dniValidator] :
      [Validators.required,Validators.pattern(type === 'CE' ? /^[A-Z0-9]{9,12}$/ : /^[A-Z0-9]{6,20}$/)]);
    control.updateValueAndValidity();
  }
  onPersonNumberChange(): void {
    const control = this.personForm.controls.numeroDocumento;
    control.setValue(sanitizeDocument(this.personForm.controls.tipoDocumento.value,control.value),{emitEvent:false});
  }
  onPersonNameChange(field: 'nombres'|'apellidoPaterno'|'apellidoMaterno'): void {
    const control = this.personForm.controls[field];
    control.setValue(sanitizePersonName(control.value),{emitEvent:false});
  }
  onPersonPhoneChange(): void {
    const control=this.personForm.controls.telefono;
    control.setValue(sanitizePhone(control.value),{emitEvent:false});
  }
  onPersonDistrictChange(v: GeographySelection): void {
    this.personForm.patchValue({distritoCodigo:v.districtCode,centroPobladoId:v.populationCenterId??0});
  }
  personDocumentLength(): number {
    return this.personForm.controls.tipoDocumento.value === 'DNI' ? 8 :
      this.personForm.controls.tipoDocumento.value === 'CE' ? 12 : 20;
  }
  registrarPersona(): void {
    const id = this.uot.selectedId();
    this.personForm.markAllAsTouched();
    if (!id || this.guardando() || this.personForm.invalid) return;
    const p=this.personForm.getRawValue();
    this.guardando.set(true);
    this.error.set(null);
    this.caso.crearPersona(id, {
      tipoDocumento:p.tipoDocumento, numeroDocumento:sanitizeDocument(p.tipoDocumento,p.numeroDocumento),
      nombres:normalizeText(p.nombres), apellidoPaterno:normalizeText(p.apellidoPaterno),
      apellidoMaterno:normalizeText(p.apellidoMaterno)||undefined,
      fechaNacimiento:p.fechaNacimiento||undefined,telefono:sanitizePhone(p.telefono)||undefined,
      correo:p.correo.trim()||undefined,distritoCodigo:p.distritoCodigo,
      centroPobladoId:p.centroPobladoId>0?p.centroPobladoId:undefined,
      referencia:normalizeText(p.referencia)||undefined,
    }).pipe(finalize(() => this.guardando.set(false)))
      .subscribe({ next: personaId => this.seleccionar({ personaId, tipoDocumento:p.tipoDocumento,
        numeroDocumento:p.numeroDocumento,nombreCompleto:`${p.nombres} ${p.apellidoPaterno}` }),
        error: e => this.error.set(mapOpenApiError(e).message),
      });
  }
  ubicacion(v: GeographySelection): void { this.distrito = v.districtCode; }
  punto(v: {latitude:number;longitude:number}): void { this.latitud=v.latitude; this.longitud=v.longitude; }
  predioCompleto(): boolean {
    const t=this.areaTotalHa, c=this.areaCultivableHa;
    return !!this.nombre.trim() && /^\d{6}$/.test(this.distrito) && t!==null && c!==null &&
      Number.isFinite(t) && Number.isFinite(c) && t>=0.0001 && t<=999999.9999 && c>=0 && c<=t &&
      Math.abs(t*10000-Math.round(t*10000))<0.00001 && Math.abs(c*10000-Math.round(c*10000))<0.00001 &&
      this.tipoRiego.trim().length>0 && this.tipoRiego.trim().length<=30 &&
      this.latitud!==undefined && this.longitud!==undefined &&
      Number.isFinite(this.latitud) && Number.isFinite(this.longitud);
  }
  crear(): void {
    const id = this.uot.selectedId(), persona = this.seleccionado();
    if (!id || !persona || this.guardando()) return;
    if (!this.predioCompleto()) { this.error.set('Complete la ubicación, las superficies y el tipo de riego.'); return; }
    if ((this.latitud === undefined) !== (this.longitud === undefined)) {
      this.error.set('Las coordenadas deben introducirse juntas.'); return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.caso.altaPredio(id, { personaId: persona.personaId, nombre: this.nombre.trim(),
      distritoCodigo: this.distrito, referencia: this.referencia.trim() || undefined,
      latitud: this.latitud, longitud: this.longitud,
      areaTotalHa: this.areaTotalHa!, areaCultivableHa: this.areaCultivableHa!,
      tipoRiego: this.tipoRiego.trim() }, this.convenioId)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({ next: predioId => {
          this.toast.success('Expediente registrado o reutilizado');
          void this.router.navigate(['/gestion-tecnica/predios', predioId, 'expediente'], { queryParams: this.convenioId ? { convenioId: this.convenioId } : undefined });
        }, error: e => this.error.set(registroPredioError(e)),
      });
  }
}
