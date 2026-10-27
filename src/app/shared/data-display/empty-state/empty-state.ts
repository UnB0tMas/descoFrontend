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
  faInbox,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input() title = 'Sin resultados';
  @Input() message = 'No encontramos información para mostrar.';
  @Input() actionLabel: string | null = null;
  @Input() icon: IconDefinition = faInbox;

  @Output() action = new EventEmitter<void>();

  readonly actionIcon = faPlus;
}
