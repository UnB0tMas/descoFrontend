import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-detail-card',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './detail-card.html',
  styleUrl: './detail-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailCardComponent {
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() icon: IconDefinition | null = null;
}
