import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faFileImage,
  faImage,
  faRotate,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../feedback/toast-center/toast.service';
import { LocalDocumentApiService } from '../local-document-api.service';

interface FilePreview {
  id: number;
  url: string | null;
}

@Component({
  selector: 'app-local-file-panel',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './local-file-panel.html',
  styleUrl: './local-file-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalFilePanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) uotId = 0;
  @Input({ required: true }) linkType = 'NINGUNO';
  @Input({ required: true }) linkId = 0;
  @Input() fileIds: readonly number[] = [];
  @Input() title = 'Imágenes y documentos';
  @Input() accept = 'image/*';
  @Input() category = 'FOTOGRAFIA';
  @Input() forcePrincipal = false;
  @Input() canUpload = true;

  @Output() changed = new EventEmitter<void>();

  private readonly api = inject(LocalDocumentApiService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly previews = signal<readonly FilePreview[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly imageIcon = faImage;
  readonly fileIcon = faFileImage;
  readonly uploadIcon = faUpload;
  readonly viewIcon = faArrowUpRightFromSquare;
  readonly refreshIcon = faRotate;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fileIds']) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.revokeAll();
  }

  load(): void {
    this.revokeAll();
    const ids = [...new Set(this.fileIds.filter((id) => id > 0))];

    if (ids.length === 0) {
      this.previews.set([]);
      this.errorMessage.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin(
      ids.map((id) =>
        this.api.content(id).pipe(
          map((blob) => ({
            id,
            url: URL.createObjectURL(blob),
          }) satisfies FilePreview),
          catchError(() => of({ id, url: null } satisfies FilePreview)),
        ),
      ),
    )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => this.previews.set(items),
        error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
      });
  }

  upload(input: HTMLInputElement): void {
    const file = input.files?.item(0) ?? null;
    input.value = '';

    if (!file || this.uploading() || !this.canUpload) return;

    if (file.size <= 0) {
      this.toast.error('Archivo vacío', 'Selecciona un archivo con contenido.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.toast.error(
        'Archivo demasiado grande',
        'El archivo no puede superar 15 MB.',
      );
      return;
    }

    if (
      this.accept.includes('image') &&
      !file.type.toLowerCase().startsWith('image/')
    ) {
      this.toast.error(
        'Formato no permitido',
        'Selecciona una imagen válida.',
      );
      return;
    }

    if (this.uotId <= 0 || this.linkId <= 0) {
      this.toast.error(
        'Contexto incompleto',
        'No se pudo determinar la UOT o el registro vinculado.',
      );
      return;
    }

    this.uploading.set(true);

    this.api
      .upload({
        uotId: this.uotId,
        file,
        category: this.category,
        linkType: this.linkType,
        linkId: this.linkId,
        principal: this.forcePrincipal || this.fileIds.length === 0,
      })
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Archivo guardado');
          this.changed.emit();
        },
        error: (error) =>
          this.toast.error(
            'No se pudo guardar el archivo',
            mapOpenApiError(error).message,
          ),
      });
  }

  open(preview: FilePreview): void {
    if (!preview.url) return;
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  }

  private revokeAll(): void {
    for (const item of this.previews()) {
      if (item.url) URL.revokeObjectURL(item.url);
    }
    this.previews.set([]);
  }
}
