import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faLeaf, faPen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { localDateTimeInputNow, nonNegativeIntegerValidator, normalizeOptionalText, notFutureDateTimeValidator, optionalNotBlankValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarParcelasCultivosUseCase } from '../../../../../../parcelas-cultivos/application/use-case/listar-parcelas-cultivos.use-case';
import { ListarVisitasUseCase } from '../../../../../../visitas/application/use-case/listar-visitas.use-case';
import { CrearCasoSanitarioUseCase } from '../../../../../application/use-case/crear-caso-sanitario.use-case';
import { EditarCasoSanitarioUseCase } from '../../../../../application/use-case/editar-caso-sanitario.use-case';
import { CasoSanitarioCabecera } from '../../../../../domain/caso-sanitario.model';
@Component({ selector: 'app-caso-sanitario-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './caso-sanitario-form.html', styleUrl: './caso-sanitario-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class CasoSanitarioFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly refs = inject(ReferenceDataService);
    private readonly cropsUseCase = inject(ListarParcelasCultivosUseCase);
    private readonly visitsUseCase = inject(ListarVisitasUseCase);
    private readonly create = inject(CrearCasoSanitarioUseCase);
    private readonly update = inject(EditarCasoSanitarioUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly refsLoading = signal(false);
    readonly current = signal<CasoSanitarioCabecera | null>(null);
    readonly problems = signal<readonly AdminSelectOption[]>([]);
    readonly crops = signal<readonly AdminSelectOption[]>([]);
    readonly visits = signal<readonly AdminSelectOption[]>([]);
    readonly error = signal<string | null>(null);
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly pageIcon = faLeaf;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly maximumDateTime = localDateTimeInputNow();
    readonly severities = ['BAJA', 'MEDIA', 'ALTA'] as const;
    readonly form = this.fb.nonNullable.group({ parcelaCultivoId: [0, [Validators.required, Validators.min(1)]], tipoProblemaId: [0, [Validators.required, Validators.min(1)]], visitaDeteccionId: [0, [Validators.required, Validators.min(1)]], fechaDeteccion: [this.maximumDateTime, [Validators.required, notFutureDateTimeValidator]], plantasAfectadas: [0, [nonNegativeIntegerValidator]], cantidadEstimada: [false], severidad: ['BAJA', Validators.required], observacion: ['', [optionalNotBlankValidator, Validators.maxLength(500)]] });
    private preferredCropId = 0;
    open(current: CasoSanitarioCabecera | null = null, preferredCropId = 0) { this.preferredCropId = preferredCropId; this.current.set(current); this.error.set(null); this.form.reset({ parcelaCultivoId: current?.parcelaCultivoId ?? preferredCropId, tipoProblemaId: current?.tipoProblemaId ?? 0, visitaDeteccionId: current?.visitaDeteccionId ?? 0, fechaDeteccion: current?.fechaDeteccion ? this.toLocal(current.fechaDeteccion) : this.maximumDateTime, plantasAfectadas: current?.plantasAfectadas ?? 0, cantidadEstimada: current?.cantidadEstimada ?? false, severidad: current?.severidad ?? 'BAJA', observacion: current?.observacion ?? '' }); this.loadReferences(); this.dialog.nativeElement.showModal(); return new Promise<AdminModalResult>(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    save() { this.form.markAllAsTouched(); if (this.form.invalid || this.saving())
        return; const v = this.form.getRawValue(), common = { tipoProblemaId: Number(v.tipoProblemaId), plantasAfectadas: Number(v.plantasAfectadas) >= 0 ? Number(v.plantasAfectadas) : undefined, cantidadEstimada: v.cantidadEstimada, severidad: v.severidad, observacion: normalizeOptionalText(v.observacion) }; this.saving.set(true); this.error.set(null); const op: Observable<unknown> = this.current() ? this.update.execute(this.current()!.casoFitosanitarioId, common) : this.create.execute({ ...common, parcelaCultivoId: Number(v.parcelaCultivoId), visitaDeteccionId: Number(v.visitaDeteccionId), fechaDeteccion: new Date(v.fechaDeteccion).toISOString() }); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(this.current() ? 'Caso actualizado' : 'Caso sanitario registrado'); this.finish({ saved: true, value: null }); }, error: e => this.error.set(mapOpenApiError(e).message) }); }
    private loadReferences() { this.refsLoading.set(true); let pending = 3, done = () => { if (--pending === 0)
        this.refsLoading.set(false); }; this.refs.catalog('PROBLEMA_FITOSANITARIO').subscribe({ next: r => { this.problems.set(r.map(x => ({ value: Number(x.id), label: x.label, description: x.description || x.code }))); if (!this.current() && this.problems()[0])
            this.form.patchValue({ tipoProblemaId: this.problems()[0].value }); done(); }, error: () => { this.problems.set([]); done(); } }); this.cropsUseCase.execute({ situacionCultivo: 'ACTIVO', page: 1, size: 200 }).subscribe({ next: r => { this.crops.set(r.items.filter(x => x.parcelaCultivoId != null && (!this.preferredCropId || x.parcelaCultivoId === this.preferredCropId)).map(x => ({ value: x.parcelaCultivoId!, label: `${x.parcelaNombre} · ${x.variedad ?? 'Cultivo'}`, description: x.predioNombre }))); if (this.preferredCropId && !this.crops().length) { this.error.set('El cultivo seleccionado no aparece entre los registros disponibles. No se puede asociar la incidencia a otra parcela.'); this.form.controls.parcelaCultivoId.setValue(0); } else if (!this.current() && this.crops()[0] && !this.crops().some(x => x.value === this.form.controls.parcelaCultivoId.value)) this.form.patchValue({ parcelaCultivoId: this.crops()[0].value }); done(); }, error: () => { this.crops.set([]); done(); } }); this.visitsUseCase.execute({ page: 1, size: 200 }).subscribe({ next: r => { this.visits.set(r.items.filter(x => x.estadoProceso === 'EN_CURSO').map(x => ({ value: x.visitaTecnicaId, label: `${x.predio} · ${x.tecnico}`, description: x.estadoProceso }))); if (!this.current() && this.visits()[0])
            this.form.patchValue({ visitaDeteccionId: this.visits()[0].value }); done(); }, error: () => { this.visits.set([]); done(); } }); }
    private toLocal(value: string): string {
        const date = new Date(value);
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 16);
    }

    private finish(r: AdminModalResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; this.current.set(null); }
}
