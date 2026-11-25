import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { RecordCardComponent } from './record-card';

/** Presentación institucional oficial. Los consumidores aportan datos, estado y acciones. */
@Component({
  selector: 'app-institutional-record-card',
  standalone: true,
  imports: [RecordCardComponent, FaIconComponent],
  template: `
    <app-record-card class="desco-record-card--institutional"
      [class.desco-record-card--summary]="layout === 'summary'"
      [class.desco-record-card--icon-actions]="actionsLayout === 'icons'">
      <header class="desco-record-card__top">
        <span class="desco-record-card__code">{{ code }}</span>
        <ng-content select="[recordStatus]" />
      </header>
      <div class="desco-record-card__identity">
        @if (icon) { <div class="desco-record-card__icon"><fa-icon [icon]="icon" /></div> }
        <h2 class="desco-record-card__heading">{{ heading }}</h2>
      </div>
      @if (metadata.length) {
        <div class="desco-record-card__metadata">
          @for (item of metadata; track $index) { <span>{{ item }}</span> }
        </div>
      }
      @if (description) { <p class="desco-record-card__description">{{ description }}</p> }
      <footer class="desco-record-card__actions"><ng-content select="[recordActions]" /></footer>
    </app-record-card>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionalRecordCardComponent {
  @Input() code = '';
  @Input() heading = '';
  @Input() icon: IconDefinition | null = null;
  @Input() metadata: readonly string[] = [];
  @Input() description = '';
  @Input() layout: 'default' | 'summary' = 'default';
  @Input() actionsLayout: 'default' | 'icons' = 'default';
}
