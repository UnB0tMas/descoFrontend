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
  faBell,
  faChevronDown,
  faCircleUser,
  faClockRotateLeft,
  faDisplay,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

import { AccessStore } from '../../../core/access/access.store';
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

  @Output() menuToggle = new EventEmitter<void>();

  readonly menuIcon = faBars;
  readonly bellIcon = faBell;
  readonly userIcon = faCircleUser;
  readonly sessionsIcon = faClockRotateLeft;
  readonly devicesIcon = faDisplay;
  readonly securityIcon = faShieldHalved;
  readonly chevronIcon = faChevronDown;

  readonly user = this.accessStore.user;

  readonly displayName = computed(
    () =>
      this.user()?.nombreCompleto ||
      this.user()?.nombreUsuario ||
      'Usuario DESCO',
  );

  readonly initials = computed(() => {
    const source = this.displayName().trim();

    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
}
