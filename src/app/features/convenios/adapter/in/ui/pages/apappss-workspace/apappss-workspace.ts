import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSeedling, faMapLocationDot, faUsers } from '@fortawesome/free-solid-svg-icons';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { ProductoresListPage } from '../../../../../../gestion-tecnica/productores/adapter/in/ui/pages/productores-list/productores-list';
import { ExpedienteE1UseCase } from '../../../../../../gestion-tecnica/predios/expediente/application/expediente-e1.use-case';
import { provideExpedienteE1 } from '../../../../../../gestion-tecnica/predios/expediente/expediente-e1.providers';
import { ConvenioE1 } from '../../../../../../gestion-tecnica/predios/expediente/domain/expediente-e1.model';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';

type Section = 'socios';

@Component({
  selector: 'app-apappss-workspace', standalone: true,
  imports: [FormsModule, FaIconComponent, PageHeaderComponent,
    ProductoresListPage],
  providers: [...provideExpedienteE1()],
  templateUrl: './apappss-workspace.html', styleUrls: ['../../../../../../gestion-tecnica/gestion-productiva/gestion-productiva.css', './apappss-workspace.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApappssWorkspacePage implements OnInit {
  private readonly permissions = inject(PermissionService);
  private readonly uot = inject(UotContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly expediente = inject(ExpedienteE1UseCase);
  readonly convenios = signal<ConvenioE1[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly icon = faSeedling;
  readonly sociosIcon = faUsers;
  readonly prediosIcon = faMapLocationDot;
  convenioId = 0;
  readonly showSocios = computed(() => this.permissions.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']));
  readonly showPredios = computed(() => this.permissions.hasAll(['APAPPSS_PREDIOS_LISTAR', 'PREDIOS_LISTAR']));
  readonly section = signal<Section>('socios');
  readonly current = computed<Section | null>(() => {
    const selected = this.section();
    if (selected === 'socios' && this.showSocios()) return 'socios';
    return this.showSocios() ? 'socios' : null;
  });
  ngOnInit(): void {
    
    this.convenioId = Number(this.route.snapshot.queryParamMap.get('convenioId')) || 0;
    this.cargarConvenios();
  }
  cargarConvenios(): void {
    const id = this.uot.selectedId();
    if (!id) { this.error.set('Seleccione una UOT para consultar convenios.'); return; }
    this.loading.set(true); this.error.set(null);
    this.expediente.convenios(id).subscribe({
      next: convenios => {
        this.convenios.set(convenios);
        this.convenioId = convenios.some(c => c.id === this.convenioId) ? this.convenioId : convenios[0]?.id ?? 0;
        this.loading.set(false);
      },
      error: e => { this.error.set(mapOpenApiError(e).message); this.loading.set(false); },
    });
  }
  select(section: Section): void {
    if (this.showSocios())
      this.section.set(section);
  }
  cambiarConvenio(id: number): void { this.convenioId = Number(id) || 0; }
}
