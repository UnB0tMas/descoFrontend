import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface DescoTab {
  id: string;
  label: string;
  disabled?: boolean;
  icon?: IconDefinition;
  count?: number;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsComponent {
  @Input() tabs: readonly DescoTab[] = [];
  @Input() active: string | null = null;
  @Input() label = 'Secciones';
  @Output() readonly activeChange = new EventEmitter<string>();

  activate(tab: DescoTab): void {
    if (!tab.disabled && tab.id !== this.active) this.activeChange.emit(tab.id);
  }
}
