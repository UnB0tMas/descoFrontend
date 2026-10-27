import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { EvidenceStorageEvent } from '../../../domain/documento-evidencia.model';

export interface EvidenceStorageGateway {
  upload(file: File): Observable<EvidenceStorageEvent>;
}

export const EVIDENCE_STORAGE_GATEWAY =
  new InjectionToken<EvidenceStorageGateway>('EVIDENCE_STORAGE_GATEWAY');
