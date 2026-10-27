import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal, } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash, faFloppyDisk, faPen, faUserPlus, faXmark, } from '@fortawesome/free-solid-svg-icons';
import { finalize, Observable } from 'rxjs';
import { mapOpenApiError } from '../../../../../../../../infrastructure/openapi/openapi-http-error.mapper';
import { ToastService } from '../../../../../../../../shared/feedback/toast-center/toast.service';
import { FormErrorComponent } from '../../../../../../../../shared/forms/form-error/form-error';
import { passwordSafetyValidator, sanitizeUsername, usernameValidator } from '../../../../../../../../shared/forms/validators/desco-input.validators';
import { buildUsernameSuggestion } from '../../../../../../shared/admin-code.util';
import { closeAnimatedDialog, openAnimatedDialog } from '../../../../../../../../shared/feedback/dialog-lifecycle/dialog-lifecycle.util';
import { AdminModalResult, AdminSelectOption, } from '../../../../../../shared/admin-modal.types';
import { CrearCuentaUseCase } from '../../../../../application/use-case/crear-cuenta.use-case';
import { EditarCuentaUseCase } from '../../../../../application/use-case/editar-cuenta.use-case';
import { Usuario, UsuarioDetalle, } from '../../../../../domain/usuario.model';
interface UserFormOptions {
    employees: readonly AdminSelectOption[];
    roles: readonly AdminSelectOption[];
}
@Component({
    selector: 'app-usuario-form',
    standalone: true,
    imports: [ReactiveFormsModule, FaIconComponent, FormErrorComponent],
    templateUrl: './usuario-form.html',
    styleUrl: './usuario-form.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent {
    @ViewChild('dialog', { static: true })
    private readonly dialogRef!: ElementRef<HTMLDialogElement>;
    private readonly fb = inject(FormBuilder);
    private readonly createUseCase = inject(CrearCuentaUseCase);
    private readonly updateUseCase = inject(EditarCuentaUseCase);
    private readonly toast = inject(ToastService);
    readonly saving = signal(false);
    readonly showPassword = signal(false);
    readonly current = signal<Usuario | UsuarioDetalle | null>(null);
    readonly employees = signal<readonly AdminSelectOption[]>([]);
    readonly roles = signal<readonly AdminSelectOption[]>([]);
    readonly selectedRoleIds = signal<Set<number>>(new Set());
    readonly errorMessage = signal<string | null>(null);
    readonly addIcon = faUserPlus;
    readonly editIcon = faPen;
    readonly closeIcon = faXmark;
    readonly saveIcon = faFloppyDisk;
    readonly eyeIcon = faEye;
    readonly eyeSlashIcon = faEyeSlash;
    private resolver: ((result: AdminModalResult) => void) | null = null;
    readonly form = this.fb.nonNullable.group({
        empleadoId: [0, [Validators.required, Validators.min(1)]],
        nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), usernameValidator]],
        passwordInicial: [''],
        correoSeguridad: ['', [Validators.email, Validators.maxLength(200)]],
        requiereCambioPassword: [true],
        segundoFactorHabilitado: [false],
    });
    openCreate(options: UserFormOptions): Promise<AdminModalResult> {
        this.current.set(null);
        this.employees.set(options.employees);
        this.roles.set(options.roles);
        this.selectedRoleIds.set(options.roles.length === 1
            ? new Set([Number(options.roles[0].value)])
            : new Set());
        this.errorMessage.set(null);

        const firstEmployee = options.employees[0] ?? null;

        this.form.reset({
            empleadoId: firstEmployee?.value ?? 0,
            nombreUsuario: firstEmployee
                ? buildUsernameSuggestion(firstEmployee.label, Number(firstEmployee.value))
                : '',
            passwordInicial: '',
            correoSeguridad: '',
            requiereCambioPassword: true,
            segundoFactorHabilitado: false,
        });
        this.form.controls.empleadoId.enable({ emitEvent: false });
        this.form.controls.passwordInicial.setValidators([
            Validators.required,
            Validators.minLength(12),
            Validators.maxLength(128),
            passwordSafetyValidator,
        ]);
        this.form.controls.correoSeguridad.setValidators([
            Validators.required,
            Validators.email,
            Validators.maxLength(200),
        ]);
        this.updateValidators();
        return this.show();
    }
    openEdit(user: Usuario | UsuarioDetalle): Promise<AdminModalResult> {
        this.current.set(user);
        this.employees.set([]);
        this.roles.set([]);
        this.selectedRoleIds.set(new Set());
        this.errorMessage.set(null);
        const detail = 'requiereCambioPassword' in user
            ? (user as UsuarioDetalle)
            : null;
        this.form.reset({
            empleadoId: user.empleadoId,
            nombreUsuario: user.nombreUsuario,
            passwordInicial: '',
            correoSeguridad: '',
            requiereCambioPassword: detail?.requiereCambioPassword ?? false,
            segundoFactorHabilitado: detail?.segundoFactorHabilitado ?? user.segundoFactorHabilitado,
        });
        this.form.controls.empleadoId.disable({ emitEvent: false });
        this.form.controls.passwordInicial.clearValidators();
        this.form.controls.correoSeguridad.clearValidators();
        this.updateValidators();
        return this.show();
    }
    suggestUsername(value: string): void {
        if (this.current()) {
            return;
        }

        const employeeId = Number(value);
        const employee = this.employees().find((item) => Number(item.value) === employeeId);

        if (!employee) {
            this.form.controls.nombreUsuario.setValue('', { emitEvent: false });
            return;
        }

        this.form.controls.nombreUsuario.setValue(buildUsernameSuggestion(employee.label, employeeId), {
            emitEvent: false,
        });
    }

    onUsernameInput(): void {
        const control = this.form.controls.nombreUsuario;
        const sanitized = sanitizeUsername(control.value);
        if (sanitized !== control.value) {
            control.setValue(sanitized, { emitEvent: false });
        }
        control.updateValueAndValidity({ emitEvent: false });
    }
    normalizeSecurityEmail(): void {
        const control = this.form.controls.correoSeguridad;
        const normalized = control.value.trim().toLowerCase().slice(0, 200);
        if (normalized !== control.value) {
            control.setValue(normalized, { emitEvent: false });
        }
        control.updateValueAndValidity({ emitEvent: false });
    }
    close(): void {
        if (this.saving()) {
            return;
        }
        this.finish({ saved: false, value: null });
    }
    toggleRole(id: number, checked: boolean): void {
        const next = new Set(this.selectedRoleIds());
        if (checked) {
            next.add(id);
        }
        else {
            next.delete(id);
        }
        this.selectedRoleIds.set(next);
    }
    roleSelected(id: number): boolean {
        return this.selectedRoleIds().has(id);
    }
    save(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid || this.saving()) {
            return;
        }
        const current = this.current();
        const values = this.form.getRawValue();
        if (!current && this.selectedRoleIds().size === 0) {
            this.errorMessage.set('Selecciona al menos un rol para crear la cuenta.');
            return;
        }
        this.errorMessage.set(null);
        this.saving.set(true);
        const operation: Observable<unknown> = current
            ? this.updateUseCase.execute(current.usuarioId, {
                nombreUsuario: sanitizeUsername(values.nombreUsuario),
                requiereCambioPassword: values.requiereCambioPassword,
                segundoFactorHabilitado: values.segundoFactorHabilitado,
            })
            : this.createUseCase.execute({
                empleadoId: Number(values.empleadoId),
                nombreUsuario: sanitizeUsername(values.nombreUsuario),
                passwordInicial: values.passwordInicial,
                correoSeguridad: values.correoSeguridad.trim().toLowerCase(),
                requiereCambioPassword: values.requiereCambioPassword,
                rolIds: [...this.selectedRoleIds()],
            });
        operation
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
            next: () => {
                this.toast.success(current ? 'Cuenta actualizada' : 'Cuenta registrada');
                this.finish({ saved: true, value: null });
            },
            error: (error) => this.errorMessage.set(mapOpenApiError(error).message),
        });
    }
    private updateValidators(): void {
        this.form.controls.passwordInicial.updateValueAndValidity({
            emitEvent: false,
        });
        this.form.controls.correoSeguridad.updateValueAndValidity({
            emitEvent: false,
        });
    }
    private show(): Promise<AdminModalResult> {
        this.showPassword.set(false);
        openAnimatedDialog(this.dialogRef.nativeElement);
        return new Promise((resolve) => {
            this.resolver = resolve;
        });
    }
    private finish(result: AdminModalResult): void {
        closeAnimatedDialog(this.dialogRef.nativeElement, () => {
            this.resolver?.(result);
            this.resolver = null;
            this.current.set(null);
            this.errorMessage.set(null);
            this.selectedRoleIds.set(new Set());
        });
    }
}
