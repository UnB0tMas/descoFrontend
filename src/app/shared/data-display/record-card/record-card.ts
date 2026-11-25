import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

/** Estructura única de tarjetas de listado. El consumidor proyecta datos y acciones;
 * los permisos, navegación y estado permanecen en cada página. */
@Component({
  selector: 'app-record-card',
  standalone: true,
  template: '<article class="desco-record-card" [class.desco-record-card--compact]="density === \'compact\'"><ng-content /></article>',
  styleUrl: './record-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RecordCardComponent {
  @Input() density: 'normal' | 'compact' = 'normal';
}
