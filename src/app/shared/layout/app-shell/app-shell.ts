import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppAlertComponent } from '../../feedback/app-alert/app-alert';
import { ToastCenterComponent } from '../../feedback/toast-center/toast-center';
import { ScreenLoadingComponent } from '../../data-display/screen-loading/screen-loading';
import { SidebarComponent } from '../sidebar/sidebar';
import { TopbarComponent } from '../topbar/topbar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
    ToastCenterComponent,
    AppAlertComponent,
    ScreenLoadingComponent,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly mobileSidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((value) => !value);
  }
}
