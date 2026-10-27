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
  faArrowLeft,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle: string | null = null;
  @Input() eyebrow: string | null = null;
  @Input() icon: IconDefinition = faLayerGroup;
  @Input() showBack = false;

  @Output() back = new EventEmitter<void>();

  readonly backIcon = faArrowLeft;
}
