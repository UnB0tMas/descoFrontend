import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  @Input() title = 'Cargando información';
  @Input() message = 'Estamos preparando los datos solicitados.';
  @Input() compact = false;

  readonly loadingIcon = faSpinner;
}
