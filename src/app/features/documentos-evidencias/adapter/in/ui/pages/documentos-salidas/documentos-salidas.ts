import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../../../../../shared/layout/page-header/page-header';
import { LoadingStateComponent } from '../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../shared/data-display/empty-state/empty-state';
import { SalidaDocumentoApiService, DocumentoSalida } from '../../../../../../../shared/files/salida-documento-api.service';
import { UotContextStore } from '../../../../../../uot/state/uot-context.store';
import { mapOpenApiError } from '../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons';

@Component({
 selector:'app-documentos-salidas',standalone:true,
 imports:[DatePipe,RouterLink,PageHeaderComponent,LoadingStateComponent,ErrorStateComponent,EmptyStateComponent],
 templateUrl:'./documentos-salidas.html',
 styleUrl:'./documentos-salidas.css',
 changeDetection:ChangeDetectionStrategy.OnPush
})
export class DocumentosSalidasPage implements OnInit {
 readonly docs=inject(SalidaDocumentoApiService);
 private readonly uot=inject(UotContextStore);
 readonly icon=faFolderOpen;
 readonly loading=signal(true);
 readonly error=signal<string|null>(null);
 readonly items=signal<DocumentoSalida[]>([]);
 ngOnInit(){this.load();}
 load(){
  this.loading.set(true);this.error.set(null);
  const filter=this.uot.isGeneral()?undefined:this.uot.selectedId()??undefined;
  this.docs.misDocumentos(filter).pipe(finalize(()=>this.loading.set(false))).subscribe({
   next:items=>this.items.set(items),
   error:e=>this.error.set(mapOpenApiError(e).message)
  });
 }
}
