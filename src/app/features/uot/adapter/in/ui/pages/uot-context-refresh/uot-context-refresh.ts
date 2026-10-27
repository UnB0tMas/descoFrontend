import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-uot-context-refresh-page',
  standalone: true,
  template: '<span class="sr-only" role="status">Actualizando contexto UOT</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UotContextRefreshPage {}
