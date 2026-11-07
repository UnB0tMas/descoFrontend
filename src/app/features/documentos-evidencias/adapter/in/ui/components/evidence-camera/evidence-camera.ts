import { DialogBackdropDirective } from '../../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faFloppyDisk, faRotate, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../shared/forms/form-error/form-error';
import { AdminModalResult } from '../../../../../../administracion/shared/admin-modal.types';
import { RegistrarFotografiaUseCase } from '../../../../../application/use-case/registrar-fotografia.use-case';
import { EvidenciaContexto } from '../../../../../domain/evidencia-contexto.model';

@Component({ selector: 'app-evidence-camera', standalone: true, imports: [DialogBackdropDirective, ReactiveFormsModule, FaIconComponent, FormErrorComponent], templateUrl: './evidence-camera.html', styleUrl: './evidence-camera.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class EvidenceCameraComponent {
  @ViewChild('dialog', { static: true }) private readonly dialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('video') private readonly videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  private readonly fb = inject(FormBuilder); private readonly useCase = inject(RegistrarFotografiaUseCase); private readonly toast = inject(ToastService);
  readonly starting = signal(false); readonly saving = signal(false); readonly captured = signal<Blob | null>(null); readonly previewUrl = signal<string | null>(null); readonly context = signal<EvidenciaContexto | null>(null); readonly errorMessage = signal<string | null>(null); readonly location = signal<{ latitude: number; longitude: number } | null>(null);
  readonly cameraIcon = faCamera; readonly closeIcon = faXmark; readonly retryIcon = faRotate; readonly saveIcon = faFloppyDisk;
  private stream: MediaStream | null = null; private resolver: ((result: AdminModalResult<number>) => void) | null = null;
  readonly form = this.fb.nonNullable.group({ tipoEvidencia: ['FOTOGRAFIA', [Validators.required, Validators.maxLength(40)]], descripcion: ['', [Validators.maxLength(400)]] });

  async open(context: EvidenciaContexto): Promise<AdminModalResult<number>> {
    this.context.set(context); this.captured.set(null); this.releasePreview(); this.errorMessage.set(null); this.location.set(null); this.form.reset({ tipoEvidencia: 'FOTOGRAFIA', descripcion: '' }); this.dialogRef.nativeElement.showModal();
    await this.startCamera(); void this.resolveLocation();
    return new Promise((resolve) => { this.resolver = resolve; });
  }
  async startCamera(): Promise<void> {
    this.stopCamera(); this.starting.set(true); this.errorMessage.set(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('La cámara no está disponible en este dispositivo o navegador.');
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      await new Promise<void>((resolve) => setTimeout(resolve));
      const video = this.videoRef?.nativeElement; if (video) { video.srcObject = this.stream; await video.play(); }
    } catch (error) { this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo iniciar la cámara.'); }
    finally { this.starting.set(false); }
  }
  capture(): void {
    const video = this.videoRef?.nativeElement; const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) { this.errorMessage.set('La cámara todavía no está lista para capturar.'); return; }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (!blob) { this.errorMessage.set('No se pudo generar la fotografía.'); return; } this.captured.set(blob); this.releasePreview(); this.previewUrl.set(URL.createObjectURL(blob)); this.stopCamera(); }, 'image/jpeg', 0.9);
  }
  retake(): void { this.captured.set(null); this.releasePreview(); void this.startCamera(); }
  save(): void {
    this.form.markAllAsTouched(); const blob = this.captured(); const context = this.context(); if (!blob || !context || this.form.invalid || this.saving()) return;
    const raw = this.form.getRawValue(); const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }); const location = this.location(); this.saving.set(true); this.errorMessage.set(null);
    this.useCase.execute({ file, tipoEvidencia: raw.tipoEvidencia.trim().toUpperCase(), descripcion: raw.descripcion.trim() || undefined, fechaCaptura: new Date().toISOString(), latitudCaptura: location?.latitude, longitudCaptura: location?.longitude, contexto: context })
      .pipe(finalize(() => this.saving.set(false))).subscribe({ next: ({ archivoId }) => { this.toast.success('Fotografía registrada'); this.finish({ saved: true, value: archivoId }); }, error: (error) => this.errorMessage.set(mapOpenApiError(error).message) });
  }
  close(): void { if (!this.saving()) this.finish({ saved: false, value: null }); }
  private resolveLocation(): Promise<void> { return new Promise((resolve) => { if (!navigator.geolocation) { resolve(); return; } navigator.geolocation.getCurrentPosition((position) => { this.location.set({ latitude: position.coords.latitude, longitude: position.coords.longitude }); resolve(); }, () => resolve(), { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }); }); }
  private stopCamera(): void { this.stream?.getTracks().forEach((track) => track.stop()); this.stream = null; if (this.videoRef?.nativeElement) this.videoRef.nativeElement.srcObject = null; }
  private releasePreview(): void { const url = this.previewUrl(); if (url) URL.revokeObjectURL(url); this.previewUrl.set(null); }
  private finish(result: AdminModalResult<number>): void { this.stopCamera(); this.releasePreview(); if (this.dialogRef.nativeElement.open) this.dialogRef.nativeElement.close(); this.resolver?.(result); this.resolver = null; this.context.set(null); }
}
