import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Interruptor visual reutilizable; no conoce las reglas de negocio del consumidor. */
@Component({
  selector: 'app-toggle',
  standalone: true,
  templateUrl: './app-toggle.html',
  styleUrl: './app-toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppToggleComponent {
  @Input() label = '';
  @Input() checked = false;
  @Input() disabled = false;
  @Output() readonly checkedChange = new EventEmitter<boolean>();

  change(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
