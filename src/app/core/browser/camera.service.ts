import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly platformId = inject(PLATFORM_ID);

  async open(
    constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
      },
      audio: false,
    },
  ): Promise<MediaStream> {
    if (
      !isPlatformBrowser(this.platformId) ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error('La cámara no está disponible en este dispositivo.');
    }

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  stop(stream: MediaStream | null | undefined): void {
    stream?.getTracks().forEach((track) => track.stop());
  }

  capture(video: HTMLVideoElement, mimeType = 'image/jpeg'): Promise<Blob> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(
        new Error('La captura de cámara no está disponible en este entorno.'),
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      return Promise.reject(new Error('No se pudo preparar la captura.'));
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('No se pudo generar la fotografía.')),
        mimeType,
        0.92,
      );
    });
  }
}
