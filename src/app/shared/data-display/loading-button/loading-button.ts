import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCheck,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

export type LoadingButtonTone =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'ghost';

@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './loading-button.html',
  styleUrl: './loading-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingButtonComponent {
  @Input() label = 'Guardar';
  @Input() loadingLabel = 'Procesando...';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() tone: LoadingButtonTone = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() icon: IconDefinition = faCheck;

  @Output() pressed = new EventEmitter<void>();

  readonly spinnerIcon = faSpinner;

  buttonClass(): string {
    switch (this.tone) {
      case 'secondary':
        return 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
      case 'success':
        return 'border-0 bg-emerald-600 text-white hover:bg-emerald-700';
      case 'danger':
        return 'border-0 bg-red-600 text-white hover:bg-red-700';
      case 'ghost':
        return 'border-0 bg-transparent text-slate-700 hover:bg-slate-100';
      default:
        return 'border-0 bg-blue-600 text-white hover:bg-blue-700';
    }
  }

  onClick(): void {
    if (!this.loading && !this.disabled) {
      this.pressed.emit();
    }
  }
}
