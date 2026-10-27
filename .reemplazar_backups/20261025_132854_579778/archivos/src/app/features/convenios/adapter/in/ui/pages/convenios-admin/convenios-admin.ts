import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
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

  ngOnInit(): void { this.reload(); }

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
