import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { ProductoresListPage } from '../../../../../../gestion-tecnica/productores/adapter/in/ui/pages/productores-list/productores-list';
import { PrediosListPage } from '../../../../../../gestion-tecnica/predios/adapter/in/ui/pages/predios-list/predios-list';

type Section = 'socios' | 'predios';

@Component({
  selector: 'app-apappss-workspace',
  standalone: true,
  imports: [ProductoresListPage, PrediosListPage],
  templateUrl: './apappss-workspace.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApappssWorkspacePage {
  private readonly permissions = inject(PermissionService);
  readonly showSocios = computed(() => this.permissions.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']));
  readonly showPredios = computed(() => this.permissions.hasAll(['APAPPSS_PREDIOS_LISTAR', 'PREDIOS_LISTAR']));
  readonly section = signal<Section>(this.permissions.hasAll(['APAPPSS_SOCIOS_LISTAR', 'PRODUCTORES_LISTAR']) ? 'socios' : 'predios');
  readonly current = computed(() => this.section() === 'socios' && this.showSocios()
      ? 'socios'
      : this.showPredios() ? 'predios' : this.showSocios() ? 'socios' : null);

  select(section: Section): void {
    if (section === 'socios' ? this.showSocios() : this.showPredios()) this.section.set(section);
  }
}
