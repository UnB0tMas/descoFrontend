import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faRotate, faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { mapOpenApiError } from '../../../infrastructure/openapi/openapi-http-error.mapper';
import { ListViewSwitchComponent } from '../../../shared/data-display/list-view-switch/list-view-switch';
import { RecordCardComponent } from '../../../shared/data-display/record-card/record-card';
import { PaginatorComponent } from '../../../shared/data-display/paginator/paginator';
import { EmptyStateComponent } from '../../../shared/data-display/empty-state/empty-state';
import { LoadingStateComponent } from '../../../shared/data-display/loading-state/loading-state';
import { ErrorStateComponent } from '../../../shared/data-display/error-state/error-state';
import { PageHeaderComponent } from '../../../shared/layout/page-header/page-header';
import { CampaignSaleProcessApiService, SaleProcessDetail, SaleParticipant } from './campaign-sale-process-api.service';

type View = 'table' | 'cards';
type Status = 'all' | 'pending' | 'complete';

@Component({
  selector: 'app-campaign-sale-process', standalone: true,
  imports: [CommonModule, FaIconComponent, ListViewSwitchComponent, RecordCardComponent,
    PaginatorComponent, EmptyStateComponent, LoadingStateComponent, ErrorStateComponent, PageHeaderComponent],
  templateUrl: './campaign-sale-process.html', styleUrl: './campaign-sale-process.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSaleProcessPage implements OnInit {
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CampaignSaleProcessApiService);
  readonly scaleIcon = faScaleBalanced;
  readonly reloadIcon = faRotate;
  readonly detailIcon = faArrowRight;
  readonly id = signal(0);
  readonly detail = signal<SaleProcessDetail | null>(null);
  readonly view = signal<View>('table');
  readonly search = signal('');
  readonly status = signal<Status>('all');
  readonly page = signal(1);
  readonly size = signal(10);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filtered = computed(() => (this.detail()?.socios ?? []).filter(s => {
    const text = this.search().trim().toLocaleLowerCase('es');
    const match = !text || `${s.socioNombre} ${s.documento}`.toLocaleLowerCase('es').includes(text);
    const state = this.status();
    return match && (state === 'all' || state === 'complete' && s.recepcionConfirmada === true ||
      state === 'pending' && s.recepcionConfirmada !== true);
  }));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  readonly visible = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  readonly totalAssigned = computed(() => (this.detail()?.socios ?? []).reduce((n, s) => n + s.asignadas, 0));
  readonly totalReceived = computed(() => (this.detail()?.socios ?? []).reduce((n, s) => n + s.devueltas, 0));
  readonly totalGross = computed(() => (this.detail()?.socios ?? []).reduce((n, s) => n + Number(s.pesoBrutoKg), 0));
  readonly totalNet = computed(() => (this.detail()?.socios ?? []).reduce((n, s) => n + Number(s.pesoNetoKg), 0));

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!Number.isSafeInteger(id) || id <= 0) {
        void this.router.navigate(['/gestion-comercial/campanias']);
        return;
      }
      void this.router.navigate(['/gestion-comercial/campanias', id],
        { queryParams: { tab: 'venta' }, replaceUrl: true });
    });
  }
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.detail(this.id()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: data => {
        this.detail.set({ ...data, socios: data.socios ?? [], calibres: data.calibres ?? [] });
        this.goTo(this.page());
      },
      error: err => this.error.set(mapOpenApiError(err).message),
    });
  }
  searchFor(value: string): void { this.search.set(value); this.page.set(1); }
  setStatus(value: string): void { this.status.set(value as Status); this.page.set(1); }
  goTo(page: number): void { this.page.set(Math.max(1, Math.min(page, this.totalPages()))); }
  setSize(size: number): void { this.size.set(size); this.page.set(1); }
  details(partner: SaleParticipant): void {
    void this.router.navigate(['/gestion-comercial/campanias', this.id(), 'proceso-venta', 'socios', partner.participacionId]);
  }
}
