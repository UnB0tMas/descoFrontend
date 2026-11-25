import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { ApOption, EspecialArea, EspecialItem, EspecialJob, EspecialReportService } from '../../../../../../dashboard/adapter/in/ui/pages/dashboard-bi/apappss-insights.service';

@Component({selector:'app-especial-report',standalone:true,templateUrl:'./especial-report.html',
  styleUrl:'./especial-report.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class EspecialReportPanel implements OnInit {
  readonly area=input.required<EspecialArea>();
  readonly api=inject(EspecialReportService);
  private readonly toast=inject(ToastService);
  private readonly perms=inject(PermissionService);
  readonly today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  readonly desde=signal(this.today);readonly hasta=signal(this.today);
  readonly elegido=signal('');readonly formato=signal<'XLSX'|'PDF'|'DOCX'>('XLSX');
  readonly convenio=signal('');readonly socio=signal('');readonly predio=signal('');readonly campania=signal('');
  readonly filtros=signal<{convenios:ApOption[];socios:ApOption[];predios:ApOption[];campanias:ApOption[]}>({convenios:[],socios:[],predios:[],campanias:[]});
  readonly catalogo=signal<readonly EspecialItem[]>([]);readonly cargando=signal(true);readonly generando=signal(false);
  readonly error=signal('');
  readonly informes=computed(()=>this.catalogo().filter(c=>c.grupo===this.area()));
  readonly sanidad=computed(()=>this.elegido()==='AP_SANIDAD'||this.elegido()==='TEC_SANIDAD_DOC');
  readonly invalid=computed(()=>!this.elegido() || this.desde()>this.hasta() || this.hasta()>this.today ||
   (Date.parse(this.hasta()+'T00:00:00Z')-Date.parse(this.desde()+'T00:00:00Z'))/86400000>365 ||
   (this.area()==='APAPPSS' && !this.convenio()) || (this.sanidad() && !this.predio()));
  readonly recientes=computed(()=>this.api.trabajos().filter(x=>this.area()==='APAPPSS'?x.tipo.startsWith('AP_'):x.tipo==='TEC_SANIDAD_DOC'));
  ngOnInit():void {
    forkJoin({catalogo:this.api.catalogo(),filtros:this.api.filtros(),jobs:this.api.actualizar()}).pipe(finalize(()=>this.cargando.set(false)))
      .subscribe({next:r=>{this.catalogo.set(r.catalogo);this.filtros.set(r.filtros);
        this.elegido.set(r.catalogo.find(x=>x.grupo===this.area())?.codigo??'');
        this.formato.set(this.sanidad()?'PDF':'XLSX');
        this.convenio.set(r.filtros.convenios.length?String(r.filtros.convenios[0].id):'');
      },error:()=>this.error.set('No se pudieron cargar los informes.')});
  }
  elegir(code:string):void{this.elegido.set(code);this.formato.set(this.sanidad()?'PDF':'XLSX');}
  cambiar(event:Event,name:'desde'|'hasta'|'convenio'|'socio'|'predio'|'campania'|'formato'):void{
    const value=(event.target as HTMLInputElement|HTMLSelectElement).value;
    if(name==='desde')this.desde.set(value);if(name==='hasta')this.hasta.set(value);
    if(name==='convenio')this.convenio.set(value);if(name==='socio')this.socio.set(value);
    if(name==='predio')this.predio.set(value);if(name==='campania')this.campania.set(value);
    if(name==='formato'&&(value==='PDF'||value==='DOCX'))this.formato.set(value);
  }
  generar():void {
    if(this.invalid()||this.generando()||!this.perms.has('REPORTES_EXPORTAR'))return;
    this.generando.set(true);
    this.api.generar({tipo:this.elegido(),formato:this.formato(),desde:this.desde(),hasta:this.hasta(),clave:crypto.randomUUID(),
      ...(this.area()==='APAPPSS'?{convenioId:Number(this.convenio())}:{}),
      ...(this.socio()?{socioId:Number(this.socio())}:{}),...(this.predio()?{predioId:Number(this.predio())}:{}),
      ...(this.campania()?{campaniaId:Number(this.campania())}:{})})
     .pipe(finalize(()=>this.generando.set(false))).subscribe({next:()=>{
       this.toast.info('Informe en preparación','Puedes seguir trabajando.');this.actualizar();
     },error:()=>this.toast.error('No se pudo generar el informe.')});
  }
  actualizar():void{this.api.actualizar().subscribe({error:()=>{}});}
  descargar(job:EspecialJob):void {
    this.api.descargar(job).subscribe({
      next: file => {
        try { this.api.guardar(file, job); }
        catch { this.toast.error('No se pudo descargar el archivo.'); }
      },
      error: () => this.toast.error('Archivo no disponible.'),
    });
  }
}
