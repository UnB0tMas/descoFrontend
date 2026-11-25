import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { faDownload, faEye, faMessage, faFilePdf, faFileWord, faFileExcel, faFileImage, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AppButtonComponent } from '../../actions/app-button/app-button';

/** Presentación reutilizable: no conoce endpoints, permisos ni reglas de correspondencia. */
export interface ThreadAttachment {
  archivoId: number;
  documentoId: number;
  nombre: string;
  mimeType: string;
  tamanoBytes: number;
  fechaEnvio: string;
  emisor: string;
  documentoOriginalId?: number;
}

@Component({
  selector: 'app-thread-attachments',
  standalone: true,
  imports: [DatePipe, FaIconComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (files.length) {
      <div class="admin-table-wrap max-w-full overflow-x-auto">
        <table class="admin-table w-full" aria-label="Archivos de la conversación">
          <thead><tr><th>Archivo</th><th>Enviado por</th><th>Fecha</th><th class="text-right">Acciones</th></tr></thead>
          <tbody>
            @for (file of files; track file.documentoId + '-' + file.archivoId) {
              <tr>
                <td><div class="flex items-center gap-2 min-w-0">
                    <fa-icon [icon]="fileIcon(file.nombre, file.mimeType)" class="opacity-70 shrink-0" aria-hidden="true" />
                    <div class="min-w-0"><strong class="text-sm break-all">{{file.nombre}}</strong>
                      <span class="block text-xs opacity-70">{{(file.tamanoBytes / 1024).toFixed(0)}} KB</span>
                    </div>
                  </div></td>
                <td class="text-sm">{{file.emisor}}</td>
                <td class="whitespace-nowrap text-sm">{{file.fechaEnvio | date:'dd/MM/yyyy HH:mm'}}</td>
                <td><div class="flex justify-end gap-1">
                    @if (showMessage) {
                      <app-button [icon]="messageIcon" [iconOnly]="true" label="Ir al mensaje" tone="ghost" size="small" (pressed)="locate.emit(file)" />
                    }
                    <app-button [icon]="viewIcon" [iconOnly]="true" label="Vista previa" tone="ghost" size="small"
                      [loading]="busyFileKey===('ver-'+file.archivoId)" (pressed)="preview.emit(file)" />
                    <app-button [icon]="downloadIcon" [iconOnly]="true" label="Descargar" tone="ghost" size="small"
                      [loading]="busyFileKey===('descargar-'+file.archivoId)" (pressed)="download.emit(file)" />
                  </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="text-sm opacity-70">No hay archivos para mostrar.</p>
    }
  `,
})
export class ThreadAttachmentsComponent {
  @Input() files: readonly ThreadAttachment[] = [];
  @Input() showMessage = false;
  @Input() busyFileKey: string | null = null;
  @Output() readonly locate = new EventEmitter<ThreadAttachment>();
  @Output() readonly preview = new EventEmitter<ThreadAttachment>();
  @Output() readonly download = new EventEmitter<ThreadAttachment>();
  readonly viewIcon = faEye;
  readonly downloadIcon = faDownload;
  readonly messageIcon = faMessage;
  fileIcon(name: string, mime: string) {
    const extension = name.toLowerCase().split('.').pop();
    if (extension === 'pdf' || mime === 'application/pdf') return faFilePdf;
    if (extension === 'doc' || extension === 'docx') return faFileWord;
    if (extension === 'xls' || extension === 'xlsx' || extension === 'csv') return faFileExcel;
    if (mime.startsWith('image/')) return faFileImage;
    return faFileLines;
  }
}
