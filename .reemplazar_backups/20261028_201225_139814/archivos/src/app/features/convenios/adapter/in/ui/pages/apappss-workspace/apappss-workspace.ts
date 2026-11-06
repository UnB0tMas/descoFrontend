import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { ProductoresListPage } from '../../../../../../gestion-tecnica/productores/adapter/in/ui/pages/productores-list/productores-list';
import { PrediosListPage } from '../../../../../../gestion-tecnica/predios/adapter/in/ui/pages/predios-list/predios-list';
import { ExpedienteE1UseCase } from '../../../../../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import { provideExpedienteE1 } from '../../../../../../gestion-tecnica/predios/expediente/expediente-e1.providers';
import { ConvenioE1 } from '../../../../../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';

type Section = 'socios' | 'predios';

@Component({
  selector: 'app-apappss-workspace', standalone: true,
  imports: [FormsModule, RouterLink, ProductoresListPage, PrediosListPage],
  providers: [...provideExpedienteE1()],
  templateUrl: './apappss-workspace.html', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApappssWorkspacePage implements OnInit {
  private readonly permissions = inject(PermissionService);
  private readonly uot = inject(UotContextStore);
  private readonly expediente = inject(ExpedienteE1UseCase);
  readonly convenios = signal<ConvenioE1[]>([]);
  readonly error = signal<string | null>(null);
  convenioId = 0;
  readonly showSocios = computed(() => this.permissions.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']));
  readonly showPredios = computed(() => this.permissions.hasAll(['APAPPSS_PREDIOS_LISTAR', 'PREDIOS_LISTAR']));
  readonly section = signal<Section>(this.permissions.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']) ? 'socios' : 'predios');
  readonly current = computed(() => this.section() === 'socios' && this.showSocios()
    ? 'socios' : this.showPredios() ? 'predios' : this.showSocios() ? 'socios' : null);

  ngOnInit(): void { this.cargarConvenios(); }
  cargarConvenios(): void {
    const id = this.uot.selectedId();
    if (!id) { this.error.set('Seleccione la unidad territorial.'); return; }
    this.expediente.convenios(id).subscribe({
      next: c => { this.convenios.set(c); this.convenioId = c.find(x => x.id === this.convenioId)?.id ?? c[0]?.id ?? 0; },
      error: e => this.error.set(mapOpenApiError(e).message),
    });
  }
  select(section: Section): void {
    if (section === 'socios' ? this.showSocios() : this.showPredios()) this.section.set(section);
  }
}
