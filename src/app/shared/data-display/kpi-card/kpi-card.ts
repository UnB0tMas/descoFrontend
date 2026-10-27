import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowDown,
  faArrowRight,
  faArrowUp,
} from '@fortawesome/free-solid-svg-icons';

import {
  KpiCardData,
  KpiTone,
  KpiTrendDirection,
} from './kpi-card.model';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  @Input({ required: true }) data!: KpiCardData;

  trendIcon(direction: KpiTrendDirection | undefined) {
    switch (direction) {
      case 'up':
        return faArrowUp;
      case 'down':
        return faArrowDown;
      default:
        return faArrowRight;
    }
  }

  toneClass(tone: KpiTone | undefined): string {
    switch (tone) {
      case 'sky':
        return 'bg-sky-50 text-sky-700 ring-sky-100';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 ring-indigo-100';
      case 'slate':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 ring-blue-100';
    }
  }

  trendClass(direction: KpiTrendDirection | undefined): string {
    switch (direction) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-500';
    }
  }
}
