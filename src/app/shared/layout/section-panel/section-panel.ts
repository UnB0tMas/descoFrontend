import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

@Component({
  selector: 'app-section-panel',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './section-panel.html',
  styleUrl: './section-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPanelComponent {
  @Input() title: string | null = null;
  @Input() description: string | null = null;
  @Input() icon: IconDefinition | null = null;
  @Input() padded = true;
}
