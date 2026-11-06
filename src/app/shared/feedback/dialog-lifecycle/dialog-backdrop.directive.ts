import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Uses the dialog's existing cancel handler, including its in-flight save guard. */
@Directive({
  selector: 'dialog[appDialogBackdrop]',
  standalone: true,
})
export class DialogBackdropDirective {
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private startedOnBackdrop = false;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.startedOnBackdrop = event.button === 0 && event.target === this.dialog;
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    const dismiss = this.startedOnBackdrop && event.target === this.dialog;
    this.startedOnBackdrop = false;

    if (dismiss && this.dialog.open) {
      const cancelled = !this.dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      if (!cancelled) this.dialog.close();
    }
  }
}
