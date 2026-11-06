import type { IdentityResolution } from './identity-resolver.service';

/** Bloquea SOLO los valores realmente existentes en DESCO, incluidos los importados de Factiliza. */
export interface PersonIdentityLocks {
  names: boolean;
  paternalSurname: boolean;
  maternalSurname: boolean;
  birthDate: boolean;
  phone: boolean;
  email: boolean;
  geography: boolean;
  populationCenter: boolean;
  reference: boolean;
}

export function emptyPersonIdentityLocks(): PersonIdentityLocks {
  return {
    names: false, paternalSurname: false, maternalSurname: false,
    birthDate: false, phone: false, email: false, geography: false,
    populationCenter: false, reference: false,
  };
}

export function personIdentityLocks(result: IdentityResolution): PersonIdentityLocks {
  if (!result.found) return emptyPersonIdentityLocks();
  const present = (value: string | null | undefined): boolean => !!value?.trim();
  return {
    names: present(result.names),
    paternalSurname: present(result.paternalSurname),
    maternalSurname: present(result.maternalSurname),
    birthDate: present(result.birthDate),
    phone: present(result.phone),
    email: present(result.email),
    geography: present(result.districtCode),
    populationCenter: !!result.populationCenterId && result.populationCenterId > 0,
    reference: present(result.locationReference) || present(result.suggestedFiscalAddress),
  };
}
