import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faCircleExclamation,
  faCircleInfo,
  faCircleQuestion,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { AppAlertRequest, AppAlertTone } from './app-alert.model';
import { AppAlertService } from './app-alert.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './app-alert.html',
  styleUrl: './app-alert.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAlertComponent {
  readonly alertService = inject(AppAlertService);
  readonly closeIcon = faXmark;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    const current = this.alertService.current();

    if (current?.config.dismissible) {
      this.alertService.cancel();
    }
  }

  iconFor(request: AppAlertRequest) {
    if (request.config.icon) {
      return request.config.icon;
    }

    switch (request.config.tone) {
      case 'success':
        return faCheck;
      case 'warning':
        return faTriangleExclamation;
      case 'error':
        return faCircleExclamation;
      case 'question':
        return faCircleQuestion;
      default:
        return faCircleInfo;
    }
  }

  iconClass(tone: AppAlertTone): string {
    switch (tone) {
      case 'success':
        return 'bg-emerald-50 text-emerald-600 ring-emerald-100';
      case 'warning':
        return 'bg-amber-50 text-amber-600 ring-amber-100';
      case 'error':
        return 'bg-red-50 text-red-600 ring-red-100';
      case 'question':
        return 'bg-indigo-50 text-indigo-600 ring-indigo-100';
      default:
        return 'bg-blue-50 text-blue-600 ring-blue-100';
    }
  }

  confirmClass(tone: AppAlertTone): string {
    switch (tone) {
      case 'error':
        return 'bg-red-600 text-white hover:bg-red-700';
      case 'warning':
        return 'bg-amber-500 text-slate-950 hover:bg-amber-600';
      case 'success':
        return 'bg-emerald-600 text-white hover:bg-emerald-700';
      case 'question':
        return 'bg-indigo-600 text-white hover:bg-indigo-700';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  }
}
