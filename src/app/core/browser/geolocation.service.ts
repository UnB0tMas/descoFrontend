import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

export interface BrowserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly platformId = inject(PLATFORM_ID);

  current(
    options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
  ): Promise<BrowserCoordinates> {
    if (!isPlatformBrowser(this.platformId) || !navigator.geolocation) {
      return Promise.reject(
        new Error('La geolocalización no está disponible en este dispositivo.'),
      );
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString(),
          }),
        (error) => reject(error),
        options,
      );
    });
  }
}
