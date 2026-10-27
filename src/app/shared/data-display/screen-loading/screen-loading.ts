import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCircleNotch,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

import { ScreenLoadingService } from './screen-loading.service';

@Component({
  selector: 'app-screen-loading',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './screen-loading.html',
  styleUrl: './screen-loading.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScreenLoadingComponent {
  readonly loadingService = inject(ScreenLoadingService);
  readonly spinnerIcon = faCircleNotch;
  readonly shieldIcon = faShieldHalved;
}
