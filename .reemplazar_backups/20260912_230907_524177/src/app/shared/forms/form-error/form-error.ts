import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './form-error.html',
  styleUrl: './form-error.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormErrorComponent {
  @Input({ required: true }) control: AbstractControl | null = null;
  @Input() fieldLabel = 'Este campo';
  @Input() messages: Readonly<Record<string, string>> = {};

  readonly errorIcon = faCircleExclamation;

  get message(): string | null {
    const control = this.control;

    if (!control || !control.invalid || (!control.touched && !control.dirty)) {
      return null;
    }

    const errors = control.errors;

    if (!errors) {
      return null;
    }

    const key = Object.keys(errors)[0];

    if (this.messages[key]) {
      return this.messages[key];
    }

    switch (key) {
      case 'required':
        return `${this.fieldLabel} es obligatorio.`;
      case 'email':
        return 'Ingresa un correo electrónico válido.';
      case 'minlength':
        return `${this.fieldLabel} no cumple la longitud mínima.`;
      case 'maxlength':
        return `${this.fieldLabel} supera la longitud permitida.`;
      case 'min':
        return `${this.fieldLabel} es menor al valor permitido.`;
      case 'max':
        return `${this.fieldLabel} supera el valor permitido.`;
      case 'pattern':
        return `${this.fieldLabel} tiene un formato inválido.`;
      default:
        return `${this.fieldLabel} contiene un valor inválido.`;
    }
  }
}
