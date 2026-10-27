import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faReceipt, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { CrearGastoUseCase } from '../../../../../application/use-case/crear-gasto.use-case';
import { EditarGastoUseCase } from '../../../../../application/use-case/editar-gasto.use-case';
import { Gasto } from '../../../../../domain/gasto.model';
export interface GastoFormResult {
    saved: boolean;
    id?: number;
}
@Component({ selector: 'app-gasto-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './gasto-form.html', styleUrl: './gasto-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class GastoFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly create = inject(CrearGastoUseCase);
    private readonly update = inject(EditarGastoUseCase);
    private readonly toast = inject(ToastService);
    private resolver: ((r: GastoFormResult) => void) | null = null;
    readonly current = signal<Gasto | null>(null);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly pageIcon = faReceipt;
    readonly saveIcon = faFloppyDisk;
    readonly closeIcon = faXmark;
    readonly form = this.fb.nonNullable.group({ campaniaVentaId: [0, [Validators.required, Validators.min(1)]], operativoVentaId: [0], tipoGastoId: [0, [Validators.required, Validators.min(1)]], reglaProrrateoId: [0, [Validators.required, Validators.min(1)]], fecha: ['', Validators.required], concepto: ['', [Validators.required, Validators.maxLength(250)]], importe: [0, [Validators.required, Validators.min(.01)]], moneda: ['PEN', [Validators.required, Validators.maxLength(3)]] });
    open(x?: Gasto): Promise<GastoFormResult> { this.current.set(x ?? null); this.error.set(null); this.form.reset({ campaniaVentaId: x?.campaniaVentaId ?? 0, operativoVentaId: x?.operativoVentaId ?? 0, tipoGastoId: x?.tipoGastoId ?? 0, reglaProrrateoId: x?.reglaProrrateoId ?? 0, fecha: x?.fecha ?? new Date().toISOString().slice(0, 10), concepto: x?.concepto ?? '', importe: x?.importe ?? 0, moneda: x?.moneda ?? 'PEN' }); this.dialog.nativeElement.showModal(); return new Promise(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false }); }
    submit() { if (this.form.invalid || this.saving()) {
        this.form.markAllAsTouched();
        return;
    } const v = this.form.getRawValue(), x = this.current(), common = { tipoGastoId: v.tipoGastoId, reglaProrrateoId: v.reglaProrrateoId, fecha: v.fecha, concepto: v.concepto.trim(), importe: v.importe, moneda: v.moneda.toUpperCase() }; this.saving.set(true); const op: Observable<number | void> = x ? this.update.execute(x.gastoCampaniaId, common) : this.create.execute({ ...common, campaniaVentaId: v.campaniaVentaId, operativoVentaId: v.operativoVentaId > 0 ? v.operativoVentaId : undefined }); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: id => { this.toast.success(x ? 'Gasto actualizado' : 'Gasto registrado'); this.finish({ saved: true, id: typeof id === 'number' ? id : x?.gastoCampaniaId }); }, error: e => { const m = mapOpenApiError(e).message; this.error.set(m); this.toast.error(x ? 'No se pudo actualizar el gasto' : 'No se pudo registrar el gasto', m); } }); }
    private finish(r: GastoFormResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; }
}
