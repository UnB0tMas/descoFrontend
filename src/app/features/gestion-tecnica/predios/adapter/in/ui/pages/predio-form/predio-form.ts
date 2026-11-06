import { DecimalPipe } from '@angular/common';
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
  faFloppyDisk,
  faPen,
  faPlus,
  faTrashCan,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable, of, throwError, map } from 'rxjs';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { ReferenceItem } from '../../../../../../../../core/reference-data/reference-data.model';
import { UotContextStore } from '../../../../../../../../features/uot/state/uot-context.store';
import { ExpedienteE1UseCase } from '../../../../../expediente/application/expediente-e1.use-case';
import { PersonaE1 } from '../../../../../expediente/domain/expediente-e1.model';
import { provideExpedienteE1 } from '../../../../../expediente/expediente-e1.providers';
import { PersonLookupComponent } from '../../../../../../../../shared/forms/person-registration/person-lookup';
import { PersonRegistrationModalComponent } from '../../../../../../../../shared/forms/person-registration/person-registration-modal';
import { PersonOwnerChoice, PersonOwnerInput } from '../../../../../../../../shared/forms/person-registration/person-owner-picker';
import { sanitizeDocument } from '../../../../../../../../shared/forms/validators/desco-input.validators';

import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import {
  GeographyCascadeComponent,
  GeographySelection,
} from '../../../../../../../../shared/forms/geography-cascade/geography-cascade';
import {
  dateOrderValidator,
  decimalPrecisionValidator,
  normalizeOptionalText,
  normalizeText,
  notBlankValidator,
  notFutureDateValidator,
  optionalNotBlankValidator,
  todayLocalIsoDate,
} from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearPredioUseCase } from '../../../../../application/use-case/crear-predio.use-case';
import { EditarPredioUseCase } from '../../../../../application/use-case/editar-predio.use-case';
import { PredioDetalle } from '../../../../../domain/predio-detalle.model';
import {
  PredioCaracteristicas,
  PredioUbicacion,
  PredioUpdate,
} from '../../../../../domain/predio.model';
import {
  TipoTitularidad,
  TitularidadInput,
} from '../../../../../domain/titularidad.model';
import { PredioMapComponent } from '../../components/predio-map/predio-map';

