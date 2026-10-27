import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightFromBracket,
  faChevronLeft,
  faChevronRight,
  faSeedling,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { AccessStore } from '../../../core/access/access.store';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { CerrarSesionUseCase } from '../../../features/acceso/application/use-case/cerrar-sesion.use-case';
import { UotContextSwitcherComponent } from '../../../features/uot/adapter/in/ui/components/uot-context-switcher/uot-context-switcher';
import { AppAlertService } from '../../feedback/app-alert/app-alert.service';
import { SidebarItemComponent } from './sidebar-item';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    FaIconComponent,
    SidebarItemComponent,
    UotContextSwitcherComponent,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly navigation = inject(NavigationService);
  private readonly access = inject(AccessStore);
  private readonly logoutUseCase = inject(CerrarSesionUseCase);
  private readonly alert = inject(AppAlertService);
  private readonly router = inject(Router);

  @Input() mobileOpen = false;
  @Input() collapsed = false;

  @Output() mobileOpenChange = new EventEmitter<boolean>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly items = this.navigation.items;
  readonly loggingOut = signal(false);

  readonly logoIcon = faSeedling;
  readonly closeIcon = faXmark;
  readonly collapseIcon = faChevronLeft;
  readonly expandIcon = faChevronRight;
  readonly logoutIcon = faArrowRightFromBracket;

  readonly primaryRole = computed(
    () => this.access.roles()[0]?.nombre ?? 'Usuario autorizado',
  );

  closeMobile(): void {
    this.mobileOpenChange.emit(false);
  }

  toggleCollapsed(): void {
    this.collapsedChange.emit(!this.collapsed);
  }

  expandSidebar(): void {
    if (this.collapsed) {
      this.collapsedChange.emit(false);
    }
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;

    const result = await this.alert.question(
      'Cerrar sesión',
      '¿Deseas finalizar la sesión actual?',
      'Cerrar sesión',
      'Cancelar',
    );

    if (!result.confirmed) return;

    this.loggingOut.set(true);
    this.closeMobile();

    this.logoutUseCase
      .execute()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/login']),
        error: () => void this.router.navigate(['/login']),
      });
  }
}
