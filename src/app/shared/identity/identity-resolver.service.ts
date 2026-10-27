import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  IdentityResolveRequest,
  IdentityResolveRequestEntidadObjetivoEnum,
  IdentityResolveRequestTipoDocumentoEnum,
} from '../../infrastructure/openapi/generated/model/identityResolveRequest';
import { ValidacinDeIdentidadService } from '../../infrastructure/openapi/generated/api/validacinDeIdentidad.service';

export type IdentityTarget = 'PERSONA' | 'EMPRESA';
export type IdentityDocumentType = 'DNI' | 'RUC';
export type IdentityOrigin = 'LOCAL' | 'MANUAL' | string;

export interface IdentityResolution {
  origin: IdentityOrigin;
  found: boolean;
  insertedAutomatically: boolean;
  manualEntryAllowed: boolean;
  target: IdentityTarget;
  entityId: number | null;
  personType: string | null;
  documentType: string | null;
  documentNumber: string | null;
  names: string | null;
  paternalSurname: string | null;
  maternalSurname: string | null;
  phone: string | null;
  email: string | null;
  businessName: string | null;
  birthDate: string | null;
  sex: string | null;
  locationId: number | null;
  departmentCode: string | null;
  departmentName: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  populationCenterId: number | null;
  populationCenterName: string | null;
  locationReference: string | null;
  entityActive: boolean | null;
  isEmployee: boolean;
  isPartner: boolean;
  isAssociation: boolean;
  queryStatus: string | null;
  suggestedFiscalAddress: string | null;
  retryFromUtc: string | null;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class IdentityResolverService {
  private readonly api = inject(ValidacinDeIdentidadService);

  resolve(
    target: IdentityTarget,
    documentType: IdentityDocumentType,
    documentNumber: string,
  ): Observable<IdentityResolution> {
    const request: IdentityResolveRequest = {
      entidadObjetivo:
        target === 'EMPRESA'
          ? IdentityResolveRequestEntidadObjetivoEnum.Empresa
          : IdentityResolveRequestEntidadObjetivoEnum.Persona,
      tipoDocumento:
        documentType === 'RUC'
          ? IdentityResolveRequestTipoDocumentoEnum.Ruc
          : IdentityResolveRequestTipoDocumentoEnum.Dni,
      numeroDocumento: documentNumber.trim(),
    };

    return this.api
      .identidadResolverDocumento(
        { identityResolveRequest: request },
        'body',
        false,
        { transferCache: false },
      )
      .pipe(
        map((response) => {
          const data = this.record(response.datos);

          if (!data) {
            throw new Error(
              'No fue posible obtener la información del documento.',
            );
          }

          return {
            origin: this.string(data['origen']) ?? 'MANUAL',
            found: this.boolean(data['encontrado']),
            insertedAutomatically: this.boolean(
              data['insertadoAutomaticamente'],
            ),
            manualEntryAllowed: this.boolean(
              data['permiteCargaManual'],
            ),
            target:
              this.string(data['entidadObjetivo']) === 'EMPRESA'
                ? 'EMPRESA'
                : 'PERSONA',
            entityId: this.number(data['entidadId']),
            personType: this.string(data['tipoPersona']),
            documentType: this.string(data['tipoDocumento']),
            documentNumber: this.string(data['numeroDocumento']),
            names: this.string(data['nombres']),
            paternalSurname: this.string(
              data['apellidoPaterno'],
            ),
            maternalSurname: this.string(
              data['apellidoMaterno'],
            ),
            phone: this.string(data['telefono']),
            email: this.string(data['correo']),
            businessName: this.string(data['razonSocial']),
            birthDate: this.string(data['fechaNacimiento']),
            sex: this.string(data['sexo']),
            locationId: this.number(data['ubicacionId']),
            departmentCode: this.string(
              data['departamentoCodigo'],
            ),
            departmentName: this.string(
              data['departamentoNombre'],
            ),
            provinceCode: this.string(
              data['provinciaCodigo'],
            ),
            provinceName: this.string(
              data['provinciaNombre'],
            ),
            districtCode: this.string(data['distritoCodigo']),
            districtName: this.string(data['distritoNombre']),
            populationCenterId: this.number(
              data['centroPobladoId'],
            ),
            populationCenterName: this.string(
              data['centroPobladoNombre'],
            ),
            locationReference: this.string(
              data['referenciaUbicacion'],
            ),
            entityActive: this.nullableBoolean(
              data['estadoEntidad'],
            ),
            isEmployee: this.boolean(data['esEmpleado']),
            isPartner: this.boolean(data['esSocio']),
            isAssociation: this.boolean(data['esAsociacion']),
            queryStatus: this.string(data['estadoConsulta']),
            suggestedFiscalAddress: this.string(
              data['direccionFiscalSugerida'],
            ),
            retryFromUtc: this.string(data['reintentoDesdeUtc']),
            message:
              response.mensaje ||
              'La información del documento fue procesada.',
          } satisfies IdentityResolution;
        }),
      );
  }

  private record(
    value: unknown,
  ): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private string(value: unknown): string | null {
    return typeof value === 'string' && value.trim()
      ? value.trim()
      : null;
  }

  private number(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : null;
  }

  private boolean(value: unknown): boolean {
    return value === true;
  }

  private nullableBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
  }
}
