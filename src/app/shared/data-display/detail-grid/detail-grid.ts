import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-detail-grid',
  standalone: true,
  template: '<div class="desco-detail-grid" [class.desco-detail-grid--three]="columns === 3"><ng-content /></div>',
  styleUrl: './detail-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailGridComponent {
  @Input() columns: 2 | 3 = 2;
}
