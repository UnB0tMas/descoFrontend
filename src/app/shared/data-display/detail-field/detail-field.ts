import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-detail-field',
  standalone: true,
  templateUrl: './detail-field.html',
  styleUrl: './detail-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailFieldComponent {
  @Input({ required: true }) label = '';
  @Input() value: string | number | boolean | null | undefined = null;
  @Input() emptyText = '—';
  @Input() projected = false;
}
