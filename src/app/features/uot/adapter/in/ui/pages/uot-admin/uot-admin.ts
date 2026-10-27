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
  readonly errorMessage = signal<string | null>(null);
  readonly allUnits = signal<readonly UotUnit[]>([]);
  readonly users = signal<readonly AdminSelectOption[]>([]);
  readonly roles = signal<readonly AdminSelectOption[]>([]);
  readonly showInactive = signal(false);

  readonly units = computed<readonly UotUnit[]>(() =>
    this.showInactive()
      ? this.allUnits().filter((item) => !item.estado)
      : this.allUnits().filter((item) => item.estado),
  );

  readonly activeUnits = computed<readonly UotUnit[]>(() =>
    this.allUnits().filter((item) => item.estado),
  );

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
