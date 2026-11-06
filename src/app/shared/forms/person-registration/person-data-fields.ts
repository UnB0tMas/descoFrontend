import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { GeographyCascadeComponent, GeographySelection } from '../geography-cascade/geography-cascade';
import { type PersonIdentityLocks, emptyPersonIdentityLocks } from '../../identity/person-identity-locks';
import type { PersonDocumentOption } from './person-lookup';

@Component({
  selector: 'app-person-data-fields', standalone: true,
  imports: [ReactiveFormsModule, GeographyCascadeComponent],
  templateUrl: './person-data-fields.html', styleUrl: './person-data-fields.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonDataFieldsComponent {
  @Input({required: true}) form!: FormGroup;
  @Input() idPrefix = 'person-form';
  @Input() documentTypes: readonly PersonDocumentOption[] = [];
  @Input() documentMaxLength = 8;
  @Input() documentInputMode: 'numeric' | 'text' = 'numeric';
  @Input() documentLocked = false;
  @Input() missingOnly = false;
  @Input() identityVisible = true;
  @Input() locationVisible = true;
  @Input() birthDateVisible = true;
  @Input() disabled = false;
  @Input() locks: PersonIdentityLocks = emptyPersonIdentityLocks();
  @Input() districtCode = '';
  @Input() populationCenterId: number | null = null;
  @Input() sex: string | null = null;
  @Input() referenceLabel = 'Referencia de ubicación';
  @Input() maxBirthDate = '';
  @Input() minBirthDate = '';
  @Output() readonly documentTypeChanged = new EventEmitter<void>();
  @Output() readonly documentChanged = new EventEmitter<void>();
  @Output() readonly nameChanged = new EventEmitter<'nombres' | 'apellidoPaterno' | 'apellidoMaterno'>();
  @Output() readonly phoneChanged = new EventEmitter<void>();
  @Output() readonly geographyChanged = new EventEmitter<GeographySelection>();
  show(field: keyof PersonIdentityLocks): boolean {
    return !this.missingOnly || !this.locks[field];
  }
  showIdentity(): boolean { return this.identityVisible && !this.missingOnly; }
  showPersonal(): boolean {
    return !this.missingOnly || this.show('names') || this.show('paternalSurname')
      || this.show('maternalSurname') || (this.birthDateVisible && this.show('birthDate')) || this.show('phone')
      || this.show('email');
  }
  showLocation(): boolean {
    return this.locationVisible && (!this.missingOnly || !this.locks.geography || !this.locks.populationCenter
      || !this.locks.reference);
  }
  showGeography(): boolean {
    return this.locationVisible && (!this.missingOnly || !this.locks.geography || !this.locks.populationCenter);
  }
  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
