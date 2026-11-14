import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, map } from 'rxjs';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';
import { PageHeaderComponent } from '../../../../../shared/layout/page-header/page-header';
import { ToastService } from '../../../../../shared/feedback/toast-center/toast.service';
import { GeographyCascadeComponent, GeographySelection } from '../../../../../shared/forms/geography-cascade/geography-cascade';
import { EntityRegistrationModalComponent, EntityDraft, EntityLookupData } from '../../../../../shared/forms/person-registration/entity-registration-modal';
import { UotContextStore } from '../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { registroPredioError } from '../../../../../shared/feedback/expediente-error/registro-predio-error';
import { PredioMapComponent } from '../../adapter/in/ui/components/predio-map/predio-map';
import { ExpedienteE1UseCase } from '../application/expediente-e1.use-case';
import { PersonaE1, PredioE1 } from '../domain/expediente-e1.model';

@Component({
  selector: 'app-predio-alta-rapida', standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, GeographyCascadeComponent, PredioMapComponent, EntityRegistrationModalComponent],
  templateUrl: './alta-rapida.html', styleUrl: './expediente-e1.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredioAltaRapidaPage implements OnInit {
  @ViewChild(EntityRegistrationModalComponent) private entityModal!: EntityRegistrationModalComponent;
  private readonly caso = inject(ExpedienteE1UseCase);
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
  /** La persona se crea/recupera con el modal único; el fundo sigue su proceso independiente. */
  async registrarPersona():Promise<void> {
    const uot=this.uot.selectedId();
    if (!uot || this.guardando()) return;
    const lookup={person:null as PersonaE1|null};
    const result=await this.entityModal.open({
      eyebrow:'Gestión técnica', title:'Registrar persona',saveLabel:'Guardar persona',
      documents:this.documentTypes,
      startDocument:/^\d{8}$/.test(this.busqueda.trim())
        ? {type:'DNI',number:this.busqueda.trim()} : undefined,
      requireDistrictForManual:true,
      lookupLocal:(type,document)=>this.caso.buscarPersonas(uot,document).pipe(map(people=>{
        lookup.person=people.find(p=>p.tipoDocumento===type && p.numeroDocumento===document)??null;
        const person=lookup.person;
        return person ? ({roleId:person.personaId,entityId:person.personaId,
          data:{tipoDocumento:person.tipoDocumento,numeroDocumento:person.numeroDocumento}
        } satisfies EntityLookupData) : null;
      })),
      save:(data:EntityDraft)=>this.caso.crearPersona(uot,{
        tipoDocumento:data.tipoDocumento, numeroDocumento:data.numeroDocumento,
        nombres:data.nombres,apellidoPaterno:data.apellidoPaterno,
        apellidoMaterno:data.apellidoMaterno||undefined,
        fechaNacimiento:data.fechaNacimiento||undefined,
        telefono:data.telefono||undefined,correo:data.correo||undefined,
        distritoCodigo:data.distritoCodigo,
        centroPobladoId:data.centroPobladoId||undefined,
        referencia:data.referencia||undefined,
      }),
    });
    if (!result?.data || result.id<=0) return;
    const p=result.data;
    this.seleccionar({personaId:result.id,tipoDocumento:p.tipoDocumento,
      numeroDocumento:p.numeroDocumento,
      nombreCompleto:lookup.person?.personaId===result.id?lookup.person.nombreCompleto:
        [p.nombres,p.apellidoPaterno,p.apellidoMaterno].filter(Boolean).join(' ').trim()});
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
