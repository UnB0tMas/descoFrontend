import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

/** Admite controles nativos, formControl y ngModel proyectados; no modifica su lógica. */
@Component({
  selector: 'app-form-field',
  standalone: true,
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FormFieldComponent {
  @Input() label = '';
  @Input() forId: string | null = null;
  @Input() hint: string | null = null;
  @Input() error: string | null = null;
  @Input() required = false;
}
