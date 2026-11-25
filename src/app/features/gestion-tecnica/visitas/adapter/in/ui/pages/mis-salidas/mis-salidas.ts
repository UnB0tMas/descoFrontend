import { ChangeDetectionStrategy, Component, ViewChild, AfterViewInit, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faRoute, faRotate, faCircleXmark, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { Observable, finalize } from 'rxjs';
import { SalidasE2UseCase } from '../../../../../../salidas/e2/application/use-case/salidas-e2.use-case';
import { provideSalidasE2 } from '../../../../../../salidas/e2/salidas-e2.providers';
import { UotContextStore } from '../../../../../../../uot/state/uot-context.store';
import { SalidasTecnicasApi } from '../../../../../../salidas/e2/adapter/out/http/salidas-tecnicas.api';
import { MiSalidaResumen } from '../../../../../../salidas/e2/domain/salida-personal.model';
import { ModuleAccessService } from '../../../../../../../../core/access/module-access.service';
import { PermissionService } from '../../../../../../../../core/access/permission.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { ListViewSwitchComponent } from '../../../../../../../../shared/data-display/list-view-switch/list-view-switch';
import { RecordCardComponent } from '../../../../../../../../shared/data-display/record-card/record-card';
import { PaginatorComponent } from '../../../../../../../../shared/data-display/paginator/paginator';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { EmptyStateComponent } from '../../../../../../../../shared/data-display/empty-state/empty-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { SolicitudSalidaTecnicaModal } from '../../../../../../salidas/e2/adapter/in/ui/pages/solicitud-tecnica/solicitud-tecnica';

@Component({
  selector: 'app-mis-salidas-tecnicas',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, FaIconComponent, PageHeaderComponent,
    ListViewSwitchComponent, RecordCardComponent, PaginatorComponent,
    LoadingStateComponent, ErrorStateComponent, EmptyStateComponent, ActionConfirmDialogComponent, SolicitudSalidaTecnicaModal],
  providers: [...provideSalidasE2()],
  templateUrl: './mis-salidas.html',
  styleUrl: './mis-salidas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisSalidasTecnicasPage implements AfterViewInit {
  @ViewChild(SolicitudSalidaTecnicaModal) private solicitudModal!: SolicitudSalidaTecnicaModal;
  abrirSolicitud(borradorId?:number):void{this.solicitudModal.open(borradorId);}
  ngAfterViewInit():void {
    if(this.route.snapshot.queryParamMap.get('solicitar')!=='1')return;
    const borrador=Number(this.route.snapshot.queryParamMap.get('borrador'))||undefined;
    this.abrirSolicitud(borrador);
    void this.router.navigate([], {relativeTo:this.route,replaceUrl:true,queryParamsHandling:'merge',
      queryParams:{solicitar:null,borrador:null}});
  }
  @ViewChild(ActionConfirmDialogComponent) private confirm!: ActionConfirmDialogComponent;
  private readonly api = inject(SalidasTecnicasApi);
  private readonly e2 = inject(SalidasE2UseCase);
  private readonly uot = inject(UotContextStore);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly icon = faRoute;
  readonly viewIcon = faEye;
  readonly fichaIcon = faFileLines;
  private readonly modules = inject(ModuleAccessService);
  canViewFicha(): boolean {return this.permissions.has('SALIDAS_VER') && this.modules.has('SALIDAS');}
  fichaParams(): Record<string, string | number | null> {return {...this.detailParams(),origen:'mis-salidas'};}
  readonly cancelIcon = faCircleXmark;
  readonly refreshIcon = faRotate;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<MiSalidaResumen[]>([]);
  readonly total = signal(0);
  readonly cancellingId = signal<number | null>(null);
  readonly uotId = this.uot.selectedId;
  canView(): boolean {return this.permissions.hasAll(['SALIDAS_VER', 'VISITAS_VER']);}
  canCreate(): boolean {return this.permissions.has('SALIDAS_CREAR');}
  canSupervise(): boolean {return this.permissions.hasAll(['SALIDAS_LISTAR', 'SALIDAS_CONFIRMAR']);}
  vista: 'tabla' | 'tarjetas' = 'tabla';
  buscar = this.route.snapshot.queryParamMap.get('buscar') ?? '';
  estado = this.route.snapshot.queryParamMap.get('estado') ?? '';
  page = Math.max(1, Number(this.route.snapshot.queryParamMap.get('pagina')) || 1);
  size = [10, 20, 50, 100].includes(Number(this.route.snapshot.queryParamMap.get('tamano')))
    ? Number(this.route.snapshot.queryParamMap.get('tamano')) : 20;
  private sequence = 0;

  private readonly watchUot = effect(() => {
    const uotId = this.uotId();
    untracked(() => {
      if (uotId) this.load(this.page);
      else {
        this.sequence++;
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.error.set('Seleccione una unidad territorial.');
      }
    });
  });

  load(page = this.page, size = this.size): void {
    const uotId = this.uotId();
    if (!uotId) return;
    this.page = page;
    this.size = size;
    const request = ++this.sequence;
    this.loading.set(true);
    this.error.set(null);
    void this.router.navigate([], {
      relativeTo: this.route, replaceUrl: true, queryParamsHandling: 'merge',
      queryParams: {buscar: this.buscar.trim() || null, estado: this.estado || null,
        pagina: page, tamano: size},
    });
    this.api.misSalidas(uotId, {buscar: this.buscar.trim() || undefined,
      estado: this.estado || undefined, pagina: page, tamano: size})
      .pipe(finalize(() => {if (request === this.sequence) this.loading.set(false);})).subscribe({
        next: data => {
          if (request !== this.sequence) return;
          this.items.set(data.items ?? []);
          this.total.set(data.total ?? 0);
        },
        error: err => {
          if (request === this.sequence) this.error.set(mapOpenApiError(err).message);
        },
      });
  }

  canCancel(item: MiSalidaResumen): boolean {
    return (item.estado === 'BORRADOR' && this.permissions.has('SALIDAS_EDITAR'))
      || (item.estado === 'SOLICITADA' && item.puedeCancelar === true
        && this.permissions.has('SALIDAS_RETIRAR'));
  }

  async cancelar(item: MiSalidaResumen): Promise<void> {
    const uotId = this.uotId();
    if (!uotId || !this.canCancel(item) || this.cancellingId() !== null) return;
    const borrador = item.estado === 'BORRADOR';
    const confirmation = await this.confirm.show(borrador
      ? {title:'Descartar borrador', message:'El borrador dejará de mostrarse entre tus salidas.',
          confirmLabel:'Descartar borrador', tone:'danger'}
      : {title:'Cancelar solicitud', message:'La solicitud quedará cancelada y conservará su historial.',
          confirmLabel:'Cancelar solicitud', tone:'danger', requiresReason:true,
          reasonLabel:'Motivo', minimumReasonLength:5});
    if (!confirmation.confirmed || (!borrador && !confirmation.reason)
        || this.cancellingId() !== null || this.uotId() !== uotId) return;
    this.cancellingId.set(item.salidaId);
    const request: Observable<unknown> = borrador
      ? this.e2.cancelar(uotId, item.salidaId, 'BORRADOR_DESCARTADO')
      : this.api.cancelar(uotId, item.salidaId, confirmation.reason!);
    request.pipe(finalize(() => this.cancellingId.set(null))).subscribe({
      next: () => {this.toast.success(borrador ? 'Borrador descartado' : 'Solicitud cancelada'); this.load();},
      error: (err: unknown) => {this.toast.error('No se pudo cancelar', mapOpenApiError(err).message); this.load();},
    });
  }

  detailParams(): Record<string, string | number | null> {
    return {buscar: this.buscar.trim() || null, estado: this.estado || null,
      pagina: this.page, tamano: this.size};
  }

  totalPages(): number {return Math.ceil(this.total() / this.size);}

  estadoTexto(estado: string): string {
    const names: Record<string, string> = {
      BORRADOR: 'Borrador', SOLICITADA: 'Pendiente de aprobación',
      OBSERVADA: 'Observada', RECHAZADA: 'Rechazada',
      APROBADA: 'Aprobada', EN_EJECUCION: 'En ejecución',
      EN_RETORNO: 'En retorno', CERRADA: 'Cerrada', CANCELADA: 'Cancelada',
    };
    return names[estado] ?? estado;
  }
}