@Component({
  selector: 'app-predio-form',
  standalone: true,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    FaIconComponent,
    FormErrorComponent,
    GeographyCascadeComponent,
    PredioMapComponent,
    PersonLookupComponent,
    PersonRegistrationModalComponent,
  ],
  providers: [...provideExpedienteE1()],
  templateUrl: './predio-form.html',
  styleUrl: './predio-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredioFormComponent {
  @ViewChild('dialog', { static: true })
  private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(PersonRegistrationModalComponent) private personModal!: PersonRegistrationModalComponent;

  private readonly fb = inject(FormBuilder);
  private readonly create = inject(CrearPredioUseCase);
  private readonly update = inject(EditarPredioUseCase);
  private readonly catalogos = inject(ReferenceDataService);
  private readonly expediente = inject(ExpedienteE1UseCase);
  private readonly uot = inject(UotContextStore);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly referencesLoading = signal(false);
  readonly current = signal<PredioDetalle | null>(null);
  readonly error = signal<string | null>(null);
  readonly ownershipTypes = signal<readonly ReferenceItem[]>([]);
  readonly ownerPerson = signal<PersonaE1 | null>(null);
  readonly persons = signal<PersonaE1[]>([]);
  readonly personLoading = signal(false);
  readonly documentTypes = [{value:'DNI',label:'DNI'},{value:'CE',label:'Carné de extranjería'},{value:'PASAPORTE',label:'Pasaporte'}];
  readonly personLabels = new Map<number,string>();
  personDocumentType: 'DNI'|'CE'|'PASAPORTE'='DNI';
  personDocument = '';
  readonly owners = signal<readonly TitularidadInput[]>([]);
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly initialDistrictCode = signal('');
  readonly initialPopulationCenterId = signal<number | null>(null);

  private resolver: ((result: AdminModalResult) => void) | null = null;
  private personSwitching = false;

  readonly closeIcon = faXmark;
  readonly saveIcon = faFloppyDisk;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly deleteIcon = faTrashCan;

  readonly today = todayLocalIsoDate();

  readonly form = this.fb.nonNullable.group(
    {
      nombre: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(150),
        ],
      ],
      fechaRegistro: [
        '',
        [Validators.required, notFutureDateValidator],
      ],
      distritoCodigo: [
        '',
        [Validators.required, Validators.pattern(/^\d{6}$/)],
      ],
      centroPobladoId: [0, [Validators.min(0)]],
      referencia: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(300)],
      ],
      altitudM: [
        0,
        [
          Validators.min(-500),
          Validators.max(7000),
          decimalPrecisionValidator(6, 2),
        ],
      ],
      areaTotalHa: [
        0,
        [
          Validators.required,
          Validators.min(0.0001),
          Validators.max(999999.9999),
          decimalPrecisionValidator(6, 4),
        ],
      ],
      areaCultivableHa: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(999999.9999),
          decimalPrecisionValidator(6, 4),
        ],
      ],
      tipoRiego: [
        '',
        [
          Validators.required,
          notBlankValidator,
          Validators.maxLength(30),
        ],
      ],
      fuenteAgua: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(150)],
      ],
      infraestructura: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(300)],
      ],
      observacion: [
        '',
        [optionalNotBlankValidator, Validators.maxLength(500)],
      ],
      fechaDesde: [
        '',
        [Validators.required, notFutureDateValidator],
      ],
      ownerPersonaId: [0, [Validators.min(0)]],
      ownerTipo: ['PROPIETARIO' as TipoTitularidad],
      ownerPorcentaje: [
        100,
        [
          Validators.min(0.01),
          Validators.max(100),
          decimalPrecisionValidator(3, 2),
        ],
      ],
    },
    {
      validators: [
        dateOrderValidator(
          'fechaRegistro',
          'fechaDesde',
          'characteristicsBeforeRegistration',
        ),
      ],
    },
  );

  open(detail: PredioDetalle | null = null): Promise<AdminModalResult> {
    this.current.set(detail);
    this.error.set(null);
    this.ownershipTypes.set([]);
    this.personLabels.clear(); this.ownerPerson.set(null); this.persons.set([]);
    this.personLoading.set(false);
    this.personDocumentType='DNI'; this.personDocument='';
    this.owners.set(
      detail?.titulares
        .filter((item) => item.estado && !!(item.personaId ?? item.socioId))
        .sort((a,b) => (a.rolTitularidad === 'PRINCIPAL' ? -1 : 1) - (b.rolTitularidad === 'PRINCIPAL' ? -1 : 1))
        .map((item) => ({
          personaId: (item.personaId ?? item.socioId)!,
          socioId: item.socioId ?? undefined,
          tipoTitularidad: item.tipoTitularidad,
          porcentaje: item.porcentaje,
        })) ?? [],
    );
    detail?.titulares.filter(x=>x.estado).forEach(x=> {
      const id=x.personaId??x.socioId;
      if (id) this.personLabels.set(id,[x.nombres,x.apellidoPaterno,x.apellidoMaterno].filter(Boolean).join(' ').trim() || x.numeroDocumento);
    });
    this.latitude.set(detail?.latitud ?? null);
    this.longitude.set(detail?.longitud ?? null);
    this.initialDistrictCode.set(detail?.distritoCodigo ?? '');
    this.initialPopulationCenterId.set(detail?.centroPobladoId ?? null);

    const today = this.today;
    this.form.reset({
      nombre: detail?.nombre ?? '',
      fechaRegistro: detail?.fechaRegistro?.slice(0, 10) ?? today,
      distritoCodigo: detail?.distritoCodigo ?? '',
      centroPobladoId: detail?.centroPobladoId ?? 0,
      referencia: detail?.referencia ?? '',
      altitudM: detail?.altitudM ?? 0,
      areaTotalHa: detail?.areaTotalHa ?? 0,
      areaCultivableHa: detail?.areaCultivableHa ?? 0,
      tipoRiego: detail?.tipoRiego ?? '',
      fuenteAgua: detail?.fuenteAgua ?? '',
      infraestructura: detail?.infraestructura ?? '',
      observacion: detail?.observacion ?? '',
      fechaDesde: detail?.fechaDesde?.slice(0, 10) ?? today,
      ownerPersonaId: 0,
      ownerTipo: 'PROPIETARIO',
      ownerPorcentaje: 100,
    });

    this.form.controls.fechaRegistro[
      detail ? 'disable' : 'enable'
    ]({ emitEvent: false });

    this.loadOwnershipTypes();
    this.dialog.nativeElement.showModal();

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  close(): void {
    if (!this.saving()) {
      this.finish({ saved: false, value: null });
    }
  }

  setGeography(selection: GeographySelection): void {
    this.form.patchValue({
      distritoCodigo: selection.districtCode,
      centroPobladoId: selection.populationCenterId ?? 0,
    });
    this.form.controls.distritoCodigo.markAsTouched();
  }

  setLocation(point: { latitude: number; longitude: number }): void {
    this.latitude.set(point.latitude);
    this.longitude.set(point.longitude);
  }

  private loadOwnershipTypes():void {
    this.referencesLoading.set(true);
    this.catalogos.catalog('TIPO_TITULARIDAD',true).pipe(finalize(()=>this.referencesLoading.set(false))).subscribe({
      next:items=>{
        this.ownershipTypes.set(items.filter(x=>!!x.code));
        if (!items.some(x=>x.code===this.form.controls.ownerTipo.value))
          this.form.controls.ownerTipo.setValue(items[0]?.code ?? '');
      },
      error:()=>this.error.set('No se pudieron cargar los tipos de titularidad.'),
    });
  }
  personMaxLength():number { return this.personDocumentType==='DNI' ? 8 : this.personDocumentType==='CE' ? 12 : 20; }
  canSearchPerson():boolean { return !!this.uot.selectedId() && !this.personLoading() && !this.saving()
    && (this.personDocumentType==='DNI' ? /^\d{8}$/.test(this.personDocument) : this.personDocument.trim().length>=6); }
  changePersonType(type:string):void {
    if (type==='DNI'||type==='CE'||type==='PASAPORTE') this.personDocumentType=type;
    this.personDocument=''; this.ownerPerson.set(null); this.persons.set([]);
  }
  changePersonNumber(value:string):void {
    this.personDocument=sanitizeDocument(this.personDocumentType,value);this.ownerPerson.set(null);this.persons.set([]);
  }
  searchPerson():void {
    const uot=this.uot.selectedId(); if (!uot||!this.canSearchPerson()) return;
    const query=this.personDocument;
    const type=this.personDocumentType;
    this.personLoading.set(true);this.persons.set([]);this.error.set(null);
    this.expediente.buscarPersonas(uot,query).pipe(finalize(()=>this.personLoading.set(false))).subscribe({
      next:people=> {
        const matches=people.filter(x=>x.tipoDocumento===type && x.numeroDocumento===query);
        this.persons.set(matches);
        if (!matches.length) this.error.set('Persona no encontrada. Puede registrarla.');
      },
      error:()=>this.error.set('No se pudo buscar a la persona.'),
    });
  }
  selectPerson(person:PersonaE1):void {
    this.persons.set([]);this.ownerPerson.set(person);
    this.form.controls.ownerPersonaId.setValue(person.personaId);
    this.personLabels.set(person.personaId,person.nombreCompleto);
    this.error.set(null);
  }
  readonly findPersonForModal = (type: string, document: string): Observable<readonly PersonOwnerChoice[]> => {
    const uot = this.uot.selectedId();
    return uot ? this.expediente.buscarPersonas(uot, document).pipe(
      // Se respeta el tipo y documento exactos. No se consultan listados de socios.
      map(people => people.filter(p => p.tipoDocumento === type && p.numeroDocumento === document))
    ) : of([]);
  };

  readonly savePersonForModal = (data: PersonOwnerInput): Observable<number> => {
    const uot = this.uot.selectedId();
    return uot ? this.expediente.crearPersona(uot, data) : throwError(() => new Error('Seleccione el ámbito.'));
  };

  manualPerson(): void { void this.openPersonModal(); }

  private async openPersonModal(): Promise<void> {
    if (this.personSwitching || this.personLoading() || this.saving()) return;
    this.personSwitching = true;
    const modal = this.dialog.nativeElement;
    const body = modal.querySelector<HTMLElement>('.desco-fixed-form-body');
    const previousScroll = body?.scrollTop ?? 0;
    modal.classList.add('predio-switching-out');
    await new Promise<void>(resolve => setTimeout(resolve, 140));
    modal.classList.remove('predio-switching-out');
    modal.close();
    try {
      const person = await this.personModal.open(this.personDocumentType, this.personDocument, 'manual');
      if (person) this.selectPerson(person as PersonaE1);
    } catch {
      this.error.set('No se pudo abrir el registro de persona.');
    } finally {
      modal.showModal();
      if (body) body.scrollTop = previousScroll;
      this.personSwitching = false;
    }
  }

  addOwner(): void {
    const value=this.form.getRawValue();
    const id=this.ownerPerson()?.personaId ?? Number(value.ownerPersonaId);
    const percentage=Number(value.ownerPorcentaje);
    if (!id || !this.ownerPerson()) { this.error.set('Busque o registre a la persona.');return; }
    if (!this.ownershipTypes().some(x=>x.code===value.ownerTipo)) { this.error.set('Seleccione el tipo de titularidad.');return; }
    if (!Number.isFinite(percentage)||percentage<=0||percentage>100||
        Math.abs(percentage*100-Math.round(percentage*100))>0.000001) {
      this.error.set('Revise el porcentaje.');return;
    }
    if (this.owners().some(x=>x.personaId===id)) { this.error.set('La persona ya es titular.');return; }
    let existing=[...this.owners()];
    // Al añadir el primer cotitular se ajusta el 100 % inicial del principal.
    if (existing.length===1 && Number(existing[0].porcentaje)===100 && percentage<100)
      existing=[{...existing[0],porcentaje:Math.round((100-percentage)*100)/100}];
    if (existing.reduce((sum,x)=>sum+Number(x.porcentaje),0)+percentage>100.000001) {
      this.error.set('La suma no puede superar el 100 %.');return;
    }
    this.owners.set([...existing,{personaId:id,tipoTitularidad:value.ownerTipo,porcentaje:percentage}]);
    this.ownerPerson.set(null);this.form.controls.ownerPersonaId.setValue(0);
    this.personDocument='';this.persons.set([]);
    this.form.controls.ownerPorcentaje.setValue(Math.max(.01,Math.round((100-this.totalOwnership())*100)/100));
    this.error.set(null);
  }
  removeOwner(index:number):void {
    this.owners.set(this.owners().filter((_,i)=>i!==index));
    this.error.set(null);
  }
  updateOwnerPercentage(index:number,value:string):void {
    const percent=Number(value);
    if (!Number.isFinite(percent)||percent<=0||percent>100||
      Math.abs(percent*100-Math.round(percent*100))>0.000001) {
      this.error.set('Revise el porcentaje.');return;
    }
    const items=[...this.owners()];items[index]={...items[index],porcentaje:percent};
    if (items.reduce((sum,x)=>sum+Number(x.porcentaje),0)>100.000001) {
      this.error.set('La suma no puede superar el 100 %.');return;
    }
    this.owners.set(items);this.error.set(null);
  }
  totalOwnership():number { return this.owners().reduce((sum,x)=>sum+Number(x.porcentaje),0); }
  personLabel(id:number):string { return this.personLabels.get(id)??'Persona registrada'; }

  save(): void {
    this.form.updateValueAndValidity({ emitEvent: false });
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();

    if (this.form.invalid || this.saving() || this.personLoading()) {
      this.error.set('Revise los campos obligatorios.');
      return;
    }

    if (Number(value.areaCultivableHa) > Number(value.areaTotalHa)) {
      this.error.set('El área cultivable no puede superar el área total.');
      return;
    }

    if (this.owners().length === 0) {
      this.error.set('Agregue al menos un titular.');
      return;
    }

    if (this.totalOwnership() > 100.0001) {
      this.error.set('La suma de porcentajes no puede superar el 100 %.');
      return;
    }

    const lat = this.latitude();
    const lon = this.longitude();

    if (
      (lat === null) !== (lon === null)
      || (lat !== null && (lat < -90 || lat > 90))
      || (lon !== null && (lon < -180 || lon > 180))
    ) {
      this.error.set('La ubicación geográfica no es válida.');
      return;
    }

    const location: PredioUbicacion = {
      distritoCodigo: value.distritoCodigo.trim(),
      centroPobladoId:
        Number(value.centroPobladoId) > 0
          ? Number(value.centroPobladoId)
          : undefined,
      referencia: normalizeOptionalText(value.referencia),
      latitud: lat ?? undefined,
      longitud: lon ?? undefined,
      altitudM: Number(value.altitudM) || undefined,
    };

    const characteristics: PredioCaracteristicas = {
      areaTotalHa: Number(value.areaTotalHa),
      areaCultivableHa: Number(value.areaCultivableHa),
      tipoRiego: normalizeText(value.tipoRiego).toUpperCase(),
      fuenteAgua: normalizeOptionalText(value.fuenteAgua),
      infraestructura: normalizeOptionalText(value.infraestructura),
      observacion: normalizeOptionalText(value.observacion),
      fechaDesde: value.fechaDesde,
    };

    const name = normalizeText(value.nombre);
    const current = this.current();

    this.saving.set(true);
    this.error.set(null);

    const operation: Observable<unknown> = current
      ? this.update.execute(
          current.predioId,
          this.buildUpdate(current, name, location, characteristics),
        )
      : this.create.execute({
          nombre: name,
          fechaRegistro: value.fechaRegistro,
          ubicacion: location,
          caracteristicas: characteristics,
          titulares: this.owners(),
        });

    operation
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            current ? 'Predio actualizado' : 'Predio registrado',
          );
          this.finish({ saved: true, value: null });
        },
        error: (requestError) => {
          const message = mapOpenApiError(requestError).message
            || 'No se pudo completar la operación.';
          this.error.set(message);
          this.toast.error(
            current
              ? 'No se pudo actualizar el predio'
              : 'No se pudo registrar el predio',
            message,
          );
        },
      });
  }

  private buildUpdate(
    current: PredioDetalle,
    nombre: string,
    ubicacion: PredioUbicacion,
    caracteristicas: PredioCaracteristicas,
  ): PredioUpdate {
    const ownersChanged = this.ownersChanged(current);

    return {
      nombre,
      ubicacion: this.locationChanged(current, ubicacion)
        ? ubicacion
        : undefined,
      caracteristicas: this.characteristicsChanged(current, caracteristicas)
        ? caracteristicas
        : undefined,
      titulares: ownersChanged ? this.owners() : undefined,
      fechaTitularidad: ownersChanged ? this.today : undefined,
    };
  }

  private locationChanged(
    current: PredioDetalle,
    next: PredioUbicacion,
  ): boolean {
    return current.distritoCodigo !== next.distritoCodigo
      || (current.centroPobladoId ?? undefined) !== next.centroPobladoId
      || this.text(current.referencia) !== this.text(next.referencia)
      || this.number(current.latitud) !== this.number(next.latitud)
      || this.number(current.longitud) !== this.number(next.longitud)
      || this.number(current.altitudM) !== this.number(next.altitudM);
  }

  private characteristicsChanged(
    current: PredioDetalle,
    next: PredioCaracteristicas,
  ): boolean {
    return this.number(current.areaTotalHa) !== this.number(next.areaTotalHa)
      || this.number(current.areaCultivableHa) !== this.number(next.areaCultivableHa)
      || this.text(current.tipoRiego).toUpperCase() !== this.text(next.tipoRiego).toUpperCase()
      || this.text(current.fuenteAgua) !== this.text(next.fuenteAgua)
      || this.text(current.infraestructura) !== this.text(next.infraestructura)
      || this.text(current.observacion) !== this.text(next.observacion)
      || (current.fechaDesde?.slice(0, 10) ?? '') !== next.fechaDesde;
  }

  private ownersChanged(current: PredioDetalle): boolean {
    const previous = current.titulares
      .filter((item) => item.estado)
      .map((item) => ({
        personaId: (item.personaId ?? item.socioId)!,
        tipoTitularidad: item.tipoTitularidad as TipoTitularidad,
        porcentaje: Number(item.porcentaje),
      }))
      .sort((a, b) => a.personaId - b.personaId);

    const next = [...this.owners()]
      .map((item) => ({
        personaId: (item.personaId ?? item.socioId)!,
        tipoTitularidad: item.tipoTitularidad,
        porcentaje: Number(item.porcentaje),
      }))
      .sort((a, b) => a.personaId - b.personaId);

    if (previous.length !== next.length) {
      return true;
    }

    return previous.some((item, index) => {
      const candidate = next[index];
      return item.personaId !== candidate.personaId
        || item.tipoTitularidad !== candidate.tipoTitularidad
        || Math.abs(item.porcentaje - candidate.porcentaje) > 0.0001;
    });
  }

  private text(value: string | null | undefined): string {
    return value?.trim() ?? '';
  }

  private number(value: number | null | undefined): number | null {
    return value === null || value === undefined
      ? null
      : Number(value);
  }

  private finish(result: AdminModalResult): void {
    if (this.dialog.nativeElement.open) {
      this.dialog.nativeElement.close();
    }

    this.resolver?.(result);
    this.resolver = null;
    this.current.set(null);
    this.error.set(null);
    this.ownershipTypes.set([]);this.personLabels.clear();this.persons.set([]);this.ownerPerson.set(null);
    this.owners.set([]);
    this.latitude.set(null);
    this.longitude.set(null);
  }
}
