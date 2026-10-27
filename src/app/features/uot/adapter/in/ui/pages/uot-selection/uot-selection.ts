import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faBuildingCircleCheck,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ThemeService } from '../../../../../../../core/ui/theme.service';
import { UotApiService } from '../../../../out/http/uot-api.service';
import { UotContextStore } from '../../../../../state/uot-context.store';

@Component({
  selector: 'app-uot-selection-page',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './uot-selection.html',
  styleUrl: './uot-selection.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UotSelectionPage implements OnInit {
  private readonly api = inject(UotApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly store = inject(UotContextStore);
  readonly theme = inject(ThemeService);
  readonly loading = signal(true);
  readonly selecting = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly unitIcon = faBuildingCircleCheck;
  readonly generalIcon = faGlobe;
  readonly arrowIcon = faArrowRight;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .loadContext()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (context) => {
          if (!context.requiereSeleccion && context.uotSeleccionadaId) {
            void this.finishNavigation();
          }
        },
        error: (error) => this.error.set(mapOpenApiError(error).message),
      });
  }

  select(uotId: number): void {
    this.commit('ESPECIFICA', uotId, this.selectionKey(uotId));
  }

  selectionKey(uotId?: number): string {
    return String(uotId ?? '');
  }

  selectGeneral(): void {
    this.commit('GENERAL', null, 'GENERAL');
  }

  private commit(
    mode: 'ESPECIFICA' | 'GENERAL',
    uotId: number | null,
    key: string,
  ): void {
    if (this.selecting()) return;

    this.selecting.set(key);
    this.error.set(null);

    this.api
      .selectContext(mode, uotId)
      .pipe(finalize(() => this.selecting.set(null)))
      .subscribe({
        next: () => void this.finishNavigation(),
        error: (error) => this.error.set(mapOpenApiError(error).message),
      });
  }

  private finishNavigation(): Promise<boolean> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safe =
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//') &&
      !returnUrl.startsWith('/seleccionar-uot')
        ? returnUrl
        : '/inicio';

    return this.router.navigateByUrl(safe);
  }
}
