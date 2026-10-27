const CLOSING_CLASS = 'desco-modal--closing';
const CLOSE_DURATION_MS = 150;

const pendingClose = new WeakMap<HTMLDialogElement, ReturnType<typeof setTimeout>>();

export function openAnimatedDialog(dialog: HTMLDialogElement): void {
  const timer = pendingClose.get(dialog);

  if (timer) {
    clearTimeout(timer);
    pendingClose.delete(dialog);
  }

  dialog.classList.remove(CLOSING_CLASS);

  if (!dialog.open) {
    dialog.showModal();
  }
}

export function closeAnimatedDialog(
  dialog: HTMLDialogElement,
  afterClosed: () => void,
): void {
  const finish = (): void => {
    pendingClose.delete(dialog);

    if (dialog.open) {
      dialog.close();
    }

    dialog.classList.remove(CLOSING_CLASS);
    afterClosed();
  };

  if (!dialog.open) {
    finish();
    return;
  }

  if (dialog.classList.contains(CLOSING_CLASS)) {
    return;
  }

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    finish();
    return;
  }

  dialog.classList.add(CLOSING_CLASS);
  pendingClose.set(dialog, setTimeout(finish, CLOSE_DURATION_MS));
}
