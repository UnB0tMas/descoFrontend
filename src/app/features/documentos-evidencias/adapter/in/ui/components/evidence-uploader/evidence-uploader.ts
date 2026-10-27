import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCloudArrowUp, faFileArrowUp, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { AdminModalResult } from '../../../../../../administracion/shared/admin-modal.types';
import { SubirDocumentoEvidenciaUseCase } from '../../../../../application/use-case/subir-documento-evidencia.use-case';
import { EvidenciaCategoria } from '../../../../../domain/documento-evidencia.model';
import { EVIDENCIA_CONTEXTOS, EvidenciaContexto, EvidenciaContextoTipo } from '../../../../../domain/evidencia-contexto.model';

@Component({ selector: 'app-evidence-uploader', standalone: true, imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent], templateUrl: './evidence-uploader.html', styleUrl: './evidence-uploader.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class EvidenceUploaderComponent {
  @ViewChild('dialog', { static: true }) private readonly dialogRef!: ElementRef<HTMLDialogElement>;
  private readonly fb = inject(FormBuilder);
  private readonly useCase = inject(SubirDocumentoEvidenciaUseCase);
  private readonly toast = inject(ToastService);
  readonly saving = signal(false);
  readonly progress = signal(0);
  readonly file = signal<File | null>(null);
  readonly fixedContext = signal<EvidenciaContexto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly contexts = EVIDENCIA_CONTEXTOS;
  readonly closeIcon = faXmark; readonly uploadIcon = faCloudArrowUp; readonly fileIcon = faFileArrowUp;
  private resolver: ((result: AdminModalResult<number>) => void) | null = null;
  readonly categories: readonly EvidenciaCategoria[] = ['DOCUMENTO','FOTOGRAFIA','TICKET','COMPROBANTE','OTRO'];
  readonly form = this.fb.nonNullable.group({
    tipoEvidencia: ['DOCUMENTO', [Validators.required, Validators.maxLength(50)]],
    categoria: ['DOCUMENTO' as EvidenciaCategoria, [Validators.required]],
    descripcion: ['', [Validators.maxLength(1000)]],
    fechaCaptura: [''],
    contextoTipo: ['SOCIO' as EvidenciaContextoTipo, [Validators.required]],
    contextoId: [0, [Validators.required, Validators.min(1)]],
  });

  open(context: EvidenciaContexto | null = null): Promise<AdminModalResult<number>> {
    this.fixedContext.set(context); this.file.set(null); this.progress.set(0); this.errorMessage.set(null);
    this.form.reset({ tipoEvidencia: 'DOCUMENTO', categoria: 'DOCUMENTO', descripcion: '', fechaCaptura: '', contextoTipo: context?.tipo ?? 'SOCIO', contextoId: context?.id ?? 0 });
    this.dialogRef.nativeElement.showModal();
    return new Promise((resolve) => { this.resolver = resolve; });
  }
  selectFile(event: Event): void { const input = event.target as HTMLInputElement; this.file.set(input.files?.[0] ?? null); this.progress.set(0); }
  close(): void { if (!this.saving()) this.finish({ saved: false, value: null }); }
  save(): void {
    this.form.markAllAsTouched();
    const file = this.file();
    if (!file) { this.errorMessage.set('Selecciona un archivo antes de continuar.'); return; }
    if (this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue();
    const context = this.fixedContext() ?? { tipo: raw.contextoTipo, id: Number(raw.contextoId) };
    if (context.id <= 0) { this.errorMessage.set('Selecciona un contexto válido para la evidencia.'); return; }
    this.saving.set(true); this.progress.set(10); this.errorMessage.set(null);
    this.useCase.execute({
      file,
      tipoEvidencia: raw.tipoEvidencia.trim().toUpperCase(),
      categoria: raw.categoria,
      descripcion: raw.descripcion.trim() || undefined,
      fechaCaptura: raw.fechaCaptura ? new Date(raw.fechaCaptura).toISOString() : undefined,
      contexto: context,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: ({ archivoId }) => { this.progress.set(100); this.toast.success('Documento registrado'); this.finish({ saved: true, value: archivoId }); },
      error: (error) => { this.progress.set(0); this.errorMessage.set(mapOpenApiError(error).message); },
    });
  }
  private finish(result: AdminModalResult<number>): void { if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close(); this.resolver?.(result); this.resolver = null; this.fixedContext.set(null); }
}
