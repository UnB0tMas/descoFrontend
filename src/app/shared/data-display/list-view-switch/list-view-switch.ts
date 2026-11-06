import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGrip, faList } from '@fortawesome/free-solid-svg-icons';

export type ListViewMode = 'table' | 'cards';

/** Selector institucional reutilizable para listados de DESCO. */
@Component({
  selector: 'app-list-view-switch',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './list-view-switch.html',
  styleUrl: './list-view-switch.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListViewSwitchComponent {
  @Input() view: ListViewMode = 'table';
  @Input() disabled = false;
  @Input() label = 'Vista del listado';
  @Output() readonly viewChange = new EventEmitter<ListViewMode>();
  readonly tableIcon = faList;
  readonly cardsIcon = faGrip;
  change(view: ListViewMode): void {
    if (!this.disabled && this.view !== view) this.viewChange.emit(view);
  }
}
