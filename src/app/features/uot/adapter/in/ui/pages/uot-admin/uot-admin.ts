import { ListViewSwitchComponent, ListViewMode } from '../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { RecordCardComponent } from '../../../../../../../shared/data-display/record-card/record-card';
import { DataTableComponent } from '../../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../../shared/data-display/data-table/data-table.types';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faKey,
  faPen,
  faPlus,
  faPowerOff,
  faRotate,
  faSitemap,
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';

import { PermissionDirective } from '../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PaginatorComponent } from '../../../../../../../shared/data-display/paginator/paginator';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { ListarRolesUseCase } from '../../../../../../administracion/roles-permisos/application/use-case/listar-roles.use-case';
import { ListarUsuariosUseCase } from '../../../../../../administracion/usuarios/application/use-case/listar-usuarios.use-case';
import { loadAllAdminPages } from '../../../../../../administracion/shared/admin-reference.util';
import { AdminSelectOption } from '../../../../../../administracion/shared/admin-modal.types';
import { UotApiService } from '../../../../out/http/uot-api.service';
import { UotUnit } from '../../../../../domain/uot.model';
import { UotDeactivationFormComponent } from '../uot-deactivation-form/uot-deactivation-form';
import {
  UotFormComponent,
  UotFormOptions,
} from '../uot-form/uot-form';

@Component({
  selector: 'app-uot-admin-page',
  standalone: true,
  imports: [
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    DataTableComponent,
    PaginatorComponent,
    ListViewSwitchComponent,
    RecordCardComponent,
    UotFormComponent,
    UotDeactivationFormComponent,
  ],
  templateUrl: './uot-admin.html',
  styleUrl: './uot-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UotAdminPage implements OnInit {
  @ViewChild(UotFormComponent) private form!: UotFormComponent;
  @ViewChild(UotDeactivationFormComponent)
  private deactivationForm!: UotDeactivationFormComponent;

  private readonly api = inject(UotApiService);
  private readonly listUsers = inject(ListarUsuariosUseCase);
  private readonly listRoles = inject(ListarRolesUseCase);

  readonly loading = signal(true);
  readonly referencesLoading = signal(true);
  readonly referencesError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly allUnits = signal<readonly UotUnit[]>([]);
  readonly users = signal<readonly AdminSelectOption[]>([]);
  readonly roles = signal<readonly AdminSelectOption[]>([]);
  readonly showInactive = signal(false);
  readonly search = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  readonly units = computed<readonly UotUnit[]>(() =>
    this.showInactive()
      ? this.allUnits().filter((item) => !item.estado)
      : this.allUnits().filter((item) => item.estado),
  );

  readonly filteredUnits = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('es');
    return this.units().filter(unit => !term ||
      [unit.nombre, unit.codigo, this.parentName(unit)].some(value => value.toLocaleLowerCase('es').includes(term)));
  });
  readonly totalPages = computed(() => Math.ceil(this.filteredUnits().length / this.pageSize()));
  readonly visiblePage = computed(() => Math.max(1, Math.min(this.currentPage(), this.totalPages() || 1)));
  readonly visibleUnits = computed(() => this.filteredUnits().slice((this.visiblePage() - 1) * this.pageSize(), this.visiblePage() * this.pageSize()));
  setSearch(term: string): void { this.search.set(term); this.currentPage.set(1); }
  changePage(page: number): void { this.currentPage.set(page); }
  changeSize(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }

  readonly activeUnits = computed<readonly UotUnit[]>(() =>
    this.allUnits().filter((item) => item.estado),
  );
  readonly uotUnitsColumns: readonly DataTableColumn<UotUnit>[] = [
    { key: 'uot', label: 'UOT' },
    { key: 'superior', label: 'Superior' },
    { key: 'asignacion', label: 'Asignación', align: 'center' },
    { key: 'estado', label: 'Estado', align: 'center' },
    { key: 'acciones', label: 'Acciones', align: 'right' }
  ];
  readonly viewMode = signal<ListViewMode>('table');



  readonly pageIcon = faSitemap;
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly accessIcon = faKey;
  readonly deactivateIcon = faPowerOff;
  readonly refreshIcon = faRotate;

  ngOnInit(): void {
    this.load();
    this.loadReferences();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .list(this.showInactive())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.allUnits.set(items),
        error: (error) =>
          this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  loadReferences(): void {
    this.referencesLoading.set(true);
    this.referencesError.set(null);

    forkJoin({
      users: loadAllAdminPages((page, size) =>
        this.listUsers.execute({ page, size }),
      ),
      roles: loadAllAdminPages((page, size) =>
        this.listRoles.execute(page, size),
      ),
    })
      .pipe(finalize(() => this.referencesLoading.set(false)))
      .subscribe({
        next: ({ users, roles }) => {
          this.users.set(
            users.map((item) => ({
              value: item.usuarioId,
              label:
                item.empleado?.trim() ||
                item.nombreUsuario ||
                `Usuario ${item.usuarioId}`,
              description: item.nombreUsuario,
            })),
          );
          this.roles.set(
            roles
              .filter((item) => item.estado)
              .map((item) => ({
                value: item.rolId,
                label: item.nombre,
                description: item.codigo,
              })),
          );
        },
        error: () => {
          this.users.set([]);
          this.roles.set([]);
          this.referencesError.set('No se pudieron cargar los usuarios y roles.');
        },
      });
  }

  async create(): Promise<void> {
    const result = await this.form.openCreate(this.options());
    if (result.saved) this.load();
  }

  async edit(unit: UotUnit): Promise<void> {
    const result = await this.form.openEdit(unit, this.options());
    if (result.saved) this.load();
  }

  async access(unit: UotUnit): Promise<void> {
    if (this.users().length === 0 || this.roles().length === 0) {
      this.referencesError.set('No hay usuarios o roles disponibles para asignar.');
      return;
    }
    const result = await this.form.openAccess(unit, this.options());
    if (result.saved) this.loadReferences();
  }

  async deactivate(unit: UotUnit): Promise<void> {
    if (!unit.estado || unit.esRaiz) return;
    const result = await this.deactivationForm.open(
      unit,
      this.activeUnits(),
    );
    if (result.saved) {
      this.showInactive.set(true);
      this.load();
    }
  }

  toggleInactive(value: boolean): void {
    this.showInactive.set(value);
    this.currentPage.set(1);
    this.load();
  }

  parentName(unit: UotUnit): string {
    if (!unit.uotPadreId) return 'Raíz';
    return (
      this.allUnits().find((item) => item.uotId === unit.uotPadreId)?.nombre ??
      `UOT #${unit.uotPadreId}`
    );
  }

  private options(): UotFormOptions {
    return {
      units: this.activeUnits(),
      users: this.users(),
      roles: this.roles(),
    };
  }
}
