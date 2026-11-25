import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { concatMap, finalize, forkJoin, from, toArray } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faHandshake, faRotate, faSliders, faShieldHalved,
  faUsers, faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { RecordCardComponent } from '../../../../../../../shared/data-display/record-card/record-card';
import { DataTableComponent } from '../../../../../../../shared/data-display/data-table/data-table';
import { DataTableColumn } from '../../../../../../../shared/data-display/data-table/data-table.types';
import { ListViewMode, ListViewSwitchComponent } from '../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { PaginatorComponent } from '../../../../../../../shared/data-display/paginator/paginator';
import { ModalShellComponent } from '../../../../../../../shared/feedback/modal-shell/modal-shell';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { ConvenioModuloUsuarioResponse } from '../../../../../../../infrastructure/openapi/generated/model/convenioModuloUsuarioResponse';
import { ConvenioModuloPermisoResponse } from '../../../../../../../infrastructure/openapi/generated/model/convenioModuloPermisoResponse';
import { ConvenioDetalleResponse } from '../../../../../../../infrastructure/openapi/generated/model/convenioDetalleResponse';
import { ConveniosApiService } from '../../../../out/http/convenios-api.service';

type AdminTab = 'convenios' | 'usuarios';

@Component({
  selector: 'app-convenios-admin',
  standalone: true,
  imports: [
    FaIconComponent, PageHeaderComponent, RecordCardComponent, DataTableComponent,
    ListViewSwitchComponent, PaginatorComponent, ModalShellComponent, LoadingStateComponent,
    ErrorStateComponent, EmptyStateComponent,
  ],
  styleUrl: './convenios-admin.css',
  templateUrl: './convenios-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConveniosAdminPage implements OnInit {
  @ViewChild('modulesModal', { static: true }) private modulesModal!: ModalShellComponent;
  @ViewChild('permissionsModal', { static: true }) private permissionsModal!: ModalShellComponent;

  private readonly api = inject(ConveniosApiService);
  private readonly permission = inject(PermissionService);
  private readonly toast = inject(ToastService);

  readonly pageIcon = faHandshake;
  readonly refreshIcon = faRotate;
  readonly editIcon = faPenToSquare;
  readonly moduleIcon = faSliders;
  readonly userIcon = faUsers;
  readonly accessIcon = faShieldHalved;

  readonly editable = this.permission.has('ORGANIZACIONES_EDITAR');
  readonly canViewUsers = this.permission.has('USUARIOS_LISTAR');
  readonly canEditUsers = this.permission.has('USUARIOS_EDITAR');
  readonly moduleCode = 'COMERCIALIZACION_ASOCIATIVA';

  readonly tab = signal<AdminTab>('convenios');
  readonly viewMode = signal<ListViewMode>('cards');
  readonly search = signal('');
  readonly employeeSearch = signal('');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly userPage = signal(1);
  readonly userSize = signal(10);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly convenios = signal<readonly ConvenioDetalleResponse[]>([]);
  readonly filteredConvenios = computed(() => {
    const term = this.search().trim().toLocaleLowerCase('es');
    return this.convenios().filter(item => !term ||
      [item.organizacion ?? '', item.tipoVinculo ?? '', item.numeroConvenio ?? '']
        .some(value => value.toLocaleLowerCase('es').includes(term)));
  });
  readonly pageConvenios = computed(() => this.filteredConvenios().slice(
    (this.page() - 1) * this.size(), this.page() * this.size()));
  readonly convenioColumns: readonly DataTableColumn<ConvenioDetalleResponse>[] = [
    { key: 'organizacion', label: 'Organización' },
    { key: 'numeroConvenio', label: 'Convenio' },
    { key: 'tipoVinculo', label: 'Vínculo' },
    { key: 'modulos', label: 'Módulos' },
    { key: 'acciones', label: 'Acciones', align: 'right' },
  ];

  readonly loadingUsers = signal(false);
  readonly userError = signal<string | null>(null);
  readonly users = signal<readonly ConvenioModuloUsuarioResponse[]>([]);
  readonly catalog = signal<readonly ConvenioModuloPermisoResponse[]>([]);
  readonly filteredUsers = computed(() => {
    const term = this.employeeSearch().trim().toLocaleLowerCase('es');
    return this.users().filter(item => !term ||
      [item.empleado ?? '', item.usuario ?? '']
        .some(value => value.toLocaleLowerCase('es').includes(term)));
  });
  readonly pageUsers = computed(() => this.filteredUsers().slice(
    (this.userPage() - 1) * this.userSize(), this.userPage() * this.userSize()));
  readonly userColumns: readonly DataTableColumn<ConvenioModuloUsuarioResponse>[] = [
    { key: 'empleado', label: 'Empleado' },
    { key: 'usuario', label: 'Usuario' },
    { key: 'permisos', label: 'Permisos' },
    { key: 'acciones', label: 'Acciones', align: 'right' },
  ];

  readonly selectedConvenio = signal<ConvenioDetalleResponse | null>(null);
  readonly moduleDraft = signal<readonly string[]>([]);
  readonly savingModules = signal(false);
  readonly moduleError = signal<string | null>(null);

  readonly selectedUser = signal<ConvenioModuloUsuarioResponse | null>(null);
  readonly selectedPermissions = signal<readonly string[]>([]);
  readonly savingUser = signal(false);
  readonly permissionError = signal<string | null>(null);
  readonly apappssEnabled = computed(() => this.convenios().some(c =>
    (c.modulos ?? []).some(m => m.codigo === this.moduleCode && m.habilitado)));

  ngOnInit(): void {
    this.reload();
    if (this.canViewUsers) this.loadUsers();
  }

  setTab(tab: AdminTab): void { this.tab.set(tab); }
  setSearch(value: string): void { this.search.set(value); this.page.set(1); }
  setEmployeeSearch(value: string): void { this.employeeSearch.set(value); this.userPage.set(1); }
  setSize(size: number): void { this.size.set(size); this.page.set(1); }
  setUserSize(size: number): void { this.userSize.set(size); this.userPage.set(1); }
  moduleCount(convenio: ConvenioDetalleResponse): number {
    return (convenio.modulos ?? []).filter(m => m.habilitado).length;
  }

  reload(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.convenios.set(result);
        this.page.set(1);
      },
      error: () => this.error.set('No se pudieron cargar los convenios.'),
    });
  }

  loadUsers(): void {
    if (!this.canViewUsers || this.loadingUsers()) return;
    this.loadingUsers.set(true);
    this.userError.set(null);
    forkJoin({
      users: this.api.users(this.moduleCode),
      catalog: this.api.permissions(this.moduleCode),
    }).pipe(finalize(() => this.loadingUsers.set(false))).subscribe({
      next: ({ users, catalog }) => {
        this.users.set(users);
        this.catalog.set(catalog);
        this.userPage.set(1);
      },
      error: () => this.userError.set('No se pudieron cargar los empleados.'),
    });
  }

  openModules(convenio: ConvenioDetalleResponse): void {
    this.selectedConvenio.set(convenio);
    this.moduleDraft.set((convenio.modulos ?? []).filter(m => m.habilitado && m.codigo).map(m => m.codigo!));
    this.moduleError.set(null);
    this.modulesModal.open();
  }

  isModuleEnabled(code: string): boolean { return this.moduleDraft().includes(code); }

  toggleModule(code: string, enabled: boolean): void {
    if (!this.editable || this.savingModules()) return;
    const draft = new Set(this.moduleDraft());
    if (enabled) draft.add(code); else draft.delete(code);
    this.moduleDraft.set([...draft]);
  }

  saveModules(): void {
    const convenio = this.selectedConvenio();
    if (!convenio?.convenioId || !this.editable || this.savingModules()) return;
    const modified = (convenio.modulos ?? []).filter(m => m.codigo &&
      Boolean(m.habilitado) !== this.isModuleEnabled(m.codigo));
    if (modified.length === 0) { this.modulesModal.close(); return; }
    this.savingModules.set(true);
    this.moduleError.set(null);
    // API existente: cada módulo se actualiza secuencialmente, sin peticiones duplicadas.
    from(modified).pipe(
      concatMap(m => this.api.configure(convenio.convenioId!, m.codigo!, this.isModuleEnabled(m.codigo!))),
      toArray(),
      finalize(() => this.savingModules.set(false)),
    ).subscribe({
      next: () => {
        this.modulesModal.close(true);
        this.toast.success('Módulos actualizados');
        this.reload();
      },
      error: () => {
        this.moduleError.set('No se pudieron guardar todos los cambios. Intenta nuevamente.');
        this.reload();
      },
    });
  }

  openPermissions(user: ConvenioModuloUsuarioResponse): void {
    this.selectedUser.set(user);
    this.selectedPermissions.set([...(user.permisos ?? [])]);
    this.permissionError.set(null);
    this.permissionsModal.open();
  }

  isChecked(code: string): boolean { return this.selectedPermissions().includes(code); }

  togglePermission(code: string, enabled: boolean): void {
    if (!this.canEditUsers || !this.apappssEnabled() || this.savingUser()) return;
    const selected = new Set(this.selectedPermissions());
    if (enabled) selected.add(code); else selected.delete(code);
    this.selectedPermissions.set([...selected]);
  }

  saveUser(): void {
    const user = this.selectedUser();
    if (!this.canEditUsers || !this.apappssEnabled() || !user?.usuarioId || this.savingUser()) return;
    this.savingUser.set(true);
    this.permissionError.set(null);
    this.api.assignUser(this.moduleCode, user.usuarioId, [...this.selectedPermissions()])
      .pipe(finalize(() => this.savingUser.set(false)))
      .subscribe({
        next: () => {
          this.permissionsModal.close(true);
          this.toast.success('Permisos actualizados');
          this.loadUsers();
        },
        error: () => this.permissionError.set('No se pudieron guardar los permisos.'),
      });
  }
}
