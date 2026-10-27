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
      case 'blank':
        return `${this.fieldLabel} no puede contener solo espacios.`;
      case 'email':
        return 'Ingresa un correo electrónico válido.';
      case 'minlength':
        return `${this.fieldLabel} es demasiado corto.`;
      case 'maxlength':
        return `${this.fieldLabel} supera la longitud permitida.`;
      case 'min':
        return `${this.fieldLabel} es menor al valor permitido.`;
      case 'max':
        return `${this.fieldLabel} supera el valor permitido.`;
      case 'pattern':
        return `${this.fieldLabel} tiene un formato inválido.`;
      case 'personName':
        return `${this.fieldLabel} solo puede contener letras, espacios, apóstrofes o guiones.`;
      case 'phone':
        return 'Ingresa un teléfono válido de 7 a 15 dígitos.';
      case 'dni':
        return 'Ingresa un DNI válido de 8 dígitos.';
      case 'ruc':
        return 'Ingresa un RUC válido de 11 dígitos.';
      case 'rucNature':
        return 'El RUC no corresponde al tipo de registro seleccionado.';
      case 'futureDate':
        return `${this.fieldLabel} no puede ser futura.`;
      case 'underage':
        return 'La persona debe ser mayor de edad.';
      case 'ageOutOfRange':
        return 'La fecha está fuera del rango permitido.';
      case 'invalidDate':
        return 'Ingresa una fecha válida.';
      case 'dateOrder':
        return 'Revisa el orden de las fechas.';
      case 'integer':
        return `${this.fieldLabel} debe ser un número entero.`;
      case 'decimal':
      case 'decimalPrecision':
        return `${this.fieldLabel} tiene un valor numérico inválido.`;
      case 'passwordUppercase':
        return 'Incluye al menos una letra mayúscula.';
      case 'passwordLowercase':
        return 'Incluye al menos una letra minúscula.';
      case 'passwordDigit':
        return 'Incluye al menos un número.';
      case 'passwordSpecial':
        return 'Incluye al menos un carácter especial.';
      case 'username':
        return 'Usa solo letras minúsculas, números, punto, guion o guion bajo.';
      case 'passwordOuterWhitespace':
        return 'La contraseña no puede comenzar ni terminar con espacios.';
      case 'passwordControlCharacter':
        return 'La contraseña contiene caracteres no permitidos.';
      default:
        return `${this.fieldLabel} contiene un valor inválido.`;
    }
  }
}
