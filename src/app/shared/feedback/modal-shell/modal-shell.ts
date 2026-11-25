import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faLayerGroup, faXmark } from '@fortawesome/free-solid-svg-icons';
import { DialogBackdropDirective } from '../dialog-lifecycle/dialog-backdrop.directive';
import { closeAnimatedDialog, openAnimatedDialog } from '../dialog-lifecycle/dialog-lifecycle.util';

export type ModalShellSize = 'compact' | 'normal' | 'wide';
export type ModalShellVariant = 'default' | 'compose';

/** Solo el contenedor visual; formulario, validación, permisos y guardado pertenecen a la pantalla. */
@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [FaIconComponent, DialogBackdropDirective],
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalShellComponent {
  @ViewChild('dialog', { static: true }) private dialogRef!: ElementRef<HTMLDialogElement>;

  @Input() title = 'Detalle';
  @Input() eyebrow: string | null = null;
  @Input() description: string | null = null;
  @Input() icon: IconDefinition = faLayerGroup;
  @Input() size: ModalShellSize = 'normal';
  @Input() variant: ModalShellVariant = 'default';
  @Input() busy = false;
  @Input() closeOnEscape = true;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly closeRequested = new EventEmitter<void>();

  readonly closeIcon = faXmark;

  open(): void {
    openAnimatedDialog(this.dialogRef.nativeElement);
  }

  close(force = false): void {
    if (this.busy && !force) return;
    closeAnimatedDialog(this.dialogRef.nativeElement, () => this.closed.emit());
  }

  requestClose(): void {
    if (this.busy) return;
    if (this.variant === 'compose') this.closeRequested.emit();
    else this.close();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    if (this.closeOnEscape) this.requestClose();
  }
}
