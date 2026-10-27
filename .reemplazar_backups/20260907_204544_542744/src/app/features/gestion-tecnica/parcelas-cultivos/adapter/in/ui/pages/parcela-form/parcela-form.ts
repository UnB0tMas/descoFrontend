import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faLayerGroup, faPen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { AdminModalResult } from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearParcelaUseCase } from '../../../../../application/use-case/crear-parcela.use-case';
import { EditarParcelaUseCase } from '../../../../../application/use-case/editar-parcela.use-case';
import { Parcela } from '../../../../../domain/parcela.model';
interface PredioOption {
    id: number;
    label: string;
    codigo: string;
}
@Component({ selector: 'app-parcela-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent], templateUrl: './parcela-form.html', styleUrl: './parcela-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class ParcelaFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly create = inject(CrearParcelaUseCase);
    private readonly update = inject(EditarParcelaUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly current = signal<Parcela | null>(null);
    readonly options = signal<readonly PredioOption[]>([]);
    readonly error = signal<string | null>(null);
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly pageIcon = faLayerGroup;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly form = this.fb.nonNullable.group({ predioId: [0, [Validators.required, Validators.min(1)]], codigo: ['', [Validators.required, Validators.maxLength(40)]], nombre: ['', [Validators.required, Validators.maxLength(150)]], areaHa: [0, [Validators.required, Validators.min(.0001)]] });
    open(options: readonly PredioOption[], current: Parcela | null = null) { this.current.set(current); this.options.set(options); this.error.set(null); this.form.reset({ predioId: current?.predioId ?? options[0]?.id ?? 0, codigo: current?.codigo ?? '', nombre: current?.nombre ?? '', areaHa: current?.areaHa ?? 0 }); this.dialog.nativeElement.showModal(); return new Promise<AdminModalResult>(resolve => this.resolver = resolve); }
    close() { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    save() { this.form.markAllAsTouched(); if (this.form.invalid || this.saving())
        return; const v = this.form.getRawValue(), input = { predioId: Number(v.predioId), codigo: v.codigo.trim().toUpperCase(), nombre: v.nombre.trim(), areaHa: Number(v.areaHa) }; this.saving.set(true); this.error.set(null); const op: Observable<unknown> = this.current() ? this.update.execute(this.current()!.parcelaId, input) : this.create.execute(input); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(this.current() ? 'Parcela actualizada' : 'Parcela registrada'); this.finish({ saved: true, value: null }); }, error: e => this.error.set(mapOpenApiError(e).message) }); }
    private finish(r: AdminModalResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; this.current.set(null); }
}
