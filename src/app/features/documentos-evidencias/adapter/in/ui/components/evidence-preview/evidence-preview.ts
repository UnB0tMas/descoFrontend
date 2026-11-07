import { LocalDocumentApiService } from '../../../../../../../shared/files/local-document-api.service';
import { Subscription } from 'rxjs';
import { DialogBackdropDirective } from '../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowUpRightFromSquare, faFile, faXmark } from '@fortawesome/free-solid-svg-icons';
import { DocumentoEvidencia, DocumentoEvidenciaDetalle } from '../../../../../domain/documento-evidencia.model';

@Component({
  selector: 'app-evidence-preview',
  standalone: true,
  imports: [DialogBackdropDirective, FaIconComponent],
  templateUrl: './evidence-preview.html',
  styleUrl: './evidence-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvidencePreviewComponent {
  @ViewChild('dialog', { static: true })
  private readonly dialogRef!: ElementRef<HTMLDialogElement>;

  private readonly sanitizer = inject(DomSanitizer);

  private readonly local = inject(LocalDocumentApiService);
  private pending?: Subscription;
  private objectUrl: string | null = null;
  readonly contentUrl = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly evidence = signal<DocumentoEvidencia | DocumentoEvidenciaDetalle | null>(null);
  readonly safeDocumentUrl = signal<SafeResourceUrl | null>(null);
  readonly closeIcon = faXmark;
  readonly fileIcon = faFile;
  readonly openIcon = faArrowUpRightFromSquare;

  open(evidence: DocumentoEvidencia | DocumentoEvidenciaDetalle): void {
    this.release();
    this.evidence.set(evidence);
    this.loadError.set(null);
    this.dialogRef.nativeElement.showModal();
    if(/^\/api\/v1\/documentos\/local\/\d+\/contenido$/.test(evidence.secureUrl)) {
      this.pending=this.local.content(evidence.archivoId).subscribe({
        next:blob=>{this.objectUrl=URL.createObjectURL(blob);this.setUrl(this.objectUrl,evidence.mimeType);},
        error:()=>this.loadError.set('No se pudo cargar el archivo. Cierra y vuelve a intentarlo.'),
      });
    } else this.setUrl(evidence.secureUrl,evidence.mimeType);
  }

  private setUrl(url:string,mime:string):void {
    this.contentUrl.set(url);
    this.safeDocumentUrl.set(mime==='application/pdf'?this.sanitizer.bypassSecurityTrustResourceUrl(url):null);
  }
  private release():void {
    this.pending?.unsubscribe();
    if(this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl=null;this.contentUrl.set(null);this.safeDocumentUrl.set(null);
  }
  ngOnDestroy():void {this.release();}

  close(): void {
    this.release();
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
