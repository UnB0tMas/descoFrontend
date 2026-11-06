import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSeedling, faUsers } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { ExpedienteE1UseCase } from '../../../../../../predios/expediente/application/expediente-e1.use-case';
import { PersonaE1, PredioE1 } from '../../../../../../predios/expediente/domain/expediente-e1.model';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';

@Component({
  selector: 'app-productores-tradicionales',
  standalone: true,
  imports: [FormsModule, RouterLink, FaIconComponent, PermissionDirective, EmptyStateComponent,
    ErrorStateComponent, LoadingStateComponent, PageHeaderComponent],
  templateUrl: './productores-tradicionales.html',
  styleUrl: './productores-tradicionales.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoresTradicionalesPage {
  private readonly expediente = inject(ExpedienteE1UseCase);
  private readonly uot = inject(UotContextStore);
  readonly icon = faUsers;
  readonly predioIcon = faSeedling;
  readonly loading = signal(false);
  readonly loadingProperties = signal(false);
  readonly error = signal<string | null>(null);
  readonly people = signal<PersonaE1[]>([]);
  readonly selected = signal<PersonaE1 | null>(null);
  readonly properties = signal<PredioE1[]>([]);
  search = '';

  find(): void {
    const uotId = this.uot.selectedId();
    const value = this.search.trim();
    if (!uotId) {
      this.error.set('Seleccione primero la UOT de trabajo.');
      return;
    }
    if (value.length < 3) {
      this.error.set('Ingrese al menos tres caracteres del documento o nombre.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(null);
    this.properties.set([]);
    this.expediente.buscarPersonas(uotId, value)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: people => {
          this.people.set(people);
          const exact = people.find(person => person.numeroDocumento === value);
          if (exact) this.select(exact);
        },
        error: error => this.error.set(mapOpenApiError(error).message),
      });
  }

  select(person: PersonaE1): void {
    const uotId = this.uot.selectedId();
    if (!uotId) return;
    this.selected.set(person);
    this.loadingProperties.set(true);
    this.error.set(null);
    this.expediente.buscarPredios(uotId, person.numeroDocumento)
      .pipe(finalize(() => this.loadingProperties.set(false)))
      .subscribe({
        next: properties => this.properties.set(properties),
        error: error => this.error.set(mapOpenApiError(error).message),
      });
  }
}
