import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFloppyDisk, faPen, faSeedling, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { nonNegativeIntegerValidator, normalizeOptionalText, notFutureDateValidator, optionalNotBlankValidator, todayLocalIsoDate } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { AdminModalResult, AdminSelectOption } from '../../../../../../../administracion/shared/admin-modal.types';
import { CrearCensoUseCase } from '../../../../../application/use-case/crear-censo.use-case';
import { EditarCensoUseCase } from '../../../../../application/use-case/editar-censo.use-case';
import { Censo } from '../../../../../domain/censo.model';
@Component({ selector: 'app-censo-form', standalone: true, imports: [ReactiveFormsModule, FaIconComponent], templateUrl: './censo-form.html', styleUrl: './censo-form.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class CensoFormComponent {
    @ViewChild('dialog', { static: true })
    private dialog!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly create = inject(CrearCensoUseCase);
    private readonly update = inject(EditarCensoUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly current = signal<Censo | null>(null);
    readonly crops = signal<readonly AdminSelectOption[]>([]);
    readonly error = signal<string | null>(null);
    private resolver: ((r: AdminModalResult) => void) | null = null;
    readonly addIcon = faSeedling;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly today = todayLocalIsoDate();
    readonly form = this.fb.nonNullable.group({
      parcelaCultivoId: [0, [Validators.required, Validators.min(1)]],
      fechaCenso: ['', [Validators.required, notFutureDateValidator]],
      plantasTotales: [0, [Validators.required, nonNegativeIntegerValidator]],
      plantasProductivas: [0, [Validators.required, nonNegativeIntegerValidator]],
      plantasNoProductivas: [0, [Validators.required, nonNegativeIntegerValidator]],
      plantasNuevas: [0, [Validators.required, nonNegativeIntegerValidator]],
      plantasMuertas: [0, [Validators.required, nonNegativeIntegerValidator]],
      plantasAfectadas: [0, [Validators.required, nonNegativeIntegerValidator]],
      observacion: ['', [optionalNotBlankValidator, Validators.maxLength(300)]],
    });
    open(crops: readonly AdminSelectOption[], current: Censo | null = null) { this.current.set(current); this.crops.set(crops); this.error.set(null); this.form.reset({ parcelaCultivoId: current?.parcelaCultivoId ?? crops[0]?.value ?? 0, fechaCenso: current?.fechaCenso?.slice(0, 10) ?? this.today, plantasTotales: current?.plantasTotales ?? 0, plantasProductivas: current?.plantasProductivas ?? 0, plantasNoProductivas: current?.plantasNoProductivas ?? 0, plantasNuevas: current?.plantasNuevas ?? 0, plantasMuertas: current?.plantasMuertas ?? 0, plantasAfectadas: current?.plantasAfectadas ?? 0, observacion: current?.observacion ?? '' }); this.dialog.nativeElement.showModal(); return new Promise<AdminModalResult>(r => this.resolver = r); }
    close() { if (!this.saving())
        this.finish({ saved: false, value: null }); }
    save() { this.form.markAllAsTouched(); if (this.form.invalid || this.saving())
        return; const v = this.form.getRawValue(); if ([v.plantasTotales, v.plantasProductivas, v.plantasNoProductivas, v.plantasNuevas, v.plantasMuertas, v.plantasAfectadas].some(value => Number(value) > 2147483647)) {
        this.error.set('Las cantidades ingresadas son demasiado grandes.');
        return;
    } if (v.plantasProductivas + v.plantasNoProductivas > v.plantasTotales) {
        this.error.set('Las plantas productivas y no productivas no pueden superar el total.');
        return;
    } if (v.plantasAfectadas > v.plantasTotales) {
        this.error.set('Las plantas afectadas no pueden superar el total.');
        return;
    } if (v.fechaCenso > new Date().toISOString().slice(0, 10)) {
        this.error.set('La fecha del censo no puede ser futura.');
        return;
    } const input = { parcelaCultivoId: Number(v.parcelaCultivoId), fechaCenso: v.fechaCenso, plantasTotales: Number(v.plantasTotales), plantasProductivas: Number(v.plantasProductivas), plantasNoProductivas: Number(v.plantasNoProductivas), plantasNuevas: Number(v.plantasNuevas), plantasMuertas: Number(v.plantasMuertas), plantasAfectadas: Number(v.plantasAfectadas), observacion: normalizeOptionalText(v.observacion) }; this.saving.set(true); this.error.set(null); const op: Observable<unknown> = this.current() ? this.update.execute(this.current()!.censoPlantasId, input) : this.create.execute(input); op.pipe(finalize(() => this.saving.set(false))).subscribe({ next: () => { this.toast.success(this.current() ? 'Censo actualizado' : 'Censo registrado'); this.finish({ saved: true, value: null }); }, error: e => this.error.set(mapOpenApiError(e).message) }); }
    private finish(r: AdminModalResult) { if (this.dialog.nativeElement.open)
        this.dialog.nativeElement.close(); this.resolver?.(r); this.resolver = null; this.current.set(null); }
}
