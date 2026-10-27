import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCoins, faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { RegistrarAjustePrecioUseCase } from '../../../../../application/use-case/registrar-ajuste-precio.use-case';
export interface AjustePrecioFormResult {
    saved: boolean;
    id?: number;
}
@Component({ selector: 'app-ajuste-precio-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './ajuste-precio-form.html', styleUrl: './ajuste-precio-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class AjustePrecioFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly create = inject(RegistrarAjustePrecioUseCase);
    private readonly toast = inject(ToastService);
    private resolver: ((r: AjustePrecioFormResult) => void) | null = null;
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly pageIcon = faCoins;
    readonly saveIcon = faFloppyDisk;
    readonly closeIcon = faXmark;
    readonly form = this.fb.nonNullable.group({ participacionId: [0, [Validators.required, Validators.min(1)]], operativoVentaId: [0], condicionComercialId: [0], tipoAjuste: ['', Validators.required], precioOriginal: [0, [Validators.min(0)]], precioAplicado: [0, [Validators.min(0)]], montoAjuste: [0], porcentajeAjuste: [0, [Validators.min(0), Validators.max(100)]], motivo: ['', [Validators.required, Validators.maxLength(400)]] });
    open(): Promise<AjustePrecioFormResult> { this.form.reset({ participacionId: 0, operativoVentaId: 0, condicionComercialId: 0, tipoAjuste: '', precioOriginal: 0, precioAplicado: 0, montoAjuste: 0, porcentajeAjuste: 0, motivo: '' }); this.error.set(null); this.dialog.nativeElement.showModal(); return new Promise(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false }); }
    submit() { if (this.form.invalid || this.saving()) {
        this.form.markAllAsTouched();
        return;
    } const v = this.form.getRawValue(); this.saving.set(true); this.create.execute({ participacionId: v.participacionId, operativoVentaId: v.operativoVentaId > 0 ? v.operativoVentaId : undefined, condicionComercialId: v.condicionComercialId > 0 ? v.condicionComercialId : undefined, tipoAjuste: v.tipoAjuste.trim(), precioOriginal: v.precioOriginal || undefined, precioAplicado: v.precioAplicado || undefined, montoAjuste: v.montoAjuste || undefined, porcentajeAjuste: v.porcentajeAjuste || undefined, motivo: v.motivo.trim() }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: id => { this.toast.success('Ajuste registrado'); this.finish({ saved: true, id }); }, error: e => { const m = mapOpenApiError(e).message; this.error.set(m); this.toast.error('No se pudo registrar el ajuste', m); } }); }
    private finish(r: AjustePrecioFormResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; }
}
