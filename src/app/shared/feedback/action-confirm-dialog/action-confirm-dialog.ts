import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleExclamation,
  faShieldHalved,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import {
  closeAnimatedDialog,
  openAnimatedDialog,
} from '../dialog-lifecycle/dialog-lifecycle.util';

import {
  ActionConfirmConfig,
  ActionConfirmResult,
  ActionConfirmTone,
} from './action-confirm-dialog.model';

@Component({
  selector: 'app-action-confirm-dialog',
  standalone: true,
  imports: [FormsModule, FaIconComponent],
  templateUrl: './action-confirm-dialog.html',
  styleUrl: './action-confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionConfirmDialogComponent {
  @ViewChild('dialog', { static: true })
  private dialogRef!: ElementRef<HTMLDialogElement>;

  readonly config = signal<ActionConfirmConfig | null>(null);
  readonly reason = signal('');
  readonly closeIcon = faXmark;

  private resolver: ((result: ActionConfirmResult) => void) | null = null;

  show(config: ActionConfirmConfig): Promise<ActionConfirmResult> {
    if (this.resolver) {
      this.resolver({ confirmed: false, reason: null });
      this.resolver = null;
    }

    this.config.set({
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      tone: 'primary',
      requiresReason: false,
      reasonLabel: 'Motivo',
      reasonPlaceholder: 'Describe el motivo de esta acción.',
      minimumReasonLength: 5,
      maximumReasonLength: 500,
      ...config,
    });

    this.reason.set('');
    openAnimatedDialog(this.dialogRef.nativeElement);

    return new Promise<ActionConfirmResult>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirm(): void {
    const current = this.config();

    if (!current || !this.canConfirm()) {
      return;
    }

    const reason = this.reason().trim();

    this.finish({
      confirmed: true,
      reason: reason || null,
    });
  }

  cancel(): void {
    this.finish({
      confirmed: false,
      reason: null,
    });
  }

  canConfirm(): boolean {
    const current = this.config();

    if (!current?.requiresReason) {
      return true;
    }

    const length = this.reason().trim().length;
    const minimum = current.minimumReasonLength ?? 5;
    const maximum = current.maximumReasonLength ?? 500;

    return length >= minimum && length <= maximum;
  }

  iconFor(tone: ActionConfirmTone | undefined) {
    switch (tone) {
      case 'danger':
        return faCircleExclamation;
      case 'warning':
        return faTriangleExclamation;
      default:
        return faShieldHalved;
    }
  }

  iconClass(tone: ActionConfirmTone | undefined): string {
    switch (tone) {
      case 'danger':
        return 'bg-desco-surface-soft text-desco-danger';
      case 'warning':
        return 'bg-desco-surface-soft text-desco-warning';
      default:
        return 'bg-desco-primary-soft text-desco-primary';
    }
  }

  confirmButtonClass(tone: ActionConfirmTone | undefined): string {
    switch (tone) {
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700';
      case 'warning':
        return 'bg-amber-500 text-slate-950 hover:bg-amber-600';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  }

  private finish(result: ActionConfirmResult): void {
    closeAnimatedDialog(this.dialogRef.nativeElement, () => {
      this.resolver?.(result);
      this.resolver = null;
      this.config.set(null);
      this.reason.set('');
    });
  }
}
