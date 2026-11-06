import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faTrashCan, faUpload } from '@fortawesome/free-solid-svg-icons';

type Preview = { file: File; url: string };
@Component({selector:'app-image-upload',standalone:true,imports:[FaIconComponent],
 templateUrl:'./image-upload.html',styleUrl:'./image-upload.css',changeDetection:ChangeDetectionStrategy.OnPush})
export class ImageUploadComponent implements OnDestroy {
 @Input() maxMb=5;
 @Input() maxFiles=8;
 @Input() multiple=false;
 @Input() disabled=false;
 @Output() fileChange=new EventEmitter<File|null>();
 @Output() filesChange=new EventEmitter<File[]>();
 readonly previews=signal<Preview[]>([]);
 readonly error=signal<string|null>(null);
 readonly uploadIcon=faUpload;readonly imageIcon=faCamera;readonly trashIcon=faTrashCan;
 ngOnDestroy():void{this.previews().forEach(p=>URL.revokeObjectURL(p.url));}
 choose(input:HTMLInputElement):void {this.addFiles(Array.from(input.files??[]));input.value='';}
 drop(event:DragEvent):void {event.preventDefault();if(!this.disabled)this.addFiles(Array.from(event.dataTransfer?.files??[]));}
 private addFiles(files:File[]):void {
  if(this.disabled||!files.length)return;
  const valid=files.every(f=>['image/jpeg','image/png','image/webp'].includes(f.type)&&f.size>0&&f.size<=this.maxMb*1048576);
  if(!valid){this.error.set(`Admite JPG, PNG o WebP de hasta ${this.maxMb} MB por imagen.`);return;}
  const previous=this.multiple?this.previews():[];
  const nextFiles=files.filter(f=>!previous.some(p=>p.file.name===f.name&&p.file.size===f.size&&p.file.lastModified===f.lastModified));
  if(previous.length+nextFiles.length>(this.multiple?this.maxFiles:1)){
   this.error.set(`Máximo ${this.multiple?this.maxFiles:1} imágenes.`);return;
  }
  if(!this.multiple)this.previews().forEach(p=>URL.revokeObjectURL(p.url));
  this.previews.set([...previous,...nextFiles.map(file=>({file,url:URL.createObjectURL(file)}))]);
  this.error.set(null);this.emit();
 }
 remove(index:number):void{if(this.disabled)return;const old=this.previews();URL.revokeObjectURL(old[index].url);
   this.previews.set(old.filter((_,i)=>i!==index));this.emit();}
 clear():void{this.previews().forEach(p=>URL.revokeObjectURL(p.url));this.previews.set([]);this.error.set(null);this.emit();}
 private emit():void {const files=this.previews().map(p=>p.file);this.filesChange.emit(files);this.fileChange.emit(files[0]??null);}
}
