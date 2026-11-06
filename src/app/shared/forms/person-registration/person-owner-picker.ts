import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';
import { PersonLookupComponent, PersonDocumentOption } from './person-lookup';
import { PersonDataFieldsComponent } from './person-data-fields';
import { GeographySelection } from '../geography-cascade/geography-cascade';
import {
  dniValidator, notBlankValidator, personNameValidator, phoneValidator,
  notFutureDateValidator, minBirthDateIso, maxBirthDateIso,
  normalizeText, sanitizeDocument, sanitizePhone, sanitizePersonName,
} from '../validators/desco-input.validators';

export interface PersonOwnerChoice {
  personaId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreCompleto: string;
}
export interface PersonOwnerInput {
  tipoDocumento: string; numeroDocumento: string; nombres: string;
  apellidoPaterno: string; apellidoMaterno?: string;
  fechaNacimiento?: string; telefono?: string; correo?: string;
  distritoCodigo: string; centroPobladoId?: number; referencia?: string;
}

/** La consulta es de solo lectura. El alta ocurre exclusivamente al pulsar Guardar. */
@Component({
  selector: 'app-person-owner-picker', standalone: true,
  imports: [ReactiveFormsModule, PersonLookupComponent, PersonDataFieldsComponent],
  templateUrl: './person-owner-picker.html', styleUrl: './person-owner-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonOwnerPickerComponent {
  @Input() idPrefix = 'owner';
  @Input() disabled = false;
  @Input() actionsInFooter = false;
  @Input({ required: true }) findPerson!: (type: string, document: string) => Observable<readonly PersonOwnerChoice[]>;
  @Input({ required: true }) savePerson!: (data: PersonOwnerInput) => Observable<number>;
  @Output() readonly personChosen = new EventEmitter<PersonOwnerChoice>();

  private readonly fb = inject(FormBuilder);
  private requestId = 0;
  readonly busy = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly stage = signal<'lookup' | 'manual'>('lookup');
  readonly districtCode = signal('');
  readonly populationCenterId = signal<number | null>(null);
  readonly minBirthDate = minBirthDateIso();
  readonly maxBirthDate = maxBirthDateIso();
  readonly types: readonly PersonDocumentOption[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carné de extranjería' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
  ];

  readonly form = this.fb.nonNullable.group({
    tipoDocumento: ['DNI', [Validators.required]],
    numeroDocumento: ['', [Validators.required, dniValidator]],
    nombres: ['', [Validators.required, notBlankValidator, personNameValidator, Validators.maxLength(100)]],
    apellidoPaterno: ['', [Validators.required, notBlankValidator, personNameValidator, Validators.maxLength(80)]],
    apellidoMaterno: ['', [personNameValidator, Validators.maxLength(80)]],
    fechaNacimiento: ['', [notFutureDateValidator]],
    telefono: ['', [phoneValidator, Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(180)]],
    distritoCodigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    centroPobladoId: [0],
    referencia: ['', [Validators.maxLength(300)]],
  });

  get documentLength(): number {
    const type = this.form.controls.tipoDocumento.value;
    return type === 'DNI' ? 8 : type === 'CE' ? 12 : 20;
  }
  canSearch(): boolean {
    return !this.busy() && !this.disabled && this.form.controls.numeroDocumento.valid;
  }
  setType(type: string): void {
    this.form.controls.tipoDocumento.setValue(type);
    this.form.controls.numeroDocumento.setValue('');
    const validators = type === 'DNI'
      ? [Validators.required, dniValidator]
      : type === 'CE'
        ? [Validators.required, Validators.pattern(/^[A-Z0-9]{9,12}$/)]
        : [Validators.required, Validators.pattern(/^[A-Z0-9]{6,20}$/)];
    this.form.controls.numeroDocumento.setValidators(validators);
    this.form.controls.numeroDocumento.updateValueAndValidity();
    this.error.set(null);
  }
  setNumber(number: string): void {
    const type = this.form.controls.tipoDocumento.value;
    this.form.controls.numeroDocumento.setValue(sanitizeDocument(type, number));
    this.form.controls.numeroDocumento.updateValueAndValidity();
    this.error.set(null);
  }
  reset(): void {
    ++this.requestId;
    this.busy.set(false); this.saving.set(false); this.error.set(null);
    this.stage.set('lookup'); this.districtCode.set(''); this.populationCenterId.set(null);
    this.form.reset({
      tipoDocumento: 'DNI', numeroDocumento: '', nombres: '', apellidoPaterno: '',
      apellidoMaterno: '', fechaNacimiento: '', telefono: '', correo: '',
      distritoCodigo: '', centroPobladoId: 0, referencia: '',
    });
    this.setType('DNI');
  }
  cancelPendingSearch(): void {
    if (this.saving()) return;
    ++this.requestId;
    this.busy.set(false);
  }
  manual(): void {
    if (this.saving() || this.disabled) return;
    ++this.requestId;
    this.busy.set(false); this.error.set(null);
    this.stage.set('manual');
  }
  back(): void {
    if (this.saving() || this.disabled) return;
    ++this.requestId;
    this.busy.set(false); this.error.set(null);
    this.stage.set('lookup');
  }
  search(): void {
    if (!this.canSearch()) return;
    const type = this.form.controls.tipoDocumento.value;
    const document = sanitizeDocument(type, this.form.controls.numeroDocumento.value);
    const token = ++this.requestId;
    this.error.set(null); this.busy.set(true);
    this.findPerson(type, document).pipe(finalize(() => {
      if (token === this.requestId) this.busy.set(false);
    })).subscribe({
      next: people => {
        if (token !== this.requestId) return;
        const person = people.find(p => p.tipoDocumento === type && p.numeroDocumento === document);
        if (person) this.personChosen.emit(person);
        else this.manual();
      },
      error: () => {
        if (token === this.requestId) this.error.set('No se pudo buscar a la persona.');
      },
    });
  }
  geography(value: GeographySelection): void {
    this.districtCode.set(value.districtCode);
    this.populationCenterId.set(value.populationCenterId ?? null);
    this.form.patchValue({ distritoCodigo: value.districtCode, centroPobladoId: value.populationCenterId ?? 0 });
  }
  sanitizeName(field: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'): void {
    const control = this.form.controls[field];
    control.setValue(sanitizePersonName(control.value), { emitEvent: false });
  }
  sanitizePhone(): void {
    const control = this.form.controls.telefono;
    control.setValue(sanitizePhone(control.value), { emitEvent: false });
  }
  save(): void {
    if (this.busy() || this.disabled) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) { this.error.set('Revise los campos obligatorios.'); return; }
    const p = this.form.getRawValue();
    const data: PersonOwnerInput = {
      tipoDocumento: p.tipoDocumento,
      numeroDocumento: sanitizeDocument(p.tipoDocumento, p.numeroDocumento),
      nombres: normalizeText(p.nombres),
      apellidoPaterno: normalizeText(p.apellidoPaterno),
      apellidoMaterno: normalizeText(p.apellidoMaterno) || undefined,
      fechaNacimiento: p.fechaNacimiento || undefined,
      telefono: sanitizePhone(p.telefono) || undefined,
      correo: p.correo.trim().toLowerCase() || undefined,
      distritoCodigo: p.distritoCodigo.trim(),
      centroPobladoId: p.centroPobladoId > 0 ? p.centroPobladoId : undefined,
      referencia: normalizeText(p.referencia) || undefined,
    };
    const token = ++this.requestId;
    this.error.set(null); this.busy.set(true); this.saving.set(true);
    this.savePerson(data).pipe(finalize(() => {
      if (token === this.requestId) { this.busy.set(false); this.saving.set(false); }
    })).subscribe({
      next: id => {
        if (token !== this.requestId) return;
        if (!Number.isSafeInteger(id) || id <= 0) {
          this.error.set('No se pudo confirmar el registro de la persona.');
          return;
        }
        // Únicamente se selecciona tras recibir el ID persistido desde el backend.
        this.personChosen.emit({
          personaId: id,
          tipoDocumento: data.tipoDocumento,
          numeroDocumento: data.numeroDocumento,
          nombreCompleto: [data.nombres, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(' ').trim(),
        });
      },
      error: () => {
        if (token === this.requestId) this.error.set('No se pudo guardar la persona.');
      },
    });
  }
}
