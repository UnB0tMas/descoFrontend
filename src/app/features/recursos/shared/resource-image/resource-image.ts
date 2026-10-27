import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';

import { LocalDocumentApiService } from '../../../../shared/files/local-document-api.service';

export type ResourceImageVariant = 'thumb' | 'card' | 'hero';

@Component({
  selector: 'app-resource-image',
  standalone: true,
  templateUrl: './resource-image.html',
  styleUrl: './resource-image.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceImageComponent implements OnChanges, OnDestroy {
  @Input() fileId: number | null | undefined = null;
  @Input() imageUrl: string | null | undefined = null;
  @Input() alt = 'Imagen del recurso';
  @Input() variant: ResourceImageVariant = 'thumb';

  private readonly files = inject(LocalDocumentApiService);
  private objectUrl: string | null = null;

  readonly src = signal<string | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fileId'] || changes['imageUrl']) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.clearObjectUrl();
  }

  onImageError(): void {
    this.failed.set(true);
    this.src.set(null);
  }

  private load(): void {
    this.clearObjectUrl();
    this.src.set(null);
    this.failed.set(false);

    const id = Number(this.fileId ?? 0);
    if (id > 0) {
      this.loading.set(true);
      this.files
        .content(id)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (blob) => {
            this.objectUrl = URL.createObjectURL(blob);
            this.src.set(this.objectUrl);
          },
          error: () => {
            this.failed.set(true);
            this.src.set(null);
          },
        });
      return;
    }

    const url = this.imageUrl?.trim();
    if (url) {
      this.src.set(url);
      return;
    }

    this.failed.set(true);
  }

  private clearObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
