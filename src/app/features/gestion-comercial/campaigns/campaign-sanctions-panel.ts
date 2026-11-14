import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faPen, faPlus, faRotate, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';
import { PermissionService } from '../../../core/access/permission.service';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../shared/feedback/toast-center/toast.service';
import {
  CampaignSanctionsApiService, SaleSanctionCatalog, SaleSanctionTariff, SalePartnerSanction,
} from './campaign-sanctions-api.service';

type Mode = 'catalog' | 'campaign' | 'partner';

@Component({
  selector: 'app-campaign-sanctions-panel', standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './campaign-sanctions-panel.html',
  styleUrl: './campaign-sanctions-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSanctionsPanel implements OnChanges, OnInit {
  @Input() mode: Mode = 'campaign';
  @Input() readOnly = false;
  @Input() campaignId = 0;
  @Input() participantId = 0;
  @Input() assigned = 0;
  @Input() received = 0;
  @Output() changed = new EventEmitter<void>();
  @Output() infoLoaded = new EventEmitter<SalePartnerSanction | null>();
  private inputChanged = false;
  private readonly api = inject(CampaignSanctionsApiService);
  readonly permission = inject(PermissionService);
  private readonly toast = inject(ToastService);
  readonly addIcon = faPlus;
  readonly editIcon = faPen;
  readonly disableIcon = faBan;
  readonly closeIcon = faXmark;
  readonly reloadIcon = faRotate;

  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly catalog = signal<SaleSanctionCatalog[]>([]);
  readonly tariffs = signal<SaleSanctionTariff[]>([]);
  readonly available = signal<{id:number;nombre:string}[]>([]);
  readonly partnerInfo = signal<SalePartnerSanction | null>(null);
  readonly modal = signal<'catalog'|'tariff'|'partner'|'remove'|'disableCatalog'|'disableTariff'|null>(null);
  readonly removalId = signal<number | null>(null);
  readonly removalName = signal('');
  readonly editCatalogId = signal<number|null>(null);
  readonly newName = signal('');
  readonly newDescription = signal('');
  readonly selectedSanctionId = signal<number|null>(null);
  readonly discount = signal('');
  readonly selectedTariffId = signal<number|null>(null);
  readonly scope = signal<'TODAS'|'CANTIDAD'>('TODAS');
  readonly quantity = signal('');
  readonly comment = signal('');
  readonly remaining = () => Math.max(0, this.assigned - this.received);
  readonly ratesAvailable = () => this.tariffs().filter(t => t.activo);

  ngOnChanges(): void { this.inputChanged = true; this.reload(); }
  ngOnInit(): void { if (!this.inputChanged) this.reload(); }
  reload(): void {
    if (this.mode !== 'catalog' && this.campaignId < 1) return;
    if (this.mode === 'partner' && this.participantId < 1) return;
    this.loading.set(true); this.error.set(null);
    if (this.mode === 'catalog') {
      this.api.catalog().pipe(finalize(() => this.loading.set(false))).subscribe({
        next: data => this.catalog.set(data.items ?? []),
        error: e => this.error.set(mapOpenApiError(e).message),
      });
    } else if (this.mode === 'campaign') {
      this.api.rates(this.campaignId).pipe(finalize(() => this.loading.set(false))).subscribe({
        next: data => { this.tariffs.set(data.items ?? []); this.available.set(data.disponibles ?? []); },
        error: e => this.error.set(mapOpenApiError(e).message),
      });
    } else {
      forkJoin({rates:this.api.rates(this.campaignId), partner:this.api.partner(this.campaignId,this.participantId)})
        .pipe(finalize(() => this.loading.set(false))).subscribe({
          next: data => { this.tariffs.set(data.rates.items ?? []); this.partnerInfo.set(data.partner); this.infoLoaded.emit(data.partner); },
          error: e => this.error.set(mapOpenApiError(e).message),
        });
    }
  }
  openCatalog(item?: SaleSanctionCatalog): void {
    if (this.readOnly || !this.permission.has(item ? 'SANCIONES_EDITAR' : 'SANCIONES_CREAR')) return;
    this.editCatalogId.set(item?.id ?? null);
    this.newName.set(item?.nombre ?? '');
    this.newDescription.set(item?.descripcion ?? '');
    this.modal.set('catalog');
  }
  openTariff(item?: SaleSanctionTariff): void {
    if (this.readOnly || !this.permission.has('SANCIONES_CONFIGURAR')) return;
    this.selectedSanctionId.set(item?.sancionId ?? this.available()[0]?.id ?? null);
    this.discount.set(item?.descuentoKg != null ? String(item.descuentoKg) : '');
    this.modal.set('tariff');
  }
  openPartner(): void {
    if (this.readOnly || !this.permission.has('SANCIONES_APLICAR') || this.remaining() === 0) return;
    const active = this.partnerInfo()?.asignacion;
    this.selectedTariffId.set(active?.tarifaId ?? this.ratesAvailable()[0]?.tarifaId ?? null);
    this.scope.set(active?.alcance ?? 'TODAS');
    this.quantity.set(active?.alcance==='CANTIDAD' && active.hastaNumero != null ? String(active.hastaNumero - active.desdeNumero + 1) : '');
    this.comment.set(active?.comentario ?? '');
    this.modal.set('partner');
  }
  close(): void { if (!this.busy()) this.modal.set(null); }
  private done(message: string): void {
    this.toast.success(message);
    this.modal.set(null);
    this.reload();
    this.changed.emit();
  }
  private failed(e: unknown): void { this.toast.error('No se pudo guardar',mapOpenApiError(e).message); }
  save(): void {
    if (this.readOnly || this.busy() || !this.modal()) return;
    const modal = this.modal();
    if (modal === 'catalog') {
      const nombre = this.newName().trim(), descripcion = this.newDescription().trim();
      if (!nombre || nombre.length>120 || descripcion.length>300) return;
      const id = this.editCatalogId();
      const op = id ? this.api.editCatalog(id,{nombre,descripcion}) : this.api.createCatalog({nombre,descripcion});
      this.busy.set(true);
      op.pipe(finalize(() => this.busy.set(false))).subscribe({next:()=>this.done('Catálogo actualizado'),error:e=>this.failed(e)});
    } else if (modal === 'tariff') {
      const sancionId=this.selectedSanctionId(), descuentoKg=Number(this.discount());
      if (!sancionId || !Number.isFinite(descuentoKg) || descuentoKg<=0 || !/^\d+(?:\.\d{1,4})?$/.test(this.discount())) return;
      this.busy.set(true);
      this.api.saveRate(this.campaignId,{sancionId,descuentoKg}).pipe(finalize(()=>this.busy.set(false)))
        .subscribe({next:()=>this.done('Descuento configurado'),error:e=>this.failed(e)});
    } else if (modal === 'partner') {
      const tarifaId=this.selectedTariffId(), cantidad=this.scope()==='CANTIDAD'?Number(this.quantity()):null;
      const comentario=this.comment().trim();
      if (!tarifaId || comentario.length<10 || comentario.length>500 ||
          this.scope()==='CANTIDAD' && (cantidad===null || !Number.isInteger(cantidad) || cantidad<1 || cantidad>this.remaining())) return;
      this.busy.set(true);
      this.api.assign(this.campaignId,this.participantId,{tarifaId,alcance:this.scope(),cantidad,comentario})
        .pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>this.done('Sanción asignada'),error:e=>this.failed(e)});
    } else if (modal === 'disableCatalog') {
      const id=this.removalId(); if (!id) return;
      this.busy.set(true);
      this.api.disableCatalog(id).pipe(finalize(()=>this.busy.set(false)))
        .subscribe({next:()=>this.done('Sanción deshabilitada'),error:e=>this.failed(e)});
    } else if (modal === 'disableTariff') {
      const id=this.removalId(); if (!id) return;
      this.busy.set(true);
      this.api.disableRate(this.campaignId,id).pipe(finalize(()=>this.busy.set(false)))
        .subscribe({next:()=>this.done('Descuento deshabilitado'),error:e=>this.failed(e)});
    } else if (modal === 'remove') {
      const motivo=this.comment().trim();
      if (motivo.length<10 || motivo.length>500) return;
      this.busy.set(true);
      this.api.remove(this.campaignId,this.participantId,motivo).pipe(finalize(()=>this.busy.set(false)))
        .subscribe({next:()=>this.done('Sanción retirada'),error:e=>this.failed(e)});
    }
  }
  disableCatalog(item: SaleSanctionCatalog): void {
    if (this.readOnly || !this.permission.has('SANCIONES_RETIRAR') || this.busy()) return;
    this.removalId.set(item.id); this.removalName.set(item.nombre); this.modal.set('disableCatalog');
  }
  disableTariff(item: SaleSanctionTariff): void {
    if (this.readOnly || !this.permission.has('SANCIONES_CONFIGURAR') || this.busy()) return;
    this.removalId.set(item.tarifaId); this.removalName.set(item.nombre); this.modal.set('disableTariff');
  }
  removeAssignment(): void {
    if (this.readOnly || !this.permission.has('SANCIONES_APLICAR') || !this.partnerInfo()?.asignacion?.activo) return;
    this.comment.set(''); this.modal.set('remove');
  }
  setScope(value: string): void { this.scope.set(value==='CANTIDAD'?'CANTIDAD':'TODAS'); }
}
