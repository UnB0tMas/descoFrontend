import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Observable, finalize } from 'rxjs';
import { PersonDataFieldsComponent } from './person-data-fields';
import { GeographySelection } from '../geography-cascade/geography-cascade';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';

export interface PersonEditRecord {
  personaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  telefono?: string | null;
  correo?: string | null;
  distritoCodigo?: string | null;
  centroPobladoId?: number | null;
  referencia?: string | null;
}

export interface PersonEditData {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  correo: string | null;
  distritoCodigo: string | null;
  centroPobladoId: number | null;
  referencia: string | null;
}

/** Edición de la identidad central: el consumidor proporciona la operación de guardado. */
@Component({
  selector: 'app-person-edit-modal', standalone: true,
  imports: [ReactiveFormsModule, FaIconComponent, PersonDataFieldsComponent],
  templateUrl: './person-edit-modal.html', styleUrl: './person-edit-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonEditModalComponent {
  @Input({required: true}) savePerson!: (id: number, values: PersonEditData, requestId: string) => Observable<unknown>;
  @ViewChild('dialog', {static: true}) private dialog!: ElementRef<HTMLDialogElement>;
  private readonly fb = inject(FormBuilder);
  readonly closeIcon = faXmark;
  readonly editIcon = faPen;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly current = signal<PersonEditRecord | null>(null);
  private resolveResult: ((saved: boolean) => void) | null = null;
  private lastPayload = '';
  private lastRequest = '';

  readonly form = this.fb.group({
    tipoDocumento: '', numeroDocumento: '',
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80)]],
    apellidoMaterno: ['', [Validators.maxLength(80)]],
    fechaNacimiento: '', sexo: '', razonSocial: '', nombreComercial: '',
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: '', centroPobladoId: this.fb.control<number | null>(null),
    referencia: ['', [Validators.maxLength(300)]],
  });

  open(person: PersonEditRecord): Promise<boolean> {
    if (this.resolveResult) this.finish(false);
    this.current.set(person);
    this.error.set(null);
    this.lastPayload = '';
    this.lastRequest = '';
    this.form.reset({
      tipoDocumento: person.tipoDocumento, numeroDocumento: person.numeroDocumento,
      nombres: person.nombres, apellidoPaterno: person.apellidoPaterno,
      apellidoMaterno: person.apellidoMaterno ?? '', telefono: person.telefono ?? '',
      correo: person.correo ?? '', distritoCodigo: person.distritoCodigo ?? '',
      centroPobladoId: person.centroPobladoId ?? null, referencia: person.referencia ?? '',
    });
    this.dialog.nativeElement.showModal();
    return new Promise(resolve => { this.resolveResult = resolve; });
  }

  geography(selection: GeographySelection): void {
    this.form.patchValue({distritoCodigo: selection.districtCode, centroPobladoId: selection.populationCenterId});
  }

  close(): void { if (!this.saving()) this.finish(false); }

  save(): void {
    const person = this.current();
    if (!person || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise los datos de la persona.');
      return;
    }
    const values = this.form.getRawValue();
    const district = (values.distritoCodigo ?? '').trim();
    if (district && !/^\d{6}$/.test(district)) {
      this.error.set('Seleccione un distrito válido.');
      return;
    }
    const data: PersonEditData = {
      nombres: (values.nombres ?? '').trim(),
      apellidoPaterno: (values.apellidoPaterno ?? '').trim(),
      apellidoMaterno: (values.apellidoMaterno ?? '').trim() || null,
      telefono: (values.telefono ?? '').trim() || null,
      correo: (values.correo ?? '').trim() || null,
      distritoCodigo: district || null,
      centroPobladoId: values.centroPobladoId,
      referencia: (values.referencia ?? '').trim() || null,
    };
    const payload = JSON.stringify({id: person.personaId, data});
    if (payload !== this.lastPayload || !this.lastRequest) {
      this.lastPayload = payload;
      this.lastRequest = crypto.randomUUID();
    }
    this.saving.set(true);
    this.error.set(null);
    this.savePerson(person.personaId, data, this.lastRequest).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.finish(true),
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }

  private finish(saved: boolean): void {
    if (this.dialog.nativeElement.open) this.dialog.nativeElement.close();
    this.current.set(null);
    this.resolveResult?.(saved);
    this.resolveResult = null;
  }
}
