import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { ToastMessage } from './toast.model';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-center',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './toast-center.html',
  styleUrl: './toast-center.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastCenterComponent {
  readonly toastService = inject(ToastService);
  readonly closeIcon = faXmark;

  iconFor(toast: ToastMessage) {
    switch (toast.tone) {
      case 'success':
        return faCheck;
      case 'warning':
        return faTriangleExclamation;
      case 'error':
        return faCircleExclamation;
      default:
        return faCircleInfo;
    }
  }

  borderClass(toast: ToastMessage): string {
    switch (toast.tone) {
      case 'success':
        return 'border-emerald-200';
      case 'warning':
        return 'border-amber-200';
      case 'error':
        return 'border-red-200';
      default:
        return 'border-blue-200';
    }
  }

  iconClass(toast: ToastMessage): string {
    switch (toast.tone) {
      case 'success':
        return 'bg-emerald-50 text-emerald-600';
      case 'warning':
        return 'bg-amber-50 text-amber-600';
      case 'error':
        return 'bg-red-50 text-red-600';
      default:
        return 'bg-blue-50 text-blue-600';
    }
  }
}
