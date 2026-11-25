import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: StatusBadgeTone = 'neutral';
  @Input() dot = false;
}
