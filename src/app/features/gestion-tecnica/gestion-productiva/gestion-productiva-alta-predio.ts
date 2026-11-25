import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faUserPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable, map, of, throwError } from 'rxjs';
import { ReferenceDataService } from '../../../core/reference-data/reference-data.service';
import { ReferenceItem } from '../../../core/reference-data/reference-data.model';
import { normalizeText } from '../../../shared/forms/validators/desco-input.validators';
import { UotContextStore } from '../../uot/state/uot-context.store';
import { GeographyCascadeComponent, GeographySelection } from '../../../shared/forms/geography-cascade/geography-cascade';
import { PersonRegistrationModalComponent } from '../../../shared/forms/person-registration/person-registration-modal';
import { PersonOwnerChoice, PersonOwnerInput } from '../../../shared/forms/person-registration/person-owner-picker';
import { PredioMapComponent } from '../predios/adapter/in/ui/components/predio-map/predio-map';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { registroPredioError } from '../../../shared/feedback/expediente-error/registro-predio-error';
import { ExpedienteE1UseCase } from '../predios/expediente/application/expediente-e1.use-case';
import { PersonaE1, PredioE1 } from '../predios/expediente/domain/expediente-e1.model';
import { AdminModalResult } from '../../administracion/shared/admin-modal.types';

