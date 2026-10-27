import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faBan, faCoins, faRotate } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { PermissionDirective } from '../../../../../../../../core/access/permission.directive';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ErrorStateComponent } from '../../../../../../../../shared/data-display/error-state/error-state';
import { LoadingStateComponent } from '../../../../../../../../shared/data-display/loading-state/loading-state';
import { ActionConfirmDialogComponent } from '../../../../../../../../shared/feedback/action-confirm-dialog/action-confirm-dialog';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { PageHeaderComponent } from '../../../../../../../../shared/layout/page-header/page-header';
import { AnularAjustePrecioUseCase } from '../../../../../application/use-case/anular-ajuste-precio.use-case';
import { VerImpactoAjusteUseCase } from '../../../../../application/use-case/ver-impacto-ajuste.use-case';
import { ImpactoAjuste } from '../../../../../domain/impacto-ajuste.model';
@Component({ selector: 'app-ajuste-precio-detail-page', standalone: true, imports: [DecimalPipe, RouterLink, FaIconComponent, PermissionDirective, ErrorStateComponent, LoadingStateComponent, ActionConfirmDialogComponent, PageHeaderComponent], templateUrl: './ajuste-precio-detail.html', styleUrl: './ajuste-precio-detail.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class AjustePrecioDetailPage implements OnInit {
    @ViewChild(ActionConfirmDialogComponent)
    private confirm!: ActionConfirmDialogComponent;
    private readonly route = inject(ActivatedRoute);
    private readonly get = inject(VerImpactoAjusteUseCase);
    private readonly cancelUseCase = inject(AnularAjustePrecioUseCase);
    private readonly toast = inject(ToastService);
    readonly id = Number(this.route.snapshot.paramMap.get('id'));
    readonly loading = signal(true);
    readonly cancelling = signal(false);
    readonly error = signal<string | null>(null);
    readonly item = signal<ImpactoAjuste | null>(null);
    readonly pageIcon = faCoins;
    readonly backIcon = faArrowLeft;
    readonly refreshIcon = faRotate;
    readonly cancelIcon = faBan;
    ngOnInit() { this.load(); }
    load() { this.loading.set(true); this.error.set(null); this.get.execute(this.id).pipe(finalize(() => this.loading.set(false))).subscribe({ next: x => this.item.set(x), error: e => this.error.set(mapOpenApiError(e).message) }); }
    async cancel() { if (this.cancelling())
        return; const r = await this.confirm.show({ title: 'Anular ajuste', message: 'El ajuste dejará de aplicarse según el estado del proceso.', confirmLabel: 'Anular', tone: 'danger', requiresReason: true, reasonLabel: 'Motivo', minimumReasonLength: 5 }); if (!r.confirmed || !r.reason)
        return; this.cancelling.set(true); this.cancelUseCase.execute(this.id, r.reason).pipe(finalize(() => this.cancelling.set(false))).subscribe({ next: () => { this.toast.success('Ajuste anulado'); this.load(); }, error: e => this.toast.error('No se pudo anular el ajuste', mapOpenApiError(e).message) }); }
}
