import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronRight,
  faHouse,
} from '@fortawesome/free-solid-svg-icons';
import { filter, startWith } from 'rxjs';

import { BreadcrumbService } from '../../../core/navigation/breadcrumb.service';
import { BreadcrumbItem } from '../../../core/navigation/navigation-item.model';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, FaIconComponent],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly destroyRef = inject(DestroyRef);

  /** Si no se entregan segmentos, conserva la navegación automática del layout. */
  readonly segments = input<readonly BreadcrumbItem[] | null>(null);
  readonly variant = input<'default' | 'compact'>('default');
  readonly showHome = input(true);
  readonly items = signal<readonly BreadcrumbItem[]>([]);
  readonly homeIcon = faHouse;
  readonly separatorIcon = faChevronRight;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.items.set(
          this.breadcrumbService.build(this.router.routerState.snapshot.root),
        );
      });
  }
}
