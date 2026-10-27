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
import { finalize } from 'rxjs';

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

  readonly store = inject(UotContextStore);
  readonly changing = signal(false);
  readonly unitIcon = faBuildingCircleCheck;
  readonly generalIcon = faGlobe;

  readonly value = computed(() =>
    this.store.modo() === 'GENERAL'
      ? 'GENERAL'
      : String(this.store.selectedId() ?? ''),
  );

  readonly disabled = computed(
    () =>
      this.changing() ||
      (!this.store.canUseGeneral() && this.store.memberships().length <= 1),
  );

  change(raw: string): void {
    if (this.changing() || !raw) return;

    const current = this.value();
    if (raw === current) return;

    const general = raw === 'GENERAL';
    const uotId = general ? null : Number(raw);

    if (!general && (!Number.isFinite(uotId) || uotId <= 0)) return;

    this.changing.set(true);

    this.api
      .selectContext(general ? 'GENERAL' : 'ESPECIFICA', uotId)
      .pipe(finalize(() => this.changing.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(
            general
              ? 'Vista general activada'
              : 'Unidad de trabajo actualizada',
          );
          void this.router.navigateByUrl('/inicio');
        },
        error: (error) =>
          this.toast.error(
            'No se pudo cambiar la UOT',
            mapOpenApiError(error).message,
          ),
      });
  }
}
