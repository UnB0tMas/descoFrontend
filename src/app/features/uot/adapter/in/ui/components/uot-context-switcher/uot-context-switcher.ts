import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBuildingCircleCheck, faGlobe } from '@fortawesome/free-solid-svg-icons';

import { ScreenLoadingService } from '../../../../../../../shared/data-display/screen-loading/screen-loading.service';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { UotApiService } from '../../../../out/http/uot-api.service';
import { UotContextStore } from '../../../../../state/uot-context.store';

@Component({
  selector: 'app-uot-context-switcher',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './uot-context-switcher.html',
  styleUrl: './uot-context-switcher.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UotContextSwitcherComponent {
  @Input() compact = false;

  private readonly api = inject(UotApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly screenLoading = inject(ScreenLoadingService);

  readonly store = inject(UotContextStore);
  readonly changing = signal(false);
  readonly unitIcon = faBuildingCircleCheck;
  readonly generalIcon = faGlobe;

  readonly value = computed(() =>
    this.store.isGeneral()
      ? 'GENERAL'
      : String(this.store.selectedId() ?? ''),
  );

  readonly modeLabel = computed(() =>
    this.store.isGeneral() ? 'GENERAL' : 'UOT',
  );

  readonly disabled = computed(
    () =>
      this.changing() ||
      !this.store.loaded() ||
      this.store.memberships().length === 0,
  );

  change(value: string): void {
    if (this.disabled()) return;

    const general = value === 'GENERAL';
    const parsedUotId = Number(value);

    if (!general && (!Number.isFinite(parsedUotId) || parsedUotId <= 0)) {
      return;
    }

    if (
      (general && this.store.isGeneral()) ||
      (!general &&
        this.store.isSpecific() &&
        this.store.selectedId() === parsedUotId)
    ) {
      return;
    }

    const targetUnit = general
      ? null
      : this.store.memberships().find((item) => item.uotId === parsedUotId) ?? null;

    this.changing.set(true);
    this.screenLoading.show(
      general ? 'Activando vista general' : 'Cambiando unidad de trabajo',
      general
        ? 'Actualizando la información para mostrar todas tus UOT autorizadas.'
        : `Actualizando permisos y datos para ${targetUnit?.nombre ?? 'la UOT seleccionada'}.`,
    );

    this.api
      .selectContext(
        general ? 'GENERAL' : 'ESPECIFICA',
        general ? undefined : parsedUotId,
      )
      .subscribe({
        next: () => {
          this.toast.success(
            general
              ? 'Vista general activada'
              : `UOT activa: ${targetUnit?.nombre ?? 'unidad seleccionada'}`,
          );
          void this.refreshCurrentRoute();
        },
        error: (error) => {
          this.changing.set(false);
          this.screenLoading.hide();
          this.toast.error(
            'No se pudo cambiar la UOT',
            mapOpenApiError(error).message,
          );
        },
      });
  }

  private async refreshCurrentRoute(): Promise<void> {
    const returnUrl = this.store.isGeneral() ? '/inicio' : this.router.url;

    try {
      const moved = await this.router.navigateByUrl('/__contexto-uot', {
        skipLocationChange: true,
      });

      if (moved) {
        await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      }
    } finally {
      this.changing.set(false);
      this.screenLoading.hide();
    }
  }
}
