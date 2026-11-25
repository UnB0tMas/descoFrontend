import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal, input, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { PermissionDirective } from '../../../../../../core/access/permission.directive';
import { PageHeaderComponent } from '../../../../../../shared/layout/page-header/page-header';
import { ActionConfirmDialogComponent } from '../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { DialogBackdropDirective } from '../../../../../../shared/feedback/dialog-lifecycle/dialog-backdrop.directive';
import { openAnimatedDialog, closeAnimatedDialog } from '../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { mapOpenApiError } from '../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { GestionDocumentariaApi, TipoDocumentoInterno } from '../../../../gestion-documentaria.api';
import { faListCheck, faPen, faBan } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({selector:'app-tipos-documentos',standalone:true,
  imports:[FormsModule,PermissionDirective,PageHeaderComponent,ActionConfirmDialogComponent,DialogBackdropDirective,FaIconComponent],
  styleUrls: ['../../../../../administracion/catalogos/adapter/in/ui/pages/catalogos-list/catalogos-list.css'],
  template:`<div [class.desco-page]="!embedded()">
    @if(!embedded()) {
    <app-page-header title="Tipos de documentos" subtitle="Administra los tipos disponibles." [icon]="icon">
      <div pageActions><button *appPermission="'CATALOGOS_CREAR'" class="admin-primary-button" type="button" (click)="create()">Nuevo tipo</button></div>
    </app-page-header>
    }
    @if(error()){<p class="admin-inline-error" role="alert">{{error()}}</p>}
    <section [class.admin-surface]="!embedded()" class="catalog-content">
      <header class="catalog-context">
        <div class="catalog-context-copy">
          <span class="catalog-context-icon" aria-hidden="true"><fa-icon [icon]="icon" /></span>
          <div><span class="catalog-context-kicker">Administración</span><h2>Tipos de documentos internos</h2><p>Correspondencia interna.</p></div>
        </div>
        <span class="catalog-context-count">{{filtrados().length}} registros</span>
      </header>
      <div class="catalog-search-filter">
        <label class="admin-field catalog-search-field">Buscar
          <input class="admin-input" type="search" [value]="buscar()" (input)="buscar.set($any($event.target).value)" placeholder="Nombre o código" />
        </label>
      </div>
      <nav class="catalog-status-tabs" aria-label="Estado de los tipos">
        <button type="button" class="catalog-status-tab" [class.catalog-status-tab--active]="estadoVista()==='ACTIVOS'" (click)="estadoVista.set('ACTIVOS')">Activos <span class="catalog-status-count">{{activos()}}</span></button>
        <button type="button" class="catalog-status-tab" [class.catalog-status-tab--active]="estadoVista()==='INACTIVOS'" (click)="estadoVista.set('INACTIVOS')">Inactivos <span class="catalog-status-count">{{inactivos()}}</span></button>
      </nav>
      <div class="admin-table-wrap catalog-table-wrap">
        <table class="admin-table"><thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          @for(t of filtrados();track t.id){<tr>
            <td><span class="admin-code">{{t.codigo}}</span></td>
            <td class="admin-table-primary">{{t.nombre}}</td>
            <td class="admin-table-muted">{{t.descripcion || '—'}}</td>
            <td><span class="admin-status" [class.admin-status--active]="t.estado" [class.admin-status--inactive]="!t.estado">{{t.estado?'Activo':'Inactivo'}}</span></td>
            <td><div class="admin-row-actions">
              @if(t.estado){
                <button *appPermission="'CATALOGOS_EDITAR'" class="admin-icon-button" type="button" title="Editar" aria-label="Editar" (click)="edit(t)"><fa-icon [icon]="editIcon" /></button>
                <button *appPermission="'CATALOGOS_RETIRAR'" class="admin-icon-button admin-icon-button--danger" type="button" title="Deshabilitar" aria-label="Deshabilitar" (click)="disable(t)"><fa-icon [icon]="disableIcon" /></button>
              }
            </div></td>
          </tr>} @empty {<tr><td colspan="5">Sin registros</td></tr>}
        </tbody></table>
      </div>
    </section>
    <dialog #editor appDialogBackdrop class="modal desco-modal" (cancel)="$event.preventDefault(); close()" aria-labelledby="doc-type-title">
      <div class="modal-box admin-modal-box w-full max-w-xl p-6">
        <header class="admin-modal-header"><div class="admin-modal-title-group"><div><p>Catálogos</p><h2 id="doc-type-title">{{editId?'Editar tipo':'Nuevo tipo'}}</h2></div></div>
          <button class="admin-icon-button" type="button" (click)="close()" [disabled]="saving()" aria-label="Cerrar">×</button>
        </header>
        @if(error()){<p role="alert" class="admin-inline-error">{{error()}}</p>}
        <form (ngSubmit)="save()" class="space-y-4 mt-4">
          <label class="admin-field">Código<input class="admin-input" name="codigo" [(ngModel)]="codigo" required maxlength="40" [disabled]="!!editId || saving()" /></label>
          <label class="admin-field">Nombre<input class="admin-input" name="nombre" [(ngModel)]="nombre" required maxlength="120" [disabled]="saving()" /></label>
          <label class="admin-field">Descripción<textarea class="admin-input" name="descripcion" [(ngModel)]="descripcion" maxlength="300" rows="3" [disabled]="saving()"></textarea></label>
          <footer class="modal-action"><button type="button" class="admin-secondary-button" (click)="close()" [disabled]="saving()">Cancelar</button>
            <button type="submit" class="admin-primary-button" [disabled]="saving()">{{saving()?'Guardando...':'Guardar'}}</button></footer>
        </form>
      </div>
    </dialog>
    <app-action-confirm-dialog />
  </div>`,changeDetection:ChangeDetectionStrategy.OnPush})
