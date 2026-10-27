import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClipboardCheck, faFloppyDisk, faPen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { decimalPrecisionValidator, localDateTimeInputNow, nonNegativeIntegerValidator, normalizeOptionalText, notBlankValidator, notFutureDateTimeValidator, optionalNotBlankValidator, positiveIntegerValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarParcelasCultivosUseCase } from '../../../../../../parcelas-cultivos/application/use-case/listar-parcelas-cultivos.use-case';
import { ListarVisitasUseCase } from '../../../../../../visitas/application/use-case/listar-visitas.use-case';
import { CrearEvaluacionUseCase } from '../../../../../application/use-case/crear-evaluacion.use-case';
import { EditarEvaluacionUseCase } from '../../../../../application/use-case/editar-evaluacion.use-case';
import { EvaluacionAgronomica } from '../../../../../domain/evaluacion-agronomica.model';
@Component({ selector: 'app-evaluacion-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './evaluacion-form.html', styleUrl: './evaluacion-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class EvaluacionFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly refs = inject(ReferenceDataService);
    private readonly visitsUseCase = inject(ListarVisitasUseCase);
    private readonly cropsUseCase = inject(ListarParcelasCultivosUseCase);
    private readonly create = inject(CrearEvaluacionUseCase);
    private readonly update = inject(EditarEvaluacionUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly refsLoading = signal(false);
    readonly current = signal<EvaluacionAgronomica | null>(null);
    readonly types = signal<readonly AdminSelectOption[]>([]);
    readonly visits = signal<readonly AdminSelectOption[]>([]);
    readonly crops = signal<readonly AdminSelectOption[]>([]);
    readonly error = signal<string | null>(null);
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly pageIcon = faClipboardCheck;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly maximumDateTime = localDateTimeInputNow();
    readonly form = this.fb.nonNullable.group({
      visitaTecnicaId: [0, [Validators.required, Validators.min(1)]],
      parcelaCultivoId: [0, [Validators.min(0)]],
      tipoEvaluacionId: [0, [Validators.required, Validators.min(1)]],
      fechaHora: [this.localNow(), [Validators.required, notFutureDateTimeValidator]],
      resultado: ['', [Validators.required, notBlankValidator, Validators.maxLength(600)]],
      observacion: ['', [optionalNotBlankValidator, Validators.maxLength(400)]],
      registrarMateriaSeca: [false],
      porcentajeMateriaSeca: [0, [Validators.min(0), Validators.max(100), decimalPrecisionValidator(3, 2)]],
      numeroMuestras: [1, [positiveIntegerValidator]],
    });
    open(current: EvaluacionAgronomica | null = null) { this.current.set(current); this.error.set(null); this.form.reset({ visitaTecnicaId: current?.visitaTecnicaId ?? 0, parcelaCultivoId: current?.parcelaCultivoId ?? 0, tipoEvaluacionId: current?.tipoEvaluacionId ?? 0, fechaHora: this.toLocal(current?.fechaHora), resultado: current?.resultado ?? '', observacion: current?.observacion ?? '', registrarMateriaSeca: current?.porcentajeMateriaSeca !== null && current?.porcentajeMateriaSeca !== undefined, porcentajeMateriaSeca: current?.porcentajeMateriaSeca ?? 0, numeroMuestras: current?.numeroMuestras ?? 1 }); this.loadReferences(); this.dialog.nativeElement.showModal(); return new Promise<AdminModalResult>(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    save() { this.form.markAllAsTouched(); if (this.form.invalid || this.saving())
        return; const v = this.form.getRawValue(), dry = v.registrarMateriaSeca ? { porcentajeMateriaSeca: Number(v.porcentajeMateriaSeca), numeroMuestras: Number(v.numeroMuestras) } : undefined; const common = { parcelaCultivoId: Number(v.parcelaCultivoId) > 0 ? Number(v.parcelaCultivoId) : undefined, tipoEvaluacionId: Number(v.tipoEvaluacionId), fechaHora: new Date(v.fechaHora).toISOString(), resultado: v.resultado.trim(), observacion: normalizeOptionalText(v.observacion), materiaSeca: dry }; this.saving.set(true); this.error.set(null); const op: Observable<unknown> = this.current() ? this.update.execute(this.current()!.evaluacionAgronomicaId, common) : this.create.execute({ ...common, visitaTecnicaId: Number(v.visitaTecnicaId) }); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(this.current() ? 'Evaluación actualizada' : 'Evaluación registrada'); this.finish({ saved: true, value: null }); }, error: e => this.error.set(mapOpenApiError(e).message) }); }
    private loadReferences() { this.refsLoading.set(true); let pending = 3, done = () => { if (--pending === 0)
        this.refsLoading.set(false); }; this.refs.catalog('TIPO_EVALUACION').subscribe({ next: r => { this.types.set(r.map(x => ({ value: Number(x.id), label: x.label, description: x.code }))); if (!this.current() && this.types()[0])
            this.form.patchValue({ tipoEvaluacionId: this.types()[0].value }); done(); }, error: () => { this.types.set([]); done(); } }); this.visitsUseCase.execute({ estadoProceso: 'EN_CURSO', page: 1, size: 200 }).subscribe({ next: r => { this.visits.set(r.items.map(x => ({ value: x.visitaTecnicaId, label: `${x.predio} · ${x.tecnico}`, description: x.objetivo }))); if (!this.current() && this.visits()[0])
            this.form.patchValue({ visitaTecnicaId: this.visits()[0].value }); done(); }, error: () => { this.visits.set([]); done(); } }); this.cropsUseCase.execute({ situacionCultivo: 'ACTIVO', page: 1, size: 200 }).subscribe({ next: r => { this.crops.set(r.items.filter(x => x.parcelaCultivoId != null).map(x => ({ value: x.parcelaCultivoId!, label: `${x.parcelaNombre} · ${x.variedad ?? 'Cultivo'}`, description: x.predioNombre }))); done(); }, error: () => { this.crops.set([]); done(); } }); }
    private toLocal(value: string | null | undefined) { const d = value ? new Date(value) : new Date(), o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().slice(0, 16); }
    private localNow() { return this.toLocal(null); }
    private finish(r: AdminModalResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; this.current.set(null); }
}
