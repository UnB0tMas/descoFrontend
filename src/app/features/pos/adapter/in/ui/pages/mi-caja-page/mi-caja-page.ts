import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { faCashRegister } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { PermissionService } from '../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { E3FileDropzoneComponent } from '../../../../../../../shared/files/file-dropzone/file-dropzone';
import { CajaEvidenciaService } from '../../../../../shared/caja-evidencia.service';
import { CajaArqueoPanelComponent } from '../../../../../shared/ui/caja-arqueo-panel/caja-arqueo-panel';
import { CajaArqueo } from '../../../../../shared/caja-pos-api.service';
import { CajaDisponible, CajaPosApiService, CajaSesion } from '../../../../../shared/caja-pos-api.service';
@Component({selector:'app-mi-caja-page',standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,PageHeaderComponent,E3FileDropzoneComponent,CajaArqueoPanelComponent],
  templateUrl:'./mi-caja-page.html',styleUrl:'./mi-caja-page.css',
  changeDetection:ChangeDetectionStrategy.OnPush})
export class MiCajaPage {
  @ViewChild(CajaArqueoPanelComponent) private arqueoPanel?:CajaArqueoPanelComponent;
  @ViewChild('abrirDialog') private abrirDialog?:ElementRef<HTMLDialogElement>;
  @ViewChild('cerrarDialog') private cerrarDialog?:ElementRef<HTMLDialogElement>;
  readonly icon=faCashRegister;
  readonly uot=inject(UotContextStore);
  readonly permisos=inject(PermissionService);
  private readonly api=inject(CajaPosApiService);
  private readonly evidencias=inject(CajaEvidenciaService);
  private readonly toast=inject(ToastService);
  readonly loading=signal(false);readonly saving=signal(false);
  readonly error=signal<string|null>(null);readonly modalError=signal<string|null>(null);
  readonly cajas=signal<CajaDisponible[]>([]);readonly activa=signal<CajaSesion|null>(null);
  readonly saldoCierre=signal<CajaArqueo|null>(null);
  cajaId=0;fondo=0;contado=0;observacion='';observacionApertura='';fotosAbrir:File[]=[];fotosCerrar:File[]=[];
  private last=0;
  constructor(){effect(()=>{const id=this.uot.isGeneral()?0:this.uot.selectedId()??0;
    untracked(()=>{if(this.last===id)return;this.last=id;this.abrirDialog?.nativeElement.close();
      this.cerrarDialog?.nativeElement.close();this.cajas.set([]);this.activa.set(null);
      if(id)this.reload();});});}
  get uotId():number{return this.uot.isGeneral()?0:this.uot.selectedId()??0;}
  reload():void{
    const id=this.uotId;if(!id||this.loading()||this.saving())return;
    this.loading.set(true);this.error.set(null);
    forkJoin({cajas:this.api.disponibles(id),activa:this.api.activa(id)})
      .pipe(finalize(()=>this.loading.set(false))).subscribe({
        next:r=>{if(id===this.uotId){this.cajas.set(r.cajas);this.activa.set(r.activa);}},
        error:e=>this.error.set(mapOpenApiError(e).message),
      });
  }
  open():void{if(this.activa())return;
    this.cajaId=this.cajas()[0]?.cajaId??0;this.fondo=0;this.observacionApertura='';this.fotosAbrir=[];this.modalError.set(null);
    this.abrirDialog?.nativeElement.showModal();}
  simular():void{const t=this.activa();if(t)this.arqueoPanel?.simular(t.sesionId,this.uotId);}
  get diferenciaCierre():number {
    return Math.round((this.contado-(this.saldoCierre()?.saldoEsperado??this.contado))*100)/100;
  }
  close():void{const turno=this.activa();if(!turno)return;
    this.contado=0;this.observacion='';this.fotosCerrar=[];this.modalError.set(null);this.saldoCierre.set(null);
    const uotId=this.uotId;
    this.api.arqueo(turno.sesionId,uotId).subscribe({
      next:balance=>{if(uotId===this.uotId&&balance?.estado==='ABIERTA'){
        this.saldoCierre.set(balance);this.contado=balance.saldoEsperado;
        this.cerrarDialog?.nativeElement.showModal();
      }},
      error:e=>this.error.set(mapOpenApiError(e).message),
    });
  }
  abrir():void{if(!this.uotId||!this.cajaId||this.fondo<0||this.saving()||!this.permisos.has('CAJAS_ABRIR'))return;
    this.saving.set(true);this.modalError.set(null);
    // El servidor obtiene al operador desde la sesión autenticada.
    this.evidencias.cargar(this.uotId,this.fotosAbrir).pipe(switchMap(archivos=>
      this.api.abrir({uotId:this.uotId,cajaId:this.cajaId,saldoInicial:this.fondo,
        observacion:this.observacionApertura.trim()||undefined,archivos})))
      .pipe(finalize(()=>this.saving.set(false))).subscribe({
        next:()=>{this.abrirDialog?.nativeElement.close();this.toast.success('Caja abierta');this.saving.set(false);this.reload();},
        error:e=>this.modalError.set(mapOpenApiError(e).message),
      });
  }
  cerrar():void{const t=this.activa();if(!t||this.saving()||this.contado<0||!this.saldoCierre()||(this.diferenciaCierre!==0&&!this.observacion.trim())||!this.permisos.has('CAJAS_CERRAR'))return;
    this.saving.set(true);this.modalError.set(null);
    this.evidencias.cargar(this.uotId,this.fotosCerrar).pipe(switchMap(archivos=>
      this.api.cerrar(t.sesionId,{uotId:this.uotId,saldoDeclarado:this.contado,
        observacion:this.observacion.trim()||undefined,archivos})))
      .pipe(finalize(()=>this.saving.set(false))).subscribe({
        next:()=>{this.cerrarDialog?.nativeElement.close();this.toast.success('Caja cerrada');this.saving.set(false);this.reload();this.arqueoPanel?.imprimirCierre(t.sesionId,this.uotId);},
        error:e=>this.modalError.set(mapOpenApiError(e).message),
      });
  }
}
