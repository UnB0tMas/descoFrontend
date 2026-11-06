import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, Renderer2 } from '@angular/core';
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
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const home = this.host.parentNode;
      if (!home) return;

      const anchor = this.renderer.createComment('toast-center-home');
      this.renderer.insertBefore(home, anchor, this.host);
      let dialogs = Array.from(this.document.querySelectorAll<HTMLDialogElement>('dialog:modal'));

      const placeAboveDialog = (): void => {
        dialogs = dialogs.filter((dialog) => dialog.isConnected && dialog.matches(':modal'));
        const parent = dialogs.at(-1) ?? home;
        if (this.host.parentNode === parent) return;
        if (parent === home) {
          this.renderer.insertBefore(home, this.host, anchor.nextSibling);
        } else {
          this.renderer.appendChild(parent, this.host);
        }
      };

      // Native modal dialogs are in the browser's top layer. A z-index on the
      // shell cannot cover them, and a sibling popover would still be inert.
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type !== 'attributes' || !(record.target instanceof HTMLDialogElement)) continue;
          const dialog = record.target;
          dialogs = dialogs.filter((current) => current !== dialog);
          if (dialog.matches(':modal')) dialogs.push(dialog);
        }
        placeAboveDialog();
      });
      observer.observe(this.document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['open'],
        childList: true,
      });
      placeAboveDialog();

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        this.renderer.insertBefore(home, this.host, anchor.nextSibling);
        this.renderer.removeChild(home, anchor);
      });
    });
  }

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
