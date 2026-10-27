import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ConvenioModuloPermisoResponse } from '../../../../../../../infrastructure/openapi/generated/model/convenioModuloPermisoResponse';
import { ConvenioModuloUsuarioResponse } from '../../../../../../../infrastructure/openapi/generated/model/convenioModuloUsuarioResponse';
import { ConvenioDetalleResponse } from '../../../../../../../infrastructure/openapi/generated/model/convenioDetalleResponse';
import { ConveniosApiService } from '../../../../out/http/convenios-api.service';

@Component({
  selector: 'app-convenios-admin',
  standalone: true,
  templateUrl: './convenios-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConveniosAdminPage implements OnInit {
  private readonly api = inject(ConveniosApiService);
  private readonly permission = inject(PermissionService);
  readonly convenios = signal<readonly ConvenioDetalleResponse[]>([]);
  readonly loading = signal(false);
  readonly saving = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly editable = this.permission.has('ORGANIZACIONES_EDITAR');
  readonly canViewUsers = this.permission.has('USUARIOS_LISTAR');
  readonly canEditUsers = this.permission.has('USUARIOS_EDITAR');
  readonly moduleCode = 'COMERCIALIZACION_ASOCIATIVA';
  readonly users = signal<readonly ConvenioModuloUsuarioResponse[]>([]);
  readonly catalog = signal<readonly ConvenioModuloPermisoResponse[]>([]);
  readonly selectedUserId = signal<number | null>(null);
  readonly selectedPermissions = signal<readonly string[]>([]);
  readonly loadingUsers = signal(false);
  readonly savingUser = signal(false);
  readonly userError = signal<string | null>(null);
  readonly userSuccess = signal<string | null>(null);
  readonly apappssEnabled = () => this.convenios().some((c) =>
    (c.modulos ?? []).some((m) => m.codigo === this.moduleCode && m.habilitado));

  selectUser(raw: string): void {
    const id = Number(raw);
    const user = this.users().find((u) => u.usuarioId === id);
    this.selectedUserId.set(user?.usuarioId ?? null);
    this.selectedPermissions.set([...(user?.permisos ?? [])]);
    this.userSuccess.set(null);
  }

  isChecked(code: string): boolean { return this.selectedPermissions().includes(code); }

  togglePermission(code: string, enabled: boolean): void {
    if (!this.canEditUsers) return;
    const selected = new Set(this.selectedPermissions());
    if (enabled) selected.add(code); else selected.delete(code);
    this.selectedPermissions.set([...selected]);
  }

  loadUsers(): void {
    if (!this.canViewUsers) return;
    this.loadingUsers.set(true);
    this.userError.set(null);
    forkJoin({
      users: this.api.users(this.moduleCode),
      catalog: this.api.permissions(this.moduleCode),
    }).pipe(finalize(() => this.loadingUsers.set(false))).subscribe({
      next: ({ users, catalog }) => {
        this.users.set(users);
        this.catalog.set(catalog);
        if (this.selectedUserId() !== null) this.selectUser(String(this.selectedUserId()));
      },
      error: (err) => this.userError.set(mapOpenApiError(err).message),
    });
  }

  saveUser(): void {
    const userId = this.selectedUserId();
    if (!this.canEditUsers || !this.apappssEnabled() || userId === null || this.savingUser()) return;
    this.savingUser.set(true);
    this.userError.set(null);
    this.userSuccess.set(null);
    this.api.assignUser(this.moduleCode, userId, [...this.selectedPermissions()])
      .pipe(finalize(() => this.savingUser.set(false)))
      .subscribe({
        next: () => { this.userSuccess.set('Permisos actualizados para esta UOT.'); this.loadUsers(); },
        error: (err) => this.userError.set(mapOpenApiError(err).message),
      });
  }

  ngOnInit(): void { this.reload(); this.loadUsers(); }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (result) => this.convenios.set(result),
      error: (err) => this.error.set(mapOpenApiError(err).message),
    });
  }

  change(id: number, code: string, checked: boolean): void {
    if (!this.editable || this.saving() !== null) return;
    this.saving.set(`${id}:${code}`);
    this.api.configure(id, code, checked).pipe(finalize(() => this.saving.set(null))).subscribe({
      next: () => this.reload(),
      error: (err) => { this.error.set(mapOpenApiError(err).message); this.reload(); },
    });
  }
}
