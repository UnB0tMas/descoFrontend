import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
/** Compatibilidad con enlaces previos: el alta se efectúa exclusivamente en el modal del listado. */
@Component({selector:'app-operativa-create',standalone:true,template:'',changeDetection:ChangeDetectionStrategy.OnPush})
export class OperativaCreatePage implements OnInit {
 private readonly router=inject(Router);private readonly route=inject(ActivatedRoute);
 ngOnInit():void {const convenioId=this.route.snapshot.queryParamMap.get('convenioId');
  void this.router.navigate(['/gestion-tecnica/salidas/operativas'],{replaceUrl:true,
    queryParams:convenioId?{convenioId,crear:1}:{crear:1}});
 }
}
