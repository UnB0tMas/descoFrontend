import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faPen, faSeedling, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearCultivoUseCase } from '../../../../../application/use-case/crear-cultivo.use-case';
import { EditarCultivoUseCase } from '../../../../../application/use-case/editar-cultivo.use-case';
import { Cultivo } from '../../../../../domain/cultivo.model';
@Component({ selector: 'app-cultivo-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './cultivo-form.html', styleUrl: './cultivo-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class CultivoFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly refs = inject(ReferenceDataService);
    private readonly create = inject(CrearCultivoUseCase);
    private readonly update = inject(EditarCultivoUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly referencesLoading = signal(false);
    readonly current = signal<Cultivo | null>(null);
    readonly parcelaId = signal(0);
    readonly varieties = signal<readonly AdminSelectOption[]>([]);
    readonly error = signal<string | null>(null);
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly addIcon = faSeedling;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly form = this.fb.nonNullable.group({ variedadPaltaId: [0, [Validators.required, Validators.min(1)]], fechaInicio: ['', [Validators.required]] });
    open(parcelaId: number, current: Cultivo | null = null) { this.parcelaId.set(parcelaId); this.current.set(current); this.error.set(null); this.form.reset({ variedadPaltaId: current?.variedadPaltaId ?? 0, fechaInicio: current?.fechaInicio?.slice(0, 10) ?? new Date().toISOString().slice(0, 10) }); this.loadVarieties(); this.dialog.nativeElement.showModal(); return new Promise<AdminModalResult>(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    save() { this.form.markAllAsTouched(); if (this.form.invalid || this.saving())
        return; const v = this.form.getRawValue(); this.saving.set(true); const op: Observable<unknown> = this.current() ? this.update.execute(this.current()!.parcelaCultivoId, { variedadPaltaId: Number(v.variedadPaltaId), fechaInicio: v.fechaInicio }) : this.create.execute(this.parcelaId(), { parcelaId: this.parcelaId(), variedadPaltaId: Number(v.variedadPaltaId), fechaInicio: v.fechaInicio }); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(this.current() ? 'Cultivo actualizado' : 'Cultivo registrado'); this.finish({ saved: true, value: null }); }, error: e => this.error.set(mapOpenApiError(e).message) }); }
    private loadVarieties() { this.referencesLoading.set(true); this.refs.catalog('VARIEDAD_PALTA').pipe(finalize(() => this.referencesLoading.set(false))).subscribe({ next: r => { this.varieties.set(r.map(x => ({ value: Number(x.id), label: x.label, description: x.code }))); if (!this.current() && this.varieties()[0])
            this.form.patchValue({ variedadPaltaId: this.varieties()[0].value }); }, error: () => this.varieties.set([]) }); }
    private finish(r: AdminModalResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; this.current.set(null); }
}
