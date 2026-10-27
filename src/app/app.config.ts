import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors, } from '@angular/common/http';
import { provideClientHydration, withEventReplay, } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { apiErrorInterceptor } from './core/http/interceptors/api-error.interceptor';
import { correlationIdInterceptor } from './core/http/interceptors/correlation-id.interceptor';
import { deviceIdInterceptor } from './core/http/interceptors/device-id.interceptor';
import { provideDescoFontAwesome } from './core/ui/fontawesome.config';
import { accessTokenInterceptor } from './features/acceso/adapter/out/http/interceptors/access-token.interceptor';
import { sessionRefreshInterceptor } from './features/acceso/adapter/out/http/interceptors/session-refresh.interceptor';
import { provideAcceso } from './features/acceso/acceso.providers';
import { provideCatalogos } from './features/administracion/catalogos/catalogos.providers';
import { provideEmpleados } from './features/administracion/empleados/empleados.providers';
import { provideOrganizaciones } from './features/administracion/organizaciones/organizaciones.providers';
import { provideRolesPermisos } from './features/administracion/roles-permisos/roles-permisos.providers';
import { provideUsuarios } from './features/administracion/usuarios/usuarios.providers';
import { provideDocumentosEvidencias } from './features/documentos-evidencias/documentos-evidencias.providers';
import { provideCobrosCompradores } from './features/finanzas/cobros-compradores/cobros-compradores.providers';
import { provideGastos } from './features/finanzas/gastos/gastos.providers';
import { provideLiquidaciones } from './features/finanzas/liquidaciones/liquidaciones.providers';
import { providePagosSocios } from './features/finanzas/pagos-socios/pagos-socios.providers';
import { provideAjustesPrecio } from './features/gestion-comercial/ajustes-precio/ajustes-precio.providers';
import { provideIncidencias } from './features/gestion-comercial/incidencias/incidencias.providers';
import { provideCensos } from './features/gestion-tecnica/censos/censos.providers';
import { provideEvaluaciones } from './features/gestion-tecnica/evaluaciones/evaluaciones.providers';
import { provideParcelasCultivos } from './features/gestion-tecnica/parcelas-cultivos/parcelas-cultivos.providers';
import { providePredios } from './features/gestion-tecnica/predios/predios.providers';
import { provideProductores } from './features/gestion-tecnica/productores/productores.providers';
import { provideSalidas } from './features/gestion-tecnica/salidas/salidas.providers';
import { provideSanidad } from './features/gestion-tecnica/sanidad/sanidad.providers';
import { provideVisitas } from './features/gestion-tecnica/visitas/visitas.providers';
import { provideInicio } from './features/inicio/inicio.providers';
import { provideMiCuenta } from './features/mi-cuenta/mi-cuenta.providers';
import { provideInventarioVehiculos } from './features/recursos/inventario-vehiculos/inventario-vehiculos.providers';
import { provideProgramados } from './features/recursos/programados/programados.providers';
import { provideAuditoria } from './features/reportes-control/auditoria/auditoria.providers';
import { provideReportes } from './features/reportes-control/reportes/reportes.providers';
import { provideOpenApi } from './infrastructure/openapi/openapi.providers';
import { provideReferenceData } from './reference-data/reference-data.providers';
import { routes } from './app.routes';
export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideZonelessChangeDetection(),
        provideRouter(routes),
        provideClientHydration(withEventReplay()),
        provideHttpClient(withFetch(), withInterceptors([
            correlationIdInterceptor,
            deviceIdInterceptor,
            apiErrorInterceptor,
            sessionRefreshInterceptor,
            accessTokenInterceptor,
        ])),
        provideDescoFontAwesome(),
        ...provideOpenApi(),
        ...provideReferenceData(),
        ...provideAcceso(),
        ...provideInicio(),
        ...provideMiCuenta(),
        ...provideOrganizaciones(),
        ...provideRolesPermisos(),
        ...provideCatalogos(),
        ...provideEmpleados(),
        ...provideUsuarios(),
        ...provideDocumentosEvidencias(),
        ...provideInventarioVehiculos(),
        ...provideProgramados(),
        ...provideProductores(),
        ...providePredios(),
        ...provideParcelasCultivos(),
        ...provideCensos(),
        ...provideSalidas(),
        ...provideVisitas(),
        ...provideEvaluaciones(),
        ...provideSanidad(),
        ...provideIncidencias(),
        ...provideAjustesPrecio(),
        ...provideGastos(),
        ...provideLiquidaciones(),
        ...providePagosSocios(),
        ...provideCobrosCompradores(),
        ...provideReportes(),
        ...provideAuditoria(),
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
    ],
};
