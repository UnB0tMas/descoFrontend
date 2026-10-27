import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faLocationCrosshairs,
  faMapLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import type { CircleMarker, Map, TileLayer } from 'leaflet';

import { ThemeService } from '../../../../../../../../core/ui/theme.service';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';

@Component({
  selector: 'app-predio-map',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './predio-map.html',
  styleUrl: './predio-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredioMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true })
  private host!: ElementRef<HTMLDivElement>;

  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() editable = false;
  @Input() height = '18rem';

  @Output() locationChange = new EventEmitter<{
    latitude: number;
    longitude: number;
  }>();

  private readonly platformId = inject(PLATFORM_ID);
  readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  private map: Map | null = null;
  private marker: CircleMarker | null = null;
  private tiles: TileLayer | null = null;
  private leaflet: typeof import('leaflet') | null = null;

  readonly locating = signal(false);
  readonly mapIcon = faMapLocationDot;
  readonly locateIcon = faLocationCrosshairs;

  constructor() {
    effect(() => {
      const dark = this.theme.isDark();
      if (this.map && this.leaflet) {
        this.applyBaseLayer(dark);
      }
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.ensureMap();
    }
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.map) {
      this.syncMarker();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.marker = null;
    this.tiles = null;
  }

  async useCurrentLocation(): Promise<void> {
    if (
      !isPlatformBrowser(this.platformId)
      || !navigator.geolocation
      || this.locating()
    ) {
      return;
    }

    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.setPoint(
          position.coords.latitude,
          position.coords.longitude,
        );
        this.locating.set(false);
        this.toast.success('Ubicación actualizada');
      },
      () => {
        this.locating.set(false);
        this.toast.error('No se pudo obtener la ubicación');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  private async ensureMap(): Promise<void> {
    if (this.map) {
      return;
    }

    const L = await import('leaflet');
    this.leaflet = L;

    const lat = this.latitude ?? -15.2497;
    const lng = this.longitude ?? -73.2478;

    this.map = L.map(this.host.nativeElement, {
      zoomControl: true,
    }).setView(
      [lat, lng],
      this.latitude !== null && this.longitude !== null ? 16 : 11,
    );

    this.applyBaseLayer(this.theme.isDark());

    if (this.editable) {
      this.map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        this.setPoint(event.latlng.lat, event.latlng.lng);
      });
    }

    this.syncMarker();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private applyBaseLayer(dark: boolean): void {
    if (!this.map || !this.leaflet) {
      return;
    }

    if (this.tiles) {
      this.tiles.remove();
      this.tiles = null;
    }

    const style = dark ? 'dark_all' : 'light_all';

    this.tiles = this.leaflet.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`,
      {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '© OpenStreetMap contributors © CARTO',
      },
    ).addTo(this.map);
  }

  private setPoint(latitude: number, longitude: number): void {
    this.latitude = latitude;
    this.longitude = longitude;
    this.syncMarker();
    this.locationChange.emit({ latitude, longitude });
  }

  private syncMarker(): void {
    if (!this.map || !this.leaflet) {
      return;
    }

    const hasPoint = this.latitude !== null && this.longitude !== null;

    if (!hasPoint) {
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
      return;
    }

    const point: [number, number] = [this.latitude!, this.longitude!];

    if (!this.marker) {
      this.marker = this.leaflet
        .circleMarker(point, {
          radius: 8,
          weight: 3,
          fillOpacity: 0.85,
        })
        .addTo(this.map);
    } else {
      this.marker.setLatLng(point);
    }

    this.map.setView(point, 16);
  }
}
