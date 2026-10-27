import {isPlatformBrowser} from '@angular/common';
import {AfterViewInit,ChangeDetectionStrategy,Component,ElementRef,EventEmitter,Input,OnChanges,OnDestroy,Output,PLATFORM_ID,SimpleChanges,ViewChild,inject,signal} from '@angular/core';
import {ToastService} from '../../../../../../../../shared/feedback/toast-center/toast.service';import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLocationCrosshairs,faMapLocationDot} from '@fortawesome/free-solid-svg-icons';
import type {CircleMarker,Map} from 'leaflet';
@Component({selector:'app-predio-map',standalone:true,imports:[FaIconComponent],templateUrl:'./predio-map.html',styleUrl:'./predio-map.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class PredioMapComponent implements AfterViewInit,OnChanges,OnDestroy{
 @ViewChild('mapHost',{static:true}) private host!:ElementRef<HTMLDivElement>;
 @Input() latitude:number|null=null;@Input() longitude:number|null=null;@Input() editable=false;@Input() height='18rem';
 @Output() locationChange=new EventEmitter<{latitude:number;longitude:number}>();
 private readonly platformId=inject(PLATFORM_ID);private readonly toast=inject(ToastService);private map:Map|null=null;private marker:CircleMarker|null=null;private leaflet:any;readonly locating=signal(false);
 readonly mapIcon=faMapLocationDot;readonly locateIcon=faLocationCrosshairs;
 ngAfterViewInit(){if(isPlatformBrowser(this.platformId)) void this.ensureMap();}
 ngOnChanges(_:SimpleChanges){if(this.map) this.syncMarker();}
 ngOnDestroy(){this.map?.remove();this.map=null;this.marker=null;}
 async useCurrentLocation(){if(!isPlatformBrowser(this.platformId)||!navigator.geolocation||this.locating())return;this.locating.set(true);navigator.geolocation.getCurrentPosition(p=>{this.setPoint(p.coords.latitude,p.coords.longitude);this.locating.set(false);this.toast.success('Ubicación actualizada');},()=>{this.locating.set(false);this.toast.error('No se pudo obtener la ubicación');},{enableHighAccuracy:true,timeout:15000,maximumAge:0});}
 private async ensureMap(){if(this.map)return;const L=await import('leaflet');this.leaflet=L;const lat=this.latitude??-15.2497,lng=this.longitude??-73.2478;this.map=L.map(this.host.nativeElement,{zoomControl:true}).setView([lat,lng],this.latitude!=null&&this.longitude!=null?16:11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(this.map);if(this.editable)this.map.on('click',(e:any)=>this.setPoint(e.latlng.lat,e.latlng.lng));this.syncMarker();setTimeout(()=>this.map?.invalidateSize(),0);}
 private setPoint(latitude:number,longitude:number){this.latitude=latitude;this.longitude=longitude;this.syncMarker();this.locationChange.emit({latitude,longitude});}
 private syncMarker(){if(!this.map||!this.leaflet)return;const has=this.latitude!=null&&this.longitude!=null;if(!has){if(this.marker){this.marker.remove();this.marker=null;}return;}const point:[number,number]=[this.latitude!,this.longitude!];if(!this.marker)this.marker=this.leaflet.circleMarker(point,{radius:8,weight:3,fillOpacity:.85}).addTo(this.map);else this.marker.setLatLng(point);this.map.setView(point,16);}
}
