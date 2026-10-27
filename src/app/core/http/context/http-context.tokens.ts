import { HttpContextToken } from '@angular/common/http';

export const SKIP_ACCESS_TOKEN = new HttpContextToken<boolean>(() => false);
export const SKIP_SESSION_REFRESH = new HttpContextToken<boolean>(() => false);
export const SKIP_DEVICE_ID = new HttpContextToken<boolean>(() => false);
export const SKIP_CORRELATION_ID = new HttpContextToken<boolean>(() => false);