/** Registro tradicional de fundo: persona de org.Persona, sin afiliación de convenio. */
@Component({
  selector: 'app-gestion-productiva-alta-predio', standalone: true,
  imports: [DecimalPipe, FormsModule, FaIconComponent, GeographyCascadeComponent, PredioMapComponent, PersonRegistrationModalComponent],
  templateUrl: './gestion-productiva-alta-predio.html',
  styleUrls: ['./gestion-productiva.css', './gestion-productiva-alta-predio.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionProductivaAltaPredio {
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(PersonRegistrationModalComponent) private personModal!: PersonRegistrationModalComponent;
  private readonly caso = inject(ExpedienteE1UseCase);
  private readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);
  private readonly catalogos = inject(ReferenceDataService);
  private resolver: ((result: AdminModalResult) => void) | null = null;
  private personSwitching = false;
  private opening = false;
  private busquedaFundosId = 0;

  readonly addIcon = faUserPlus;
  readonly saveIcon = faFloppyDisk;
  readonly closeIcon = faXmark;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly prediosExistentes = signal<PredioE1[]>([]);
  readonly buscandoPredios = signal(false);
  readonly selected = signal<PersonaE1 | null>(null);
  readonly tiposTitularidad = signal<readonly ReferenceItem[]>([]);
  readonly tiposLoading = signal(false);
  readonly adicionales = signal<{ persona: PersonaE1; tipoTitularidad: string; porcentaje: number }[]>([]);
  readonly anadirTitular = signal(false);
  readonly personaAdicional = signal<PersonaE1 | null>(null);
  adicionalTipo = 'COPROPIETARIO';
  adicionalPorcentaje = 50;
  titularidadPrincipal = 'PROPIETARIO';
  altitudM: number | null = null;
  detalle = '';

  nombre = '';
  areaTotalHa: number | null = null;
  referencia = '';
  distrito = '';
  centroPobladoId: number | null = null;
  latitude: number | undefined;
  longitude: number | undefined;

  /** Primero usa el modal compartido; solo después solicita los datos del fundo. */
  async open(personaInicial?: PersonOwnerChoice): Promise<AdminModalResult> {
    if (this.resolver || this.personSwitching || this.opening) return { saved: false, value: null };
    this.opening = true;
    this.busquedaFundosId++;
    this.nombre = ''; this.referencia = ''; this.distrito = '';
    this.altitudM = null; this.detalle = '';
    this.titularidadPrincipal = 'PROPIETARIO'; this.adicionalTipo = 'COPROPIETARIO';
    this.adicionalPorcentaje = 50; this.adicionales.set([]); this.anadirTitular.set(false);
    this.personaAdicional.set(null);
    this.areaTotalHa = null;
    this.centroPobladoId = null; this.latitude = undefined; this.longitude = undefined;
    this.saving.set(false); this.prediosExistentes.set([]); this.selected.set(null);
    this.buscandoPredios.set(false); this.error.set(null);

    if (!this.uot.selectedId()) { this.opening = false; return { saved: false, value: null }; }
    let person: PersonOwnerChoice | null;
    try {
      // En el expediente del productor se utiliza la persona ya seleccionada.
      // La apertura directa conserva el flujo histórico de identificación.
      person = personaInicial ?? await this.personModal.open('DNI', '', 'lookup');
    } catch {
      this.error.set('No se pudo abrir el registro de persona.');
      return { saved: false, value: null };
    } finally {
      this.opening = false;
    }
    if (!person) return { saved: false, value: null };
    this.loadTiposTitularidad();
    this.select(person);
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

  seleccionarAdicional(persona: PersonaE1): void {
    if (this.selected()?.personaId === persona.personaId || this.adicionales().some(x => x.persona.personaId === persona.personaId)) {
      this.error.set('La persona ya está registrada como titular.'); return;
    }
    this.personaAdicional.set(persona); this.error.set(null);
  }
  agregarAdicional(): void {
    const persona = this.personaAdicional();
    const porcentaje = Number(this.adicionalPorcentaje);
    if (!persona || !this.tiposTitularidad().some(x => x.code === this.adicionalTipo)) {
      this.error.set('Seleccione la persona y el tipo de titularidad.'); return;
    }
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 ||
        Math.abs(porcentaje * 100 - Math.round(porcentaje * 100)) > 0.000001 ||
        porcentaje >= this.restanteTitularidad()) {
      this.error.set('Revise el porcentaje de titularidad.'); return;
    }
    if (this.selected()?.personaId === persona.personaId || this.adicionales().some(x => x.persona.personaId === persona.personaId)) {
      this.error.set('La persona ya está registrada como titular.'); return;
    }
    this.adicionales.update(items => [...items, { persona, tipoTitularidad: this.adicionalTipo, porcentaje }]);
    this.personaAdicional.set(null); this.anadirTitular.set(false);
    this.error.set(null);
  }
  quitarAdicional(id: number): void {
    this.adicionales.update(items => items.filter(x => x.persona.personaId !== id));
  }

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

  async openPersonaModal(target: 'principal' | 'adicional'): Promise<void> {
    if (this.personSwitching || this.saving()) return;
    const dialog = this.dialog.nativeElement;
    if (!dialog.open) return;
    this.personSwitching = true;
    const scroll = dialog.querySelector<HTMLElement>('.gp-fundo-scroll');
    const previousScroll = scroll?.scrollTop ?? 0;
    dialog.classList.add('gp-fundo-switching-out');
    await new Promise<void>(resolve => setTimeout(resolve, 140));
    dialog.classList.remove('gp-fundo-switching-out');
    dialog.close();
    try {
      const person = await this.personModal.open('DNI', '', 'lookup');
      if (person) {
        if (target === 'principal') {
          this.adicionales.set([]);
          this.personaAdicional.set(null);
          this.anadirTitular.set(false);
          this.select(person);
        } else {
          this.seleccionarAdicional(person);
          if (this.personaAdicional()) this.anadirTitular.set(true);
        }
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
    if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
    this.resolver?.({ saved, value: null });
    this.resolver = null;
  }

  select(persona: PersonOwnerChoice): void {
    ++this.busquedaFundosId;
    this.selected.set(persona);
    this.prediosExistentes.set([]);
    this.buscandoPredios.set(false);
    this.error.set(null);
    this.buscarFundos();
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
    const t = this.areaTotalHa;
    return t !== null && Number.isFinite(t) && t >= 0.0001 && t <= 999999.9999 &&
      Math.abs(t * 10000 - Math.round(t * 10000)) < 0.00001;
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
      this.superficieValida() && this.gpsValido() && !this.saving() && !this.buscandoPredios() &&
      (this.altitudM === null || Number.isFinite(this.altitudM) && this.altitudM >= -500 && this.altitudM <= 7000) &&
      this.detalle.length <= 500;
  }

  save(): void {
    const uot = this.uot.selectedId(), persona = this.selected();
    if (!uot || !persona || this.saving()) return;
    if (!this.puedeGuardar()) {
      this.error.set('Complete el nombre, superficie total y ubicación del fundo.');
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
      areaTotalHa: this.areaTotalHa!,
      altitudM: this.altitudM ?? undefined,
      observacion: normalizeText(this.detalle) || undefined,
      tipoTitularidadPrincipal: this.titularidadPrincipal,
      titularesAdicionales: this.adicionales().map(x=>({personaId:x.persona.personaId,
        tipoTitularidad:x.tipoTitularidad,porcentaje:x.porcentaje})),
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Fundo registrado'); this.close(true); },
      error: e => this.error.set(registroPredioError(e)),
    });
  }
}
