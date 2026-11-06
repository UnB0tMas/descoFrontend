import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { PersonOwnerPickerComponent, PersonOwnerChoice, PersonOwnerInput } from './person-owner-picker';

/** Se abre en lugar del formulario llamador y solo devuelve una persona confirmada. */
@Component({
  selector: 'app-person-registration-modal',
  standalone: true,
  imports: [PersonOwnerPickerComponent, FaIconComponent],
  templateUrl: './person-registration-modal.html',
  styleUrl: './person-registration-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonRegistrationModalComponent {
  @Input({ required: true }) findPerson!: (type: string, document: string) => Observable<readonly PersonOwnerChoice[]>;
  @Input({ required: true }) savePerson!: (data: PersonOwnerInput) => Observable<number>;
  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild(PersonOwnerPickerComponent) private picker!: PersonOwnerPickerComponent;

  readonly closing = signal(false);
  readonly closeIcon = faXmark;
  private resolver: ((person: PersonOwnerChoice | null) => void) | null = null;

  open(type = 'DNI', document = '', mode: 'manual' | 'lookup' = 'manual'): Promise<PersonOwnerChoice | null> {
    if (this.dialog.nativeElement.open || this.resolver) {
      throw new Error('El formulario de persona ya está abierto.');
    }
    this.closing.set(false);
    this.picker.reset();
    this.picker.setType(['DNI', 'CE', 'PASAPORTE'].includes(type) ? type : 'DNI');
    this.picker.setNumber(document);
    if (mode === 'manual') this.picker.manual();
    this.dialog.nativeElement.showModal();
    return new Promise(resolve => { this.resolver = resolve; });
  }

  pickerStage(): 'lookup' | 'manual' { return this.picker?.stage() ?? 'lookup'; }
  pickerBusy(): boolean { return this.picker?.busy() ?? false; }
  pickerSaving(): boolean { return this.picker?.saving() ?? false; }
  save(): void { if (!this.closing() && !this.pickerBusy()) this.picker.save(); }

  /** Un resultado solo se emite tras consultar una persona existente o confirmar el alta en la BD. */
  choose(person: PersonOwnerChoice): void {
    if (!Number.isSafeInteger(person.personaId) || person.personaId <= 0) return;
    void this.finish(person);
  }

  /** Cancelar no retorna persona ni guarda; permite cancelar búsquedas de solo lectura. */
  close(): void {
    if (this.picker?.saving()) return;
    void this.finish(null);
  }

  private async finish(result: PersonOwnerChoice | null): Promise<void> {
    if (this.closing() || !this.dialog.nativeElement.open || !this.resolver) return;
    if (result === null && this.picker.saving()) return;
    this.closing.set(true);
    // Invalida la búsqueda pendiente inmediatamente para que no seleccione tras cancelar.
    if (result === null) this.picker.cancelPendingSearch();
    const dialog = this.dialog.nativeElement;
    dialog.classList.add('person-registration-modal--leave');
    await new Promise<void>(resolve => setTimeout(resolve, 150));
    dialog.classList.remove('person-registration-modal--leave');
    if (dialog.open) dialog.close();
    const resolve = this.resolver;
    this.resolver = null;
    this.picker.reset();
    this.closing.set(false);
    resolve?.(result);
  }
}
