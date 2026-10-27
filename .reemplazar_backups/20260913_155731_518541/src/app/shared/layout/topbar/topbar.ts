import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faChevronDown,
  faCircleUser,
  faClockRotateLeft,
  faDisplay,
  faMoon,
  faShieldHalved,
  faSun,
} from '@fortawesome/free-solid-svg-icons';

import { AccessStore } from '../../../core/access/access.store';
import { ThemeService } from '../../../core/ui/theme.service';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, FaIconComponent, BreadcrumbComponent],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly accessStore = inject(AccessStore);
  readonly theme = inject(ThemeService);

  @Output() menuToggle = new EventEmitter<void>();

  readonly menuIcon = faBars;
  readonly userIcon = faCircleUser;
  readonly sessionsIcon = faClockRotateLeft;
  readonly devicesIcon = faDisplay;
  readonly securityIcon = faShieldHalved;
  readonly chevronIcon = faChevronDown;
  readonly lightIcon = faSun;
  readonly darkIcon = faMoon;
  readonly user = this.accessStore.user;

  readonly displayName = computed(
    () => this.user()?.nombreCompleto || this.user()?.nombreUsuario || 'Usuario DESCO',
  );

  readonly initials = computed(() =>
    this.displayName()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
}
