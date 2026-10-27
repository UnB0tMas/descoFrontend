import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faPen, faPlus, faRoute, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { localDateTimeInputNow, normalizeOptionalText, notPastDateTimeValidator, optionalNotBlankValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { ReferenceDataService } from '../../../../../../../../core/reference-data/reference-data.service';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { ListarEmpleadosUseCase } from '../../../../../../../administracion/empleados/application/use-case/listar-empleados.use-case';
import { EditarSalidaUseCase } from '../../../../../application/use-case/editar-salida.use-case';
import { ProgramarSalidaUseCase } from '../../../../../application/use-case/programar-salida.use-case';
import { SalidaDetalle } from '../../../../../domain/salida-campo.model';
import { SalidaParticipanteInput } from '../../../../../domain/salida-participante.model';
interface ParticipantRow extends SalidaParticipanteInput {
    label: string;
}
@Component({ selector: 'app-salida-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './salida-form.html', styleUrl: './salida-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class SalidaFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly refs = inject(ReferenceDataService);
    private readonly employeesUseCase = inject(ListarEmpleadosUseCase);
    private readonly program = inject(ProgramarSalidaUseCase);
    private readonly update = inject(EditarSalidaUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly refsLoading = signal(false);
    readonly current = signal<SalidaDetalle | null>(null);
    readonly motives = signal<readonly AdminSelectOption[]>([]);
    readonly employees = signal<readonly AdminSelectOption[]>([]);
    readonly participants = signal<readonly ParticipantRow[]>([]);
    readonly error = signal<string | null>(null);
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly pageIcon = faRoute;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly addIcon = faPlus;
    readonly deleteIcon = faTrashCan;
    readonly minimumScheduleDateTime = localDateTimeInputNow();
    readonly form = this.fb.nonNullable.group({
      motivoSalidaId: [0, [Validators.required, Validators.min(1)]],
      fechaHoraProgramada: ['', [Validators.required, notPastDateTimeValidator]],
      descripcion: ['', [optionalNotBlankValidator, Validators.maxLength(400)]],
      empleadoId: [0, [Validators.min(0)]],
      funcion: ['', [optionalNotBlankValidator, Validators.maxLength(120)]],
      esResponsable: [false],
    });
    open(detail: SalidaDetalle | null = null) { this.current.set(detail); this.error.set(null); this.participants.set(detail?.participantes.filter(x => x.estado).map(x => ({ empleadoId: x.empleadoId, funcion: x.funcion ?? undefined, esResponsable: x.esResponsable, label: this.personName(x) })) ?? []); this.form.reset({ motivoSalidaId: detail?.salida.motivoSalidaId ?? 0, fechaHoraProgramada: this.toLocal(detail?.salida.fechaHoraProgramada), descripcion: detail?.salida.descripcion ?? '', empleadoId: 0, funcion: '', esResponsable: false }); this.loadReferences(); this.dialog.nativeElement.showModal(); return new Promise<AdminModalResult>(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    addParticipant() {
        const v = this.form.getRawValue();
        const id = Number(v.empleadoId);

        if (!id) {
            this.error.set('Seleccione un empleado.');
            return;
        }

        if (this.participants().some(x => x.empleadoId === id)) {
            this.error.set('El empleado ya forma parte de la salida.');
            return;
        }

        const option = this.employees().find(x => x.value === id);
        const currentRows = v.esResponsable
            ? this.participants().map(item => ({ ...item, esResponsable: false }))
            : this.participants();

        this.participants.set([
            ...currentRows,
            {
                empleadoId: id,
                funcion: normalizeOptionalText(v.funcion),
                esResponsable: v.esResponsable,
                label: option?.label ?? `Empleado ${id}`,
            },
        ]);
        this.form.patchValue({ empleadoId: 0, funcion: '', esResponsable: false });
        this.error.set(null);
    }
    removeParticipant(index: number) { this.participants.set(this.participants().filter((_, i) => i !== index)); }
    save() { this.form.markAllAsTouched(); const v = this.form.getRawValue(); if (this.form.invalid || this.saving())
        return; if (this.participants().length === 0) {
        this.error.set('Agrega al menos un participante.');
        return;
    }
    if (this.participants().filter(item => item.esResponsable).length !== 1) {
        this.error.set('Seleccione exactamente un responsable para la salida.');
        return;
    }
    const input = {
        motivoSalidaId: Number(v.motivoSalidaId),
        fechaHoraProgramada: new Date(v.fechaHoraProgramada).toISOString(),
        descripcion: normalizeOptionalText(v.descripcion),
        participantes: this.participants().map(({ label, ...participant }) => ({
            ...participant,
            funcion: participant.funcion?.trim() || undefined,
        })),
    }; this.saving.set(true); this.error.set(null); const op: Observable<unknown> = this.current() ? this.update.execute(this.current()!.salida.salidaCampoId, input) : this.program.execute(input); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(this.current() ? 'Salida actualizada' : 'Salida programada'); this.finish({ saved: true, value: null }); }, error: e => this.error.set(mapOpenApiError(e).message) }); }
    private loadReferences() { this.refsLoading.set(true); let pending = 2; const done = () => { pending--; if (pending === 0)
        this.refsLoading.set(false); }; this.refs.catalog('MOTIVO_SALIDA').subscribe({ next: r => { this.motives.set(r.map(x => ({ value: Number(x.id), label: x.label, description: x.code }))); if (!this.current() && this.motives()[0])
            this.form.patchValue({ motivoSalidaId: this.motives()[0].value }); done(); }, error: () => { this.motives.set([]); done(); } }); this.employeesUseCase.execute({ activo: true, page: 1, size: 200 }).subscribe({ next: r => { this.employees.set(r.items.map(x => ({ value: x.empleadoId, label: [x.nombres, x.apellidoPaterno, x.apellidoMaterno].filter(Boolean).join(' '), description: x.cargo || x.area }))); done(); }, error: () => { this.employees.set([]); done(); } }); }
    private personName(x: {
        nombres: string;
        apellidoPaterno: string;
        apellidoMaterno: string | null;
    }) { return [x.nombres, x.apellidoPaterno, x.apellidoMaterno].filter(Boolean).join(' '); }
    private toLocal(value: string | null | undefined) { const d = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000); const off = d.getTimezoneOffset(); return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16); }
    private finish(r: AdminModalResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; this.current.set(null); this.error.set(null); }
}
