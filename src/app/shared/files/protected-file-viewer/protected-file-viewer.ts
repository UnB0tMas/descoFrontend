import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, AfterViewInit, Output, ViewChild, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDownload, faFileLines, faXmark } from '@fortawesome/free-solid-svg-icons';
import { AppButtonComponent } from '../../actions/app-button/app-button';
import { DialogBackdropDirective } from '../../feedback/dialog-lifecycle/dialog-backdrop.directive';
import { LoadingStateComponent } from '../../data-display/loading-state/loading-state';
import type { Workbook } from 'exceljs';

type PreviewKind = 'pdf' | 'image' | 'word' | 'excel' | 'text' | 'unsupported';

/** Vista previa compartida. No conoce servicios HTTP, documentos ni permisos. */
@Component({
  selector: 'app-protected-file-viewer',
  standalone: true,
  imports: [FaIconComponent, AppButtonComponent, DialogBackdropDirective, LoadingStateComponent],
  templateUrl: './protected-file-viewer.html',
  styleUrl: './protected-file-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProtectedFileViewerComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() blob: Blob | null = null;
  @Input() name = 'Archivo';
  @Input() mime = 'application/octet-stream';
  @Output() readonly close = new EventEmitter<void>();

  @ViewChild('dialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('wordHost') private wordHost?: ElementRef<HTMLDivElement>;

  private readonly sanitizer = inject(DomSanitizer);
  private objectUrl: string | null = null;
  private workbook: Workbook | null = null;
  private ready = false;
  private ticket = 0;
  private wordObserver: ResizeObserver | null = null;
  private wordNaturalWidth = 0;

  readonly closeIcon = faXmark;
  readonly fileIcon = faFileLines;
  readonly downloadIcon = faDownload;
  readonly kind = signal<PreviewKind>('unsupported');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly resourceUrl = signal<SafeResourceUrl | null>(null);
  readonly imageUrl = signal<string | null>(null);
  readonly plainText = signal('');
  readonly sheets = signal<{ index: number; name: string }[]>([]);
  readonly currentSheet = signal(0);
  readonly rows = signal<string[][]>([]);
  readonly columns = signal<number[]>([]);
  readonly trimmed = signal(false);

  ngOnChanges(): void {
    this.release();
    const extension = this.name.toLowerCase().split('.').pop() ?? '';
    const mime = this.mime.toLowerCase().split(';')[0].trim();
    const kind: PreviewKind = extension === 'pdf' || mime === 'application/pdf' ? 'pdf'
      : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension) || ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'].includes(mime) ? 'image'
      : extension === 'docx' ? 'word'
      : extension === 'xlsx' ? 'excel'
      : ['txt', 'csv', 'log'].includes(extension) || mime === 'text/plain' ? 'text' : 'unsupported';
    this.kind.set(kind);
    if (this.blob && (kind === 'pdf' || kind === 'image')) {
      const displayBlob = new Blob([this.blob], { type: kind === 'pdf' ? 'application/pdf' : mime });
      this.objectUrl = URL.createObjectURL(displayBlob);
      if (kind === 'pdf') this.resourceUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
      else this.imageUrl.set(this.objectUrl);
    }
    if (this.ready) void this.render();
  }

  ngAfterViewInit(): void {
    this.ready = true;
    const dialog = this.dialog.nativeElement;
    if (!dialog.open) dialog.showModal();
    void this.render();
  }

  private async render(): Promise<void> {
    const ticket = ++this.ticket;
    const blob = this.blob;
    const kind = this.kind();
    this.error.set(null);
    this.loading.set(false);
    this.plainText.set('');
    this.workbook = null;
    this.sheets.set([]);
    this.rows.set([]);
    this.columns.set([]);
    if (!blob || !['word', 'excel', 'text'].includes(kind)) return;
    if (blob.size > 25 * 1024 * 1024) {
      this.error.set('El archivo es demasiado grande para la vista previa. Puedes descargarlo.');
      return;
    }
    this.loading.set(true);
    try {
      if (kind === 'word') {
        const { renderAsync } = await import('docx-preview');
        if (ticket !== this.ticket) return;
        const host = this.wordHost?.nativeElement;
        if (!host) throw new Error('El visualizador no está disponible.');
        host.replaceChildren();
        await renderAsync(blob, host, host, { renderAltChunks: false, useBase64URL: true, breakPages: true });
        if (ticket !== this.ticket) return;
        this.wordNaturalWidth = host.querySelector<HTMLElement>('section.docx')?.getBoundingClientRect().width ?? 0;
        this.fitWordToViewport(host);
        if (typeof ResizeObserver !== 'undefined') {
          this.wordObserver = new ResizeObserver(() => this.fitWordToViewport(host));
          this.wordObserver.observe(host);
        }
      } else if (kind === 'excel') {
        const { Workbook: ExcelWorkbook } = await import('exceljs');
        const workbook = new ExcelWorkbook();
        // ExcelJS usa Buffer en sus tipos de Node; JSZip admite Uint8Array en el navegador.
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await workbook.xlsx.load(bytes as unknown as Parameters<Workbook['xlsx']['load']>[0]);
        if (ticket !== this.ticket) return;
        this.workbook = workbook;
        this.sheets.set(workbook.worksheets.map((sheet, index) => ({ index, name: sheet.name })));
        this.selectSheet(0);
      } else {
        const text = await blob.text();
        if (ticket !== this.ticket) return;
        this.plainText.set(text.slice(0, 300_000));
        this.trimmed.set(text.length > 300_000);
      }
    } catch {
      if (ticket === this.ticket) this.error.set('No se pudo mostrar la vista previa. Puedes descargar el archivo.');
    } finally {
      if (ticket === this.ticket) this.loading.set(false);
    }
  }

  /** Mantiene el tamaño de página y ajusta su escala al espacio disponible. */
  private fitWordToViewport(host: HTMLDivElement): void {
    if (!host.isConnected || !this.wordNaturalWidth) return;
    const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
    if (!wrapper) return;
    const style = getComputedStyle(host);
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const available = Math.max(1, host.clientWidth - padding - 4);
    const scale = Math.min(1, available / this.wordNaturalWidth);
    const zoom = String(Math.round(scale * 1000) / 1000);
    if (wrapper.style.zoom !== zoom) wrapper.style.zoom = zoom;
  }

  selectSheet(index: number): void {
    const sheet = this.workbook?.worksheets[index];
    if (!sheet) return;
    this.currentSheet.set(index);
    const rows: string[][] = [];
    const limit = Math.min(sheet.rowCount, 500);
    let width = 0;
    for (let number = 1; number <= limit; number++) {
      const row = sheet.getRow(number);
      const cells: string[] = [];
      const max = Math.min(row.cellCount, 40);
      width = Math.max(width, max);
      for (let column = 1; column <= max; column++) cells.push(row.getCell(column).text ?? '');
      rows.push(cells);
    }
    this.columns.set(Array.from({ length: width }, (_, n) => n + 1));
    this.rows.set(rows);
    this.trimmed.set(sheet.rowCount > 500 || sheet.columnCount > 40);
  }

  download(): void {
    if (!this.blob) return;
    const url = URL.createObjectURL(this.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  dismiss(): void {
    this.dialog.nativeElement.close();
    this.close.emit();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.dismiss();
  }

  ngOnDestroy(): void { this.release(); }

  private release(): void {
    this.wordObserver?.disconnect();
    this.wordObserver = null;
    this.wordNaturalWidth = 0;
    ++this.ticket;
    this.workbook = null;
    this.resourceUrl.set(null);
    this.imageUrl.set(null);
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
