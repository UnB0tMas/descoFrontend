import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  Input, OnChanges, OnDestroy, Output, PLATFORM_ID, SimpleChanges, ViewChild,
  effect, inject, signal,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExpand, faLocationCrosshairs, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { Map as LeafletMap, LeafletMouseEvent, Marker, TileLayer } from 'leaflet';
import { ThemeService } from '../../../../../../../../core/ui/theme.service';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';

/** Mapa compartido: Leaflet utiliza coordenadas [latitud, longitud]. */
@Component({
  selector: 'app-predio-map', standalone: true, imports: [FaIconComponent],
  templateUrl: './predio-map.html', styleUrl: './predio-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredioMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) private host!: ElementRef<HTMLDivElement>;
  @ViewChild('expandedDialog', { static: true }) private expandedDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('expandedMapHost', { static: true }) private expandedHost!: ElementRef<HTMLDivElement>;
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() editable = false;
  @Input() height = '19rem';
  @Input() autoLocateOnCreate = false;
  @Output() locationChange = new EventEmitter<{ latitude: number; longitude: number }>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  private readonly theme = inject(ThemeService);
  private lib: typeof import('leaflet') | null = null;
  private map: LeafletMap | null = null;
  private largeMap: LeafletMap | null = null;
  private marker: Marker | null = null;
  private largeMarker: Marker | null = null;
  private readonly tileLayers = new WeakMap<LeafletMap, TileLayer>();
  private readonly tileFallback = new WeakMap<LeafletMap, { enabled: boolean }>();
  private gpsRequestId = 0;
  private destroyed = false;
  private manuallyCleared = false;
  readonly locating = signal(false);
  readonly gpsError = signal<string | null>(null);
  readonly mapError = signal<string | null>(null);
  readonly expanded = signal(false);
  readonly expandedIcon = faExpand;
  readonly closeIcon = faXmark;
  readonly locationIcon = faLocationCrosshairs;

  constructor() {
    effect(() => {
      this.theme.isDark();
      // Actualizar la capa base sin recrear el mapa ni perder el marcador.
      if (this.map) this.updateTiles(this.map);
      if (this.largeMap) this.updateTiles(this.largeMap);
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Primero GPS: la carga del mapa vectorial nunca debe retrasar la solicitud.
    if (this.editable && this.autoLocateOnCreate && !this.hasPoint()) {
      void this.useCurrentLocation();
    }
    void this.initializeMap();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.map || this.largeMap) this.refreshMarkers(true);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.gpsRequestId++;
    this.map?.remove(); this.largeMap?.remove();
    this.map = null; this.largeMap = null; this.marker = null; this.largeMarker = null;
  }

  hasPoint(): boolean { return this.latitude != null && this.longitude != null; }

  clearSelection(): void {
    this.gpsRequestId++;
    this.manuallyCleared = true;
    this.locating.set(false);
    this.gpsError.set(null);
    this.latitude = null; this.longitude = null;
    this.refreshMarkers(false);
  }

  async useCurrentLocation(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.destroyed || this.locating()) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      this.gpsError.set('GPS no disponible. Abre la aplicación mediante HTTPS o localhost, o marca un punto.');
      return;
    }
    const requestId = ++this.gpsRequestId;
    this.locating.set(true);
    this.gpsError.set(null);
    navigator.geolocation.getCurrentPosition(
      position => {
        if (this.destroyed || requestId !== this.gpsRequestId) return;
        this.locating.set(false);
        this.manuallyCleared = false;
        this.setPoint(position.coords.latitude, position.coords.longitude);
      },
      error => {
        if (this.destroyed || requestId !== this.gpsRequestId) return;
        this.locating.set(false);
        const message = error.code === 1 ? 'Permite el acceso a la ubicación en el navegador o selecciona un punto manualmente.'
          : error.code === 3 ? 'Se agotó el tiempo de búsqueda del GPS. Puedes reintentar o marcar el punto.'
          : 'No se pudo obtener el GPS. Puedes marcar el punto en el mapa.';
        this.gpsError.set(message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }

  async openExpanded(): Promise<void> {
    if (this.destroyed || !isPlatformBrowser(this.platformId) || this.expanded()) return;
    await this.initializeMap();
    if (this.destroyed || !this.lib) return;
    this.expandedDialog.nativeElement.showModal();
    this.expanded.set(true);
    this.largeMap = this.createMap(this.expandedHost.nativeElement, true);
    this.refreshMarkers(false);
    requestAnimationFrame(() => this.largeMap?.invalidateSize({ animate: false }));
  }

  closeExpanded(event?: Event): void {
    event?.preventDefault();
    if (this.expandedDialog.nativeElement.open) this.expandedDialog.nativeElement.close();
    this.largeMap?.remove(); this.largeMap = null; this.largeMarker = null;
    this.expanded.set(false);
    requestAnimationFrame(() => this.map?.invalidateSize({ animate: false }));
  }

  private tileUrl(): string {
    // Clave CARTO temporal para pruebas. Es visible en el navegador: revocarla al terminar.
    // API ráster oficial: Dark Matter para el tema oscuro y Voyager para el tema claro.
    const key = 'cb1_4zav_1_0b022890de6e2408e0aee139';
    const estilo = this.theme.isDark() ? 'dark_all' : 'voyager';
    return `https://basemaps.cartocdn.com/rastertiles/${estilo}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`;
  }

  private updateTiles(map: LeafletMap): void {
    const layer = this.tileLayers.get(map);
    const fallback = this.tileFallback.get(map);
    if (!layer || !fallback) return;
    fallback.enabled = false;
    layer.setUrl(this.tileUrl());
  }

  private async initializeMap(): Promise<void> {
    if (this.map || this.destroyed) return;
    try {
      // Leaflet ya está instalado en DESCO y no requiere un Web Worker.
      const L = await import('leaflet');
      if (this.destroyed || this.map) return;
      this.lib = L;
      this.map = this.createMap(this.host.nativeElement, false);
      this.refreshMarkers(false);
      requestAnimationFrame(() => this.map?.invalidateSize({ animate: false }));
    } catch {
      this.mapError.set('No se pudo abrir el mapa. Verifica la instalación de Leaflet.');
    }
  }

  private createMap(container: HTMLDivElement, large: boolean): LeafletMap {
    const L = this.lib!;
    const point: [number, number] = this.hasPoint()
      ? [this.latitude!, this.longitude!]
      : this.map ? [this.map.getCenter().lat, this.map.getCenter().lng] : [-15.25, -73.25];

    const instance = L.map(container, {
      center: point, zoom: this.hasPoint() ? 16 : large && this.map ? this.map.getZoom() : 10,
      maxZoom: 20, zoomControl: true, scrollWheelZoom: false, attributionControl: true,
    });
    const fallback = { enabled: false };
    const tiles = L.tileLayer(this.tileUrl(), {
      maxZoom: 20, maxNativeZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
    this.tileLayers.set(instance, tiles);
    this.tileFallback.set(instance, fallback);
    tiles.on('tileerror', () => {
      if (this.destroyed || !instance.hasLayer(tiles)) return;
      if (!fallback.enabled) {
        fallback.enabled = true;
        // Fallback independiente para mantener utilizable la selección del punto.
        tiles.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
      } else {
        this.mapError.set('No se pudieron cargar las imágenes del mapa. Revisa tu conexión.');
      }
    });
    tiles.on('tileload', () => this.mapError.set(null));
    tiles.addTo(instance);

    if (this.editable) {
      instance.on('click', (event: LeafletMouseEvent) => this.setPoint(event.latlng.lat, event.latlng.lng));
    }
    return instance;
  }

  private setPoint(latitude: number, longitude: number): void {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;
    // Punto manual o GPS confirmado: descarta respuestas GPS obsoletas.
    this.gpsRequestId++;
    this.locating.set(false);
    this.gpsError.set(null);
    this.manuallyCleared = false;
    this.latitude = latitude; this.longitude = longitude;
    this.refreshMarkers(true);
    this.locationChange.emit({ latitude, longitude });
  }

  private refreshMarkers(center: boolean): void {
    this.marker = this.refreshOne(this.map, this.marker, center);
    this.largeMarker = this.refreshOne(this.largeMap, this.largeMarker, center);
  }

  private refreshOne(map: LeafletMap | null, marker: Marker | null, center: boolean): Marker | null {
    if (!map || !this.lib) return null;
    if (!this.hasPoint()) { marker?.remove(); return null; }
    const L = this.lib;
    const point: [number, number] = [this.latitude!, this.longitude!];
    if (!marker) {
      const icon = L.divIcon({
        className: 'desco-leaflet-pin',
        html: '<span class="desco-map-pin" aria-hidden="true"></span>',
        iconSize: [27, 27], iconAnchor: [13, 27],
      });
      marker = L.marker(point, { icon, draggable: this.editable }).addTo(map);
      if (this.editable) marker.on('dragend', () => {
        const picked = marker!.getLatLng();
        this.setPoint(picked.lat, picked.lng);
      });
    } else marker.setLatLng(point);
    if (center) map.flyTo(point, Math.max(map.getZoom(), 16), { duration: 0.3 });
    return marker;
  }
}
