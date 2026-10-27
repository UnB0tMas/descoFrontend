import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLeaf, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

import { ThemeService } from '../../../../../../../core/ui/theme.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  readonly theme = inject(ThemeService);
  readonly brandIcon = faLeaf;
  readonly lightIcon = faSun;
  readonly darkIcon = faMoon;
}
