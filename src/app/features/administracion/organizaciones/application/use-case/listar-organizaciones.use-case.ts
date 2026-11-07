import {EMPTY,expand,reduce} from 'rxjs';
import {Empresa} from '../../domain/empresa.model';
import { inject, Injectable } from '@angular/core';

import {
  ORGANIZACIONES_GATEWAY,
  OrganizacionesGateway,
} from '../port/out/organizaciones.gateway';

@Injectable()
export class ListarOrganizacionesUseCase {
  private readonly gateway: OrganizacionesGateway = inject(ORGANIZACIONES_GATEWAY);

  execute(page: number, size: number, uotId?: number) {
    return this.gateway.list(page, size, uotId);
  }

  companies(uotId?:number) {
    return this.execute(1,100,uotId).pipe(
      expand(page=>page.page<page.totalPages?this.execute(page.page+1,100,uotId):EMPTY),
      reduce((items,page)=>[...items,...page.items.filter(item=>item.estado&&!item.esAsociacion)],[] as Empresa[]),
    );
  }

  areas(page: number, size: number, uotId?: number, empresaId?: number) {
    return this.gateway.listAreas(page, size, uotId, empresaId);
  }

  detail(id: number, uotId?: number) {
    return this.gateway.get(id, uotId);
  }
}
