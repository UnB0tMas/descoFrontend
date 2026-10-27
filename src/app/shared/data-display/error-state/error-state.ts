import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleExclamation,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  @Input() title = 'No pudimos cargar la información';
  @Input() message = 'Ocurrió un inconveniente al consultar los datos.';
  @Input() retryLabel = 'Intentar nuevamente';
  @Input() showRetry = true;

  @Output() retry = new EventEmitter<void>();

  readonly errorIcon = faCircleExclamation;
  readonly retryIcon = faRotate;
}
