import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBell,
  faCircleExclamation,
  faCircleInfo,
  faClock,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import { AlertaDashboard } from '../../../../../domain/alerta.model';

@Component({
  selector: 'app-alertas-panel',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './alertas-panel.html',
  styleUrl: './alertas-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasPanelComponent {
  @Input({ required: true }) alertas: readonly AlertaDashboard[] = [];

  readonly bellIcon = faBell;

  iconFor(type: string) {
    const normalized = type.toUpperCase();

    if (normalized.includes('ERROR') || normalized.includes('CRIT')) {
      return faCircleExclamation;
    }

    if (normalized.includes('WARN') || normalized.includes('ALERTA')) {
      return faTriangleExclamation;
    }

    if (normalized.includes('PEND') || normalized.includes('VENC')) {
      return faClock;
    }

    return faCircleInfo;
  }

  toneClass(type: string): string {
    const normalized = type.toUpperCase();

    if (normalized.includes('ERROR') || normalized.includes('CRIT')) {
      return 'alert-tone-error';
    }

    if (normalized.includes('WARN') || normalized.includes('ALERTA')) {
      return 'alert-tone-warning';
    }

    return 'alert-tone-info';
  }
}
