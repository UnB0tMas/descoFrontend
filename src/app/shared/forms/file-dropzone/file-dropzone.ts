import {CommonModule} from '@angular/common';
import {Component,ElementRef,EventEmitter,Input,OnDestroy,Output,ViewChild,ChangeDetectionStrategy} from '@angular/core';

interface ArchivoVisual {file:File;url:string|null;imagen:boolean;}

@Component({selector:'app-e3-file-dropzone',standalone:true,imports:[CommonModule],
 templateUrl:'./file-dropzone.html',styleUrl:'./file-dropzone.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class FileDropzoneComponent implements OnDestroy {
 @Input() multiple=true;
 @Input() maxFiles=5;
 @Input() maxSizeMb=25;
 @Input() allowedExtensions: readonly string[] | null = null;
 @Input() formatsLabel = 'JPG, PNG, WEBP, PDF, Word, Excel, TXT o CSV';
 @Input() accept = 'image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
 @Input() disabled=false;
 @Input() uploading=false;
 @Input() title='Fotografías o documentos';
 @Input() set files(value:File[]){
  const incoming=value??[];
  if(this.selected.length===incoming.length&&this.selected.every((file,index)=>file===incoming[index]))return;
  this.selected=[...incoming];this.syncPreviews();
 }
 @Output() filesChange=new EventEmitter<File[]>();
 @Output() invalid=new EventEmitter<string>();
 @ViewChild('fileInput') private input?:ElementRef<HTMLInputElement>;
 selected:File[]=[];
 previews:ArchivoVisual[]=[];
 dragging=false;
 private readonly urls=new Map<File,string>();
 open():void{if(!this.disabled&&!this.uploading)this.input?.nativeElement.click();}
 onInput(event:Event):void{
  const target=event.target as HTMLInputElement;
  this.add(Array.from(target.files??[]));target.value='';
 }
 dragOver(event:DragEvent):void{event.preventDefault();if(!this.disabled&&!this.uploading)this.dragging=true;}
 dragLeave(event:DragEvent):void{event.preventDefault();this.dragging=false;}
 drop(event:DragEvent):void{
  event.preventDefault();this.dragging=false;
  if(!this.disabled&&!this.uploading)this.add(Array.from(event.dataTransfer?.files??[]));
 }
 remove(index:number):void{
  if(this.disabled||this.uploading)return;
  this.filesChange.emit(this.selected.filter((_,i)=>i!==index));
 }
 size(bytes:number):string{return bytes<1048576?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1048576).toFixed(1)} MB`;}
 private add(files:File[]):void{
  if(!files.length)return;
  const valid=(f:File)=>{
   const extension=f.name.split('.').pop()?.toLowerCase()??'';
   return this.allowedExtensions ? this.allowedExtensions.includes(extension) : /\.(jpe?g|png|webp|pdf|docx?|xlsx?|txt|csv)$/i.test(f.name);
  };
  if(files.some(f=>!valid(f))){this.invalid.emit('Formato no permitido.');return;}
  if(files.some(f=>!f.size||f.size>this.maxSizeMb*1048576)){
   this.invalid.emit(`Cada archivo debe pesar como máximo ${this.maxSizeMb} MB.`);return;
  }
  const incoming=this.multiple?[...this.selected]:[];
  for(const f of files){
   if(!incoming.some(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified))incoming.push(f);
  }
  if(incoming.length>this.maxFiles){this.invalid.emit(`Puede seleccionar hasta ${this.maxFiles} archivos.`);return;}
  this.filesChange.emit(incoming);
 }
 private syncPreviews():void{
  const activos=new Set(this.selected);
  for(const [file,url] of this.urls){if(!activos.has(file)){URL.revokeObjectURL(url);this.urls.delete(file);}}
  this.previews=this.selected.map(file=>{
   const imagen=/^image\/(jpeg|png|webp)$/.test(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name);
   let url=this.urls.get(file)??null;
   if(imagen&&!url&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function'){
    url=URL.createObjectURL(file);this.urls.set(file,url);
   }
   return {file,url,imagen};
  });
 }
 ngOnDestroy():void{for(const url of this.urls.values())URL.revokeObjectURL(url);this.urls.clear();}
}
