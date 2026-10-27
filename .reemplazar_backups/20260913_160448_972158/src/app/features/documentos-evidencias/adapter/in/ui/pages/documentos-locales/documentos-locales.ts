import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faFileArrowUp,
  faFolderOpen,
  faRotate,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';

import { PermissionDirective } from '../../../../../../../core/access/permission.directive';
import { LocalDocumentFileResponse } from '../../../../../../../infrastructure/openapi/generated/model/localDocumentFileResponse';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { LocalDocumentApiService } from '../../../../../../../shared/files/local-document-api.service';
import { AppAlertService } from '../../../../../../../shared/feedback/app-alert/app-alert.service';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';

@Component({
  selector: 'app-documentos-locales-page',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FaIconComponent,
    PermissionDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
  ],
  templateUrl: './documentos-locales.html',
  styleUrl: './documentos-locales.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosLocalesPage implements OnInit {
  private readonly api = inject(LocalDocumentApiService);
  private readonly alert = inject(AppAlertService);
  private readonly toast = inject(ToastService);
  readonly uot = inject(UotContextStore);

  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<readonly LocalDocumentFileResponse[]>([]);
  readonly unitFilter = signal<number | null>(null);
  readonly category = signal('DOCUMENTO');
  readonly description = signal('');

  readonly pageIcon = faFolderOpen;
  readonly uploadIcon = faFileArrowUp;
  readonly viewIcon = faArrowUpRightFromSquare;
  readonly refreshIcon = faRotate;
  readonly retireIcon = faTrashCan;

  ngOnInit(): void {
    this.unitFilter.set(this.uot.selectedId());
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const unitId =
      this.uot.modo() === 'GENERAL'
        ? this.unitFilter() ?? undefined
        : this.uot.selectedId() ?? undefined;

    this.api
      .list(unitId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  onUnitChange(value: string): void {
    const id = Number(value);
    this.unitFilter.set(Number.isFinite(id) && id > 0 ? id : null);
    this.load();
  }

  upload(input: HTMLInputElement): void {
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (!file || this.uploading()) return;

    const uotId =
      this.unitFilter() ??
      this.uot.selectedId() ??
      this.uot.memberships()[0]?.uotId ??
      0;

    if (uotId <= 0) {
      this.toast.error(
        'Selecciona una UOT',
        'La carga de documentos requiere una UOT específica.',
      );
      return;
    }

    if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
      this.toast.error(
        'Archivo no permitido',
        'El archivo debe tener contenido y no superar 25 MB.',
      );
      return;
    }

    this.uploading.set(true);
    this.api
      .upload({
        uotId,
        file,
        category: this.category().trim().toUpperCase() || 'DOCUMENTO',
        description: this.description().trim() || undefined,
        linkType: 'NINGUNO',
        principal: false,
      })
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: () => {
          this.description.set('');
          this.toast.success('Documento guardado');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo guardar el documento',
            mapOpenApiError(error).message,
          ),
      });
  }

  open(item: LocalDocumentFileResponse): void {
    if (!item.archivoId) return;

    this.api.content(item.archivoId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (error) =>
        this.toast.error(
          'No se pudo abrir el archivo',
          mapOpenApiError(error).message,
        ),
    });
  }

  async retire(item: LocalDocumentFileResponse): Promise<void> {
    if (!item.archivoId) return;

    const answer = await this.alert.question(
      'Retirar documento',
      `¿Deseas retirar “${item.nombreOriginal || 'este archivo'}”? El archivo dejará de estar disponible.`,
      'Retirar',
      'Cancelar',
    );

    if (!answer.confirmed) return;

    this.api
      .retire(
        item.archivoId,
        'Retiro solicitado desde el módulo de documentos locales.',
      )
      .subscribe({
        next: () => {
          this.toast.success('Documento retirado');
          this.load();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo retirar el documento',
            mapOpenApiError(error).message,
          ),
      });
  }

  sizeLabel(bytes?: number): string {
    const value = bytes ?? 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
}
