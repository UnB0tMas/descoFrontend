import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faFilter,
  faMagnifyingGlass,
  faRotate,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './filter-panel.html',
  styleUrl: './filter-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterPanelComponent implements OnInit {
  @Input() title = 'Filtros de búsqueda';
  @Input() description = 'Ajusta los criterios para encontrar información.';
  @Input() collapsible = true;
  @Input() initiallyExpanded = true;
  @Input() applying = false;

  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  readonly expanded = signal(true);

  readonly filterIcon = faFilter;
  readonly searchIcon = faMagnifyingGlass;
  readonly clearIcon = faRotate;
  readonly chevronIcon = faChevronDown;
  readonly spinnerIcon = faSpinner;

  ngOnInit(): void {
    this.expanded.set(this.initiallyExpanded);
  }

  toggle(): void {
    if (this.collapsible) {
      this.expanded.update((value) => !value);
    }
  }
}
