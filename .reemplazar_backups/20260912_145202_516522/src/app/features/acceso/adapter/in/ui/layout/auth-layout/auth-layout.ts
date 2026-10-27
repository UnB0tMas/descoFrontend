import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faLeaf,
  faLocationDot,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  readonly brandIcon = faLeaf;
  readonly locationIcon = faLocationDot;
  readonly shieldIcon = faShieldHalved;
}
