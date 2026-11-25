import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorComponent } from '../form-error/form-error';

export interface ResourceUnitOption { code: string; label: string; }

@Component({
  selector: 'app-resource-identity-fields',
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorComponent],
  templateUrl: './resource-identity-fields.html',
  styleUrl: './resource-identity-fields.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceIdentityFieldsComponent {
  readonly nameControl = input.required<FormControl<string>>();
  readonly unitControl = input.required<FormControl<string>>();
  readonly units = input<readonly ResourceUnitOption[]>([]);
  readonly loading = input(false);
  readonly readonlyIdentity = input(false);
}
