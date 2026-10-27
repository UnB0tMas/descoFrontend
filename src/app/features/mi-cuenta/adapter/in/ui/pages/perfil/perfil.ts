import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightFromBracket,
  faAt,
  faBuilding,
  faIdBadge,
  faPhone,
  faRotate,
  faShieldHalved,
  faUser,
  faUserTag,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessStore } from '../../../../../../../core/access/access.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { AppAlertService } from '../../../../../../../shared/feedback/app-alert/app-alert.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { CerrarSesionUseCase } from '../../../../../../acceso/application/use-case/cerrar-sesion.use-case';
import { ObtenerContextoActualUseCase } from '../../../../../../acceso/application/use-case/obtener-contexto-actual.use-case';

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    FaIconComponent,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPage implements OnInit {
  private readonly access = inject(AccessStore);
  private readonly contextUseCase = inject(ObtenerContextoActualUseCase);
  private readonly logoutUseCase = inject(CerrarSesionUseCase);
  private readonly alert = inject(AppAlertService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly loggingOut = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly user = this.access.user;
  readonly roles = this.access.roles;

  readonly displayName = computed(
    () =>
      this.user()?.nombreCompleto ||
      this.user()?.nombreUsuario ||
      'Usuario',
  );

  readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );

  readonly userIcon = faUser;
  readonly idIcon = faIdBadge;
  readonly phoneIcon = faPhone;
  readonly mailIcon = faAt;
  readonly buildingIcon = faBuilding;
  readonly roleIcon = faUserTag;
  readonly securityIcon = faShieldHalved;
  readonly refreshIcon = faRotate;
  readonly logoutIcon = faArrowRightFromBracket;

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.contextUseCase
      .execute()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    const result = await this.alert.question(
      'Cerrar sesión',
      '¿Deseas finalizar la sesión actual?',
      'Cerrar sesión',
      'Cancelar',
    );

    if (!result.confirmed) {
      return;
    }

    this.loggingOut.set(true);

    this.logoutUseCase
      .execute()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/login']),
        error: () => void this.router.navigate(['/login']),
      });
  }
}
