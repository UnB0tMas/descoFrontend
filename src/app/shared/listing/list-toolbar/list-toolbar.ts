import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faRotate } from '@fortawesome/free-solid-svg-icons';
import { ListViewMode, ListViewSwitchComponent } from '../../data-display/list-view-switch/list-view-switch';

@Component({
  selector: 'app-list-toolbar',
  host: { '[class.desco-list-toolbar-host--institutional]': "appearance === 'institutional'" },
  standalone: true,
  imports: [FaIconComponent, ListViewSwitchComponent],
  templateUrl: './list-toolbar.html',
  styleUrl: './list-toolbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ListToolbarComponent {
  @Input() search = '';
  @Input() searchPlaceholder = 'Buscar registros';
  @Input() showSearch = true;
  @Input() showRefresh = false;
  @Input() showViewSwitch = true;
  @Input() view: ListViewMode = 'table';
  @Input() appearance: 'default' | 'institutional' = 'default';
  @Input() layout: 'default' | 'inline' = 'default';
  @Input() busy = false;

  @Output() readonly searchChange = new EventEmitter<string>();
  @Output() readonly refresh = new EventEmitter<void>();
  @Output() readonly viewChange = new EventEmitter<ListViewMode>();

  readonly searchIcon = faMagnifyingGlass;
  readonly refreshIcon = faRotate;
}
