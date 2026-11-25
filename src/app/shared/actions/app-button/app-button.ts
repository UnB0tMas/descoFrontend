import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export type AppButtonTone = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'danger-ghost';
export type AppButtonSize = 'small' | 'normal';

/** Botón institucional; el consumidor conserva la autorización y la operación. */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './app-button.html',
  styleUrl: './app-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppButtonComponent {
  @Input() label = '';
  @Input() tone: AppButtonTone = 'secondary';
  @Input() size: AppButtonSize = 'normal';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() icon: IconDefinition | null = null;
  @Input() iconOnly = false;
  @Input() loading = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() loadingLabel = 'Procesando...';

  @Output() readonly pressed = new EventEmitter<void>();

  readonly spinnerIcon = faSpinner;

  handleClick(): void {
    if (!this.disabled && !this.loading) this.pressed.emit();
  }
}
