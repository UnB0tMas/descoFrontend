import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowUpRightFromSquare, faFile, faXmark } from '@fortawesome/free-solid-svg-icons';
import { DocumentoEvidencia, DocumentoEvidenciaDetalle } from '../../../../../domain/documento-evidencia.model';

@Component({
  selector: 'app-evidence-preview',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './evidence-preview.html',
  styleUrl: './evidence-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvidencePreviewComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly sanitizer = inject(DomSanitizer);

  readonly evidence = signal<DocumentoEvidencia | DocumentoEvidenciaDetalle | null>(null);
  readonly safeDocumentUrl = signal<SafeResourceUrl | null>(null);
  readonly closeIcon = faXmark;
  readonly fileIcon = faFile;
  readonly openIcon = faArrowUpRightFromSquare;

  open(evidence: DocumentoEvidencia | DocumentoEvidenciaDetalle): void {
    this.evidence.set(evidence);
    this.safeDocumentUrl.set(
      evidence.mimeType === 'application/pdf'
        ? this.sanitizer.bypassSecurityTrustResourceUrl(evidence.secureUrl)
        : null,
    );
    this.dialogRef.nativeElement.showModal();
  }

  close(): void {
    if (this.dialogRef.nativeElement.open) {
      this.dialogRef.nativeElement.close();
    }
    this.evidence.set(null);
    this.safeDocumentUrl.set(null);
  }

  isImage(): boolean {
    return this.evidence()?.mimeType?.startsWith('image/') ?? false;
  }

  isPdf(): boolean {
    return this.evidence()?.mimeType === 'application/pdf';
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }
}