export class TiposDocumentosPage implements OnInit {
  @ViewChild('editor',{static:true}) private editor!: ElementRef<HTMLDialogElement>;
  @ViewChild(ActionConfirmDialogComponent) private confirmDialog!: ActionConfirmDialogComponent;
  private readonly api=inject(GestionDocumentariaApi);
  readonly embedded=input(false);
  readonly icon=faListCheck;
  readonly editIcon=faPen; readonly disableIcon=faBan;
  readonly tipos=signal<TipoDocumentoInterno[]>([]);
  readonly buscar=signal('');
  readonly estadoVista=signal<'ACTIVOS'|'INACTIVOS'>('ACTIVOS');
  readonly activos=computed(()=>this.tipos().filter(t=>t.estado).length);
  readonly inactivos=computed(()=>this.tipos().filter(t=>!t.estado).length);
  readonly filtrados=computed(()=>{
    const text=this.buscar().trim().toLocaleLowerCase();
    return this.tipos().filter(t=>Boolean(t.estado)===(this.estadoVista()==='ACTIVOS')&&
      (!text||`${t.codigo} ${t.nombre} ${t.descripcion??''}`.toLocaleLowerCase().includes(text)));
  });
  readonly error=signal<string|null>(null);
  readonly saving=signal(false);
  codigo='';nombre='';descripcion='';editId:number|null=null;
  ngOnInit():void{this.load();}
  load():void{this.api.listarTipos().subscribe({next:r=>this.tipos.set(r),error:e=>this.error.set(mapOpenApiError(e).message)});}
  create():void{this.reset();openAnimatedDialog(this.editor.nativeElement);}
  edit(t:TipoDocumentoInterno):void{this.editId=t.id;this.codigo=t.codigo;this.nombre=t.nombre;this.descripcion=t.descripcion??'';this.error.set(null);openAnimatedDialog(this.editor.nativeElement);}
  reset():void{this.editId=null;this.codigo='';this.nombre='';this.descripcion='';this.error.set(null);}
  close():void{if(!this.saving())closeAnimatedDialog(this.editor.nativeElement,()=>this.reset());}
  save():void{
    if(!this.codigo.trim()||!this.nombre.trim()||this.saving()) {this.error.set('Complete los datos requeridos.');return;}
    this.saving.set(true);this.error.set(null);
    const body={codigo:this.codigo.trim().toUpperCase(),nombre:this.nombre.trim(),descripcion:this.descripcion.trim()};
    const call=this.editId?this.api.editarTipo(this.editId,body):this.api.crearTipo(body);
    call.pipe(finalize(()=>this.saving.set(false))).subscribe({next:()=>{this.saving.set(false);this.close();this.load();},error:e=>this.error.set(mapOpenApiError(e).message)});
  }
  async disable(t:TipoDocumentoInterno):Promise<void>{
    const result=await this.confirmDialog.show({title:'Deshabilitar tipo',message:`¿Deshabilitar ${t.nombre}?`,tone:'danger',confirmLabel:'Deshabilitar'});
    if(!result.confirmed)return;
    this.error.set(null);
    this.api.deshabilitarTipo(t.id).subscribe({next:()=>this.load(),error:e=>this.error.set(mapOpenApiError(e).message)});
  }
}
