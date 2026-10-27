import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCashRegister, faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { RegistrarCobroCompradorUseCase } from '../../../../../application/use-case/registrar-cobro-comprador.use-case';
export interface CobroCompradorFormResult {
    saved: boolean;
    id?: number;
}
@Component({ selector: 'app-cobro-comprador-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './cobro-comprador-form.html', styleUrl: './cobro-comprador-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class CobroCompradorFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly create = inject(RegistrarCobroCompradorUseCase);
    private readonly toast = inject(ToastService);
    private resolver: ((r: CobroCompradorFormResult) => void) | null = null;
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly pageIcon = faCashRegister;
    readonly saveIcon = faFloppyDisk;
    readonly closeIcon = faXmark;
    readonly form = this.fb.nonNullable.group({ campaniaVentaId: [0, [Validators.required, Validators.min(1)]], operativoVentaId: [0], importe: [0, [Validators.required, Validators.min(.01)]], moneda: ['PEN', [Validators.required, Validators.maxLength(10)]], medioPago: ['', [Validators.required, Validators.maxLength(60)]], numeroOperacion: ['', [Validators.maxLength(120)]] });
    open(campaniaVentaId = 0, operativoVentaId = 0): Promise<CobroCompradorFormResult> { this.form.reset({ campaniaVentaId, operativoVentaId, importe: 0, moneda: 'PEN', medioPago: '', numeroOperacion: '' }); this.error.set(null); this.dialog.nativeElement.showModal(); return new Promise(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false }); }
    submit() { if (this.form.invalid || this.saving()) {
        this.form.markAllAsTouched();
        return;
    } const v = this.form.getRawValue(); this.saving.set(true); this.create.execute({ campaniaVentaId: v.campaniaVentaId, operativoVentaId: v.operativoVentaId > 0 ? v.operativoVentaId : undefined, importe: v.importe, moneda: v.moneda.trim().toUpperCase(), medioPago: v.medioPago.trim(), numeroOperacion: v.numeroOperacion.trim() || undefined }).pipe(finalize(() => this.saving.set(false))).subscribe({ next: id => { this.toast.success('Cobro registrado'); this.finish({ saved: true, id }); }, error: e => { const m = mapOpenApiError(e).message; this.error.set(m); this.toast.error('No se pudo registrar el cobro', m); } }); }
    private finish(r: CobroCompradorFormResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; }
}
