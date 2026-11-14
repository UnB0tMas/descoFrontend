import { ChangeDetectionStrategy, Component, Input, OnChanges, OnDestroy, PLATFORM_ID, SimpleChanges, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowUpRightFromSquare,faClock,faLocationArrow,faRoute,faRotate,faStop } from '@fortawesome/free-solid-svg-icons';
import { PredioMapComponent } from '../../../gestion-tecnica/predios/adapter/in/ui/components/predio-map/predio-map';

@Component({
  selector: 'app-apappss-navigation', standalone: true,
  imports: [PredioMapComponent,FaIconComponent],
  templateUrl: './apappss-navigation.html', styleUrl: './apappss-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApappssNavigationComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) latitud = 0;
  @Input({ required: true }) longitud = 0;
  private readonly platformId = inject(PLATFORM_ID);
  private watchId: number | null = null;
  private abort: AbortController | null = null;
  private destroyed = false;
  private lastRouteAt = 0;
  private lastRoutedPoint: {lat:number;lng:number}|null = null;
  private rutaBase: [number,number][] = [];
  private distanciaBase = 0;
  private duracionBase = 0;
  readonly startIcon=faLocationArrow;readonly stopIcon=faStop;readonly refreshIcon=faRotate;
  readonly mapsIcon=faArrowUpRightFromSquare;readonly routeIcon=faRoute;readonly clockIcon=faClock;
  readonly activo = signal(false);
  readonly iniciando = signal(false);
  readonly error = signal<string|null>(null);
  readonly posicion = signal<{lat:number;lng:number}|null>(null);
  readonly ruta = signal<[number,number][]>([]);
  readonly distanciaKm = signal<number|null>(null);
  readonly duracionMin = signal<number|null>(null);
  get gpsValido(): boolean { return Number.isFinite(this.latitud) && Number.isFinite(this.longitud) &&
    this.latitud >= -90 && this.latitud <= 90 && this.longitud >= -180 && this.longitud <= 180; }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['latitud'] || changes['longitud']) {
      this.ruta.set([]); this.distanciaKm.set(null); this.duracionMin.set(null);
      if (this.activo()) void this.calcularRuta();
    }
  }
  ngOnDestroy(): void { this.destroyed = true; this.detener(); }
  empezar(): void {
    if (!isPlatformBrowser(this.platformId) || this.destroyed || this.activo() || this.iniciando()) return;
    if (!this.gpsValido) { this.error.set('El fundo no tiene ubicación registrada.'); return; }
    if (!window.isSecureContext || !navigator.geolocation) {
      this.error.set('Active la ubicación desde HTTPS o localhost.'); return;
    }
    this.error.set(null); this.iniciando.set(true);
    this.watchId = navigator.geolocation.watchPosition(p => {
      if (this.destroyed) return;
      this.iniciando.set(false); this.activo.set(true); this.error.set(null);
      const next = {lat:p.coords.latitude,lng:p.coords.longitude}; this.posicion.set(next);
      this.actualizarRecorrido(next);
      if (!this.lastRoutedPoint ||
        (Date.now() - this.lastRouteAt >= 25000 && this.metros(this.lastRoutedPoint,next) >= 35))
        void this.calcularRuta();
    }, e => {
      if (this.destroyed) return;
      this.iniciando.set(false);
      this.error.set(e.code === 1 ? 'Permita el acceso a su ubicación.' :
        e.code === 3 ? 'No se pudo obtener la ubicación. Vuelva a intentar.' : 'GPS no disponible.');
      this.detener();
    }, {enableHighAccuracy:true,maximumAge:2000,timeout:20000});
  }
  detener(): void {
    if (isPlatformBrowser(this.platformId) && this.watchId !== null && navigator.geolocation)
      navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null; this.iniciando.set(false); this.activo.set(false);
    this.abort?.abort(); this.abort = null;
    this.rutaBase=[];this.ruta.set([]);this.distanciaKm.set(null);this.duracionMin.set(null);
    this.lastRoutedPoint=null;
  }
  private metros(a:{lat:number;lng:number},b:{lat:number;lng:number}):number {
    const rad=Math.PI/180,dy=(b.lat-a.lat)*rad,dx=(b.lng-a.lng)*rad;
    const h=Math.sin(dy/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dx/2)**2;
    return 12742000*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
  }
  // Sobre la ruta original conserva solo el tramo pendiente a partir de la posición GPS real.
  private actualizarRecorrido(p:{lat:number;lng:number}):void{
    const camino=this.rutaBase;
    if(camino.length<2)return;
    const escala=Math.max(.1,Math.cos(p.lat*Math.PI/180));
    let indice=0,fraccion=0,distancia=Infinity;
    for(let i=0;i<camino.length-1;i++){
      const a=camino[i],b=camino[i+1];
      const dx=(b[1]-a[1])*escala,dy=b[0]-a[0];
      const t=Math.max(0,Math.min(1,((p.lng-a[1])*escala*dx+(p.lat-a[0])*dy)/(dx*dx+dy*dy||1)));
      const x=(a[1]+(b[1]-a[1])*t-p.lng)*escala,y=a[0]+(b[0]-a[0])*t-p.lat;
      const d=111320*Math.hypot(x,y);
      if(d<distancia){distancia=d;indice=i;fraccion=t;}
    }
    if(distancia>120)return; // Fuera del recorrido: conservar ruta y solicitar recálculo.
    const siguiente=camino[indice+1];
    const recorte:[number,number][]=[[p.lat,p.lng],siguiente,...camino.slice(indice+2)];
    this.ruta.set(recorte);
    const base=this.longitudCamino(camino),restante=this.longitudCamino(recorte);
    const ratio=base>0?Math.min(1,restante/base):0;
    this.distanciaKm.set(this.distanciaBase*ratio/1000);
    this.duracionMin.set(Math.max(0,Math.ceil(this.duracionBase*ratio/60)));
  }
  private longitudCamino(puntos:readonly [number,number][]):number{
    let total=0;
    for(let i=1;i<puntos.length;i++)total+=this.metros({lat:puntos[i-1][0],lng:puntos[i-1][1]},
      {lat:puntos[i][0],lng:puntos[i][1]});
    return total;
  }
  async calcularRuta(): Promise<void> {
    const p=this.posicion(); if (!p || !this.gpsValido || this.destroyed || !this.activo()) return;
    this.abort?.abort(); const controller=new AbortController(); this.abort=controller;
    this.lastRouteAt=Date.now(); this.lastRoutedPoint={...p};
    const url=`https://router.project-osrm.org/route/v1/driving/${p.lng},${p.lat};${this.longitud},${this.latitud}?overview=full&geometries=geojson`;
    try {
      const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error('Sin servicio de rutas');
      const result:{code:string;routes?:{distance:number;duration:number;geometry:{coordinates:number[][]}}[]}=await response.json();
      if (controller.signal.aborted || this.destroyed) return;
      const route=result.routes?.[0];
      if(result.code!=='Ok'||!route||route.geometry.coordinates.length<2)throw new Error('No hay ruta');
      this.rutaBase=route.geometry.coordinates.map(c=>[c[1],c[0]] as [number,number]);
      this.distanciaBase=route.distance;this.duracionBase=route.duration;
      this.actualizarRecorrido(this.posicion()??p);
      this.error.set(null);
    } catch {
      if (controller.signal.aborted || this.destroyed) return;
      this.rutaBase=[];this.ruta.set([]); this.distanciaKm.set(null); this.duracionMin.set(null);
      this.error.set('Ruta no disponible. Abra Google Maps.');
    }
  }
  distanciaTexto(): string {
    const km=this.distanciaKm();
    return km == null ? '' : km<1 ? `${Math.round(km*1000)} m` : `${km.toFixed(1)} km`;
  }
  abrirGoogleMaps(): void {
    if (!isPlatformBrowser(this.platformId) || !this.gpsValido) return;
    const params=new URLSearchParams({api:'1',destination:`${this.latitud},${this.longitud}`,
      travelmode:'driving',dir_action:'navigate'});
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`,'_blank','noopener,noreferrer');
  }
}
