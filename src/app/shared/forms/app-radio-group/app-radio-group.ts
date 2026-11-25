import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface AppRadioOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** Grupo de selección única accesible. El consumidor conserva las reglas de negocio. */
@Component({
  selector: 'app-radio-group',
  standalone: true,
  templateUrl: './app-radio-group.html',
  styleUrl: './app-radio-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRadioGroupComponent {
  @Input({ required: true }) name = '';
  @Input({ required: true }) label = '';
  @Input({ required: true }) options: readonly AppRadioOption[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  select(option: AppRadioOption): void {
    if (!this.disabled && !option.disabled && this.value !== option.value) {
      this.valueChange.emit(option.value);
    }
  }
}
