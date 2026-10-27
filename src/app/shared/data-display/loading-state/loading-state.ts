import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type LoadingStateVariant = 'table' | 'cards' | 'detail';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  @Input() title = 'Cargando';
  @Input() message = '';
  @Input() compact = false;
  @Input() variant: LoadingStateVariant = 'table';
  @Input() rows = 5;

  get items(): readonly number[] {
    return Array.from({ length: Math.max(1, Math.min(this.rows, 10)) }, (_, index) => index);
  }
}
