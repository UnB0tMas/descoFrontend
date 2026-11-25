import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';

/** Confirmación reutilizable dentro de un diálogo ya abierto, sin superponer otro dialog nativo. */
@Component({
  selector: 'app-inline-confirm-dialog',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './inline-confirm-dialog.html',
  styleUrl: './inline-confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Volver');
  readonly tone = input<'warning' | 'primary'>('primary');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly iconWarning = faTriangleExclamation;
  readonly iconClose = faXmark;
}
