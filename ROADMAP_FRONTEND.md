# ROADMAP OFICIAL FRONTEND DESCO — ACTUALIZADO
## Angular 20 Standalone + Arquitectura Hexagonal Pragmática + OpenAPI
### Orden escalonado por dependencias para consumir el backend DESCO final

**Estado:** documento rector único y actualizado de implementación. Esta versión reemplaza el roadmap frontend anterior.  
**Sistema funcional de referencia:** `SISTEMA_TESIS.md`.  
**Backend de referencia:** Spring Boot DESCO final + OpenAPI `/v3/api-docs`.  
**Base de datos de referencia:** `SQL_DB_DESCO.sql`.  
**Frontend:** Angular 20 standalone + CSS + Tailwind CSS + daisyUI + Flowbite + Font Awesome.  

---

# 1. CRITERIO DE ESTA VERSIÓN

Esta versión parte de que el proyecto Angular ya fue creado con Angular CLI y está prácticamente limpio.

Por eso el árbol de arquitectura **NO intenta copiar todo el workspace que genera Angular**.

La estructura siguiente muestra únicamente:

- archivos que tendremos que crear;
- archivos existentes del proyecto base que sí tendremos que editar;
- carpetas que representan nuestra arquitectura;
- componentes, páginas, stores, servicios, guards, adapters, ports y casos de uso que forman parte del sistema;
- configuración manual de estilos y OpenAPI;
- recursos propios de DESCO.

No se muestran archivos que existen en el proyecto pero cuya administración queda en manos de Angular CLI, npm o el compilador cuando nosotros no necesitamos modificarlos directamente.

## Archivos deliberadamente excluidos del árbol

Entre otros:

```text
package-lock.json
node_modules/
.angular/
dist/
angular.json
tsconfig.json
tsconfig.app.json
tsconfig.spec.json
.editorconfig
.gitignore
README.md
src/main.ts
src/index.html
src/app/app.spec.ts
```

**Que un archivo no aparezca aquí no significa que deba borrarse.**

Significa únicamente:

> no forma parte de la ruta manual de construcción de nuestra arquitectura.

`package.json` tampoco aparece en el árbol porque las instalaciones indicadas en este documento lo actualizarán mediante npm. Si más adelante se decide añadir scripts manuales, se podrá editar, pero no es una pieza arquitectónica.


---

# 1.1. AJUSTES INCORPORADOS RESPECTO DEL ROADMAP ANTERIOR

Esta versión ya incorpora el contrato final del backend y debe utilizarse como referencia única.

Cambios principales:

```text
OpenAPI
  → ngVersion 20
  → withInterfaces false
  → generated sigue aislado

Idempotencia
  → la key se pasa desde adapter HTTP al método generado
  → no existe idempotency.interceptor

Refresh
  → single-flight
  → exclusión mediante HttpContext

Dashboard
  → indicadores + alertas + accesosRapidos

Mi cuenta
  → perfil desde /auth/me / AccessStore
  → sesiones / dispositivos / password / correo desde Cuenta

Reportes
  → reporte + secciones[]

Reference Data
  → lectura transversal de catálogos y geografía

Evidencias
  → StorageGateway + registro de metadata en backend

Use cases
  → alineados a los operationId reales del backend
```

---

# 2. ESTRUCTURA COMPLETA DEL FRONTEND

## Regla de lectura

La estructura está ordenada de arriba hacia abajo según prioridad aproximada de implementación.

La única carpeta cuyo contenido interno no se enumera es:

```text
src/app/infrastructure/openapi/generated/
```

Esta carpeta aparecerá vacía en el árbol arquitectónico porque todo su contenido será generado automáticamente desde `/v3/api-docs`.

porque todo su contenido será creado por OpenAPI Generator y **jamás debe editarse manualmente**.

Los componentes visuales usan el estilo de nombres moderno de Angular 20:

```text
sidebar.ts
sidebar.html
sidebar.css
```

y no:

```text
sidebar.component.ts
sidebar.component.html
sidebar.component.css
```

El mismo criterio se aplica a las páginas Angular creadas para este proyecto.

```text
desco-frontend/
├── .postcssrc.json
├── tools/
│   └── openapi/
│       ├── openapi-generator-config.json
│       └── generate-api.mjs
├── src/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.development.ts
│   ├── styles/
│   │   ├── theme.css
│   │   ├── vendor-overrides.css
│   │   └── app-utilities.css
│   ├── styles.css
│   └── app/
│       ├── core/
│       │   ├── session/
│       │   │   ├── session-state.model.ts
│       │   │   ├── session.constants.ts
│       │   │   ├── token-storage.service.ts
│       │   │   ├── device-id.service.ts
│       │   │   └── session.store.ts
│       │   ├── http/
│       │   │   ├── models/
│       │   │   │   └── api-error.model.ts
│       │   │   ├── context/
│       │   │   │   └── http-context.tokens.ts
│       │   │   ├── services/
│       │   │   │   ├── correlation-id.service.ts
│       │   │   │   └── idempotency-key.service.ts
│       │   │   └── interceptors/
│       │   │       ├── correlation-id.interceptor.ts
│       │   │       ├── device-id.interceptor.ts
│       │   │       └── api-error.interceptor.ts
│       │   ├── access/
│       │   │   ├── models/
│       │   │   │   ├── access-user.model.ts
│       │   │   │   ├── access-role.model.ts
│       │   │   │   ├── access-module.model.ts
│       │   │   │   ├── access-permission.model.ts
│       │   │   │   └── access-context.model.ts
│       │   │   ├── access.store.ts
│       │   │   ├── access.service.ts
│       │   │   ├── permission.service.ts
│       │   │   ├── module-access.service.ts
│       │   │   ├── permission.directive.ts
│       │   │   ├── permission.guard.ts
│       │   │   └── module-access.guard.ts
│       │   ├── navigation/
│       │   │   ├── navigation-item.model.ts
│       │   │   ├── navigation.service.ts
│       │   │   └── breadcrumb.service.ts
│       │   ├── reference-data/
│       │   │   ├── reference-data.model.ts
│       │   │   ├── reference-data.gateway.ts
│       │   │   ├── reference-data.store.ts
│       │   │   └── reference-data.service.ts
│       │   ├── ui/
│       │   │   ├── fontawesome.config.ts
│       │   │   └── flowbite.service.ts
│       │   ├── errors/
│       │   │   └── global-error-handler.ts
│       │   ├── files/
│       │   │   └── file-download.service.ts
│       │   ├── browser/
│       │   │   ├── geolocation.service.ts
│       │   │   └── camera.service.ts
│       │   └── pages/
│       │       ├── forbidden/
│       │       │   ├── forbidden.ts
│       │       │   ├── forbidden.html
│       │       │   └── forbidden.css
│       │       ├── service-unavailable/
│       │       │   ├── service-unavailable.ts
│       │       │   ├── service-unavailable.html
│       │       │   └── service-unavailable.css
│       │       └── not-found/
│       │           ├── not-found.ts
│       │           ├── not-found.html
│       │           └── not-found.css
│       ├── infrastructure/
│       │   └── openapi/
│       │       ├── generated/
│       │       ├── api-response-unwrapper.ts
│       │       ├── openapi-http-error.mapper.ts
│       │       └── openapi.providers.ts
│       └── reference-data/
│           ├── reference-data-http.mapper.ts
│           ├── reference-data-http.adapter.ts
│           └── reference-data.providers.ts
│       ├── shared/
│       │   ├── models/
│       │   │   ├── sort.model.ts
│       │   │   ├── page-request.model.ts
│       │   │   └── page-result.model.ts
│       │   ├── forms/
│       │   │   └── form-error/
│       │   │       ├── form-error.ts
│       │   │       ├── form-error.html
│       │   │       └── form-error.css
│       │   ├── feedback/
│       │   │   ├── toast-center/
│       │   │   │   ├── toast.model.ts
│       │   │   │   ├── toast.service.ts
│       │   │   │   ├── toast-center.ts
│       │   │   │   ├── toast-center.html
│       │   │   │   └── toast-center.css
│       │   │   └── action-confirm-dialog/
│       │   │       ├── action-confirm-dialog.model.ts
│       │   │       ├── action-confirm-dialog.ts
│       │   │       ├── action-confirm-dialog.html
│       │   │       └── action-confirm-dialog.css
│       │   ├── data-display/
│       │   │   ├── loading-state/
│       │   │   │   ├── loading-state.ts
│       │   │   │   ├── loading-state.html
│       │   │   │   └── loading-state.css
│       │   │   ├── empty-state/
│       │   │   │   ├── empty-state.ts
│       │   │   │   ├── empty-state.html
│       │   │   │   └── empty-state.css
│       │   │   ├── error-state/
│       │   │   │   ├── error-state.ts
│       │   │   │   ├── error-state.html
│       │   │   │   └── error-state.css
│       │   │   ├── paginator/
│       │   │   │   ├── paginator.ts
│       │   │   │   ├── paginator.html
│       │   │   │   └── paginator.css
│       │   │   └── data-table/
│       │   │       ├── data-table.types.ts
│       │   │       ├── data-table.ts
│       │   │       ├── data-table.html
│       │   │       └── data-table.css
│       │   ├── listing/
│       │   │   ├── list-query-state.model.ts
│       │   │   ├── list-query-state.service.ts
│       │   │   └── filter-panel/
│       │   │       ├── filter-panel.ts
│       │   │       ├── filter-panel.html
│       │   │       └── filter-panel.css
│       │   └── layout/
│       │       ├── breadcrumb/
│       │       │   ├── breadcrumb.ts
│       │       │   ├── breadcrumb.html
│       │       │   └── breadcrumb.css
│       │       ├── page-header/
│       │       │   ├── page-header.ts
│       │       │   ├── page-header.html
│       │       │   └── page-header.css
│       │       ├── sidebar/
│       │       │   ├── sidebar-item.ts
│       │       │   ├── sidebar-item.html
│       │       │   ├── sidebar-item.css
│       │       │   ├── sidebar.ts
│       │       │   ├── sidebar.html
│       │       │   └── sidebar.css
│       │       ├── topbar/
│       │       │   ├── topbar.ts
│       │       │   ├── topbar.html
│       │       │   └── topbar.css
│       │       └── app-shell/
│       │           ├── app-shell.ts
│       │           ├── app-shell.html
│       │           └── app-shell.css
│       ├── features/
│       │   ├── acceso/
│       │   │   ├── domain/
│       │   │   │   ├── auth-step.model.ts
│       │   │   │   ├── auth-token.model.ts
│       │   │   │   ├── auth-challenge.model.ts
│       │   │   │   └── auth-context.model.ts
│       │   │   ├── application/
│       │   │   │   ├── port/
│       │   │   │   │   └── out/
│       │   │   │   │       └── auth.gateway.ts
│       │   │   │   └── use-case/
│       │   │   │       ├── login.use-case.ts
│       │   │   │       ├── solicitar-validacion-correo.use-case.ts
│       │   │   │       ├── confirmar-validacion-correo.use-case.ts
│       │   │   │       ├── solicitar-segundo-factor.use-case.ts
│       │   │   │       ├── verificar-segundo-factor.use-case.ts
│       │   │   │       ├── solicitar-recuperacion-password.use-case.ts
│       │   │   │       ├── restablecer-password.use-case.ts
│       │   │   │       ├── refrescar-sesion.use-case.ts
│       │   │   │       ├── obtener-contexto-actual.use-case.ts
│       │   │   │       ├── cerrar-sesion.use-case.ts
│       │   │   │       └── cerrar-otras-sesiones.use-case.ts
│       │   │   ├── adapter/
│       │   │   │   ├── out/
│       │   │   │   │   └── http/
│       │   │   │   │       ├── auth-http.mapper.ts
│       │   │   │   │       ├── auth-http.adapter.ts
│       │   │   │   │       └── interceptors/
│       │   │   │   │           ├── access-token.interceptor.ts
│       │   │   │   │           └── session-refresh.interceptor.ts
│       │   │   │   └── in/
│       │   │   │       └── ui/
│       │   │   │           ├── state/
│       │   │   │           │   └── auth-flow.store.ts
│       │   │   │           ├── layout/
│       │   │   │           │   └── auth-layout/
│       │   │   │           │       ├── auth-layout.ts
│       │   │   │           │       ├── auth-layout.html
│       │   │   │           │       └── auth-layout.css
│       │   │   │           └── pages/
│       │   │   │               ├── login/
│       │   │   │               │   ├── login.ts
│       │   │   │               │   ├── login.html
│       │   │   │               │   └── login.css
│       │   │   │               ├── validacion-correo/
│       │   │   │               │   ├── validacion-correo.ts
│       │   │   │               │   ├── validacion-correo.html
│       │   │   │               │   └── validacion-correo.css
│       │   │   │               ├── segundo-factor/
│       │   │   │               │   ├── segundo-factor.ts
│       │   │   │               │   ├── segundo-factor.html
│       │   │   │               │   └── segundo-factor.css
│       │   │   │               ├── recuperar-password/
│       │   │   │               │   ├── recuperar-password.ts
│       │   │   │               │   ├── recuperar-password.html
│       │   │   │               │   └── recuperar-password.css
│       │   │   │               ├── restablecer-password/
│       │   │   │               │   ├── restablecer-password.ts
│       │   │   │               │   ├── restablecer-password.html
│       │   │   │               │   └── restablecer-password.css
│       │   │   │               └── cambio-password-obligatorio/
│       │   │   │                   ├── cambio-password-obligatorio.ts
│       │   │   │                   ├── cambio-password-obligatorio.html
│       │   │   │                   └── cambio-password-obligatorio.css
│       │   │   ├── acceso.providers.ts
│       │   │   └── acceso.routes.ts
│       │   ├── inicio/
│       │   │   ├── domain/
│       │   │   │   ├── dashboard.model.ts
│       │   │   │   ├── alerta.model.ts
│       │   │   │   ├── indicador.model.ts
│       │   │   │   └── acceso-rapido.model.ts
│       │   │   ├── application/
│       │   │   │   ├── port/
│       │   │   │   │   └── out/
│       │   │   │   │       └── inicio.gateway.ts
│       │   │   │   └── use-case/
│       │   │   │       └── obtener-dashboard.use-case.ts
│       │   │   ├── adapter/
│       │   │   │   ├── out/
│       │   │   │   │   └── http/
│       │   │   │   │       ├── inicio-http.mapper.ts
│       │   │   │   │       └── inicio-http.adapter.ts
│       │   │   │   └── in/
│       │   │   │       └── ui/
│       │   │   │           ├── components/
│       │   │   │           │   ├── alertas-panel/
│       │   │   │           │   │   ├── alertas-panel.ts
│       │   │   │           │   │   ├── alertas-panel.html
│       │   │   │           │   │   └── alertas-panel.css
│       │   │   │           │   └── indicadores-panel/
│       │   │   │           │       ├── indicadores-panel.ts
│       │   │   │           │       ├── indicadores-panel.html
│       │   │   │           │       └── indicadores-panel.css
│       │   │   │           └── pages/
│       │   │   │               └── inicio/
│       │   │   │                   ├── inicio.ts
│       │   │   │                   ├── inicio.html
│       │   │   │                   └── inicio.css
│       │   │   ├── inicio.providers.ts
│       │   │   └── inicio.routes.ts
│       │   ├── mi-cuenta/
│       │   │   ├── domain/
│       │   │   │   ├── seguridad-cuenta.model.ts
│       │   │   │   ├── sesion.model.ts
│       │   │   │   └── dispositivo.model.ts
│       │   │   ├── application/
│       │   │   │   ├── port/
│       │   │   │   │   └── out/
│       │   │   │   │       └── mi-cuenta.gateway.ts
│       │   │   │   └── use-case/
│       │   │   │       ├── cambiar-password.use-case.ts
│       │   │   │       ├── solicitar-cambio-correo.use-case.ts
│       │   │   │       └── confirmar-cambio-correo.use-case.ts
│       │   │   │       ├── listar-sesiones.use-case.ts
│       │   │   │       ├── cerrar-sesion-remota.use-case.ts
│       │   │   │       ├── cerrar-otras-sesiones.use-case.ts
│       │   │   │       ├── listar-dispositivos.use-case.ts
│       │   │   │       └── reconocer-dispositivo.use-case.ts
│       │   │   │       └── quitar-reconocimiento-dispositivo.use-case.ts
│       │   │   ├── adapter/
│       │   │   │   ├── out/
│       │   │   │   │   └── http/
│       │   │   │   │       ├── mi-cuenta-http.mapper.ts
│       │   │   │   │       └── mi-cuenta-http.adapter.ts
│       │   │   │   └── in/
│       │   │   │       └── ui/
│       │   │   │           └── pages/
│       │   │   │               ├── perfil/
│       │   │   │               │   ├── perfil.ts
│       │   │   │               │   ├── perfil.html
│       │   │   │               │   └── perfil.css
│       │   │   │               ├── seguridad/
│       │   │   │               │   ├── seguridad.ts
│       │   │   │               │   ├── seguridad.html
│       │   │   │               │   └── seguridad.css
│       │   │   │               ├── sesiones/
│       │   │   │               │   ├── sesiones.ts
│       │   │   │               │   ├── sesiones.html
│       │   │   │               │   └── sesiones.css
│       │   │   │               └── dispositivos/
│       │   │   │                   ├── dispositivos.ts
│       │   │   │                   ├── dispositivos.html
│       │   │   │                   └── dispositivos.css
│       │   │   ├── mi-cuenta.providers.ts
│       │   │   └── mi-cuenta.routes.ts
│       │   ├── administracion/
│       │   │   ├── catalogos/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── catalogo.model.ts
│       │   │   │   │   ├── catalogo-item.model.ts
│       │   │   │   │   └── catalogo-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/catalogos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-catalogos.use-case.ts
│       │   │   │   │       ├── crear-item-catalogo.use-case.ts
│       │   │   │   │       ├── editar-item-catalogo.use-case.ts
│       │   │   │   │       └── deshabilitar-item-catalogo.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── catalogos-http.mapper.ts
│       │   │   │   │   │   └── catalogos-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── catalogos-list/
│       │   │   │   │       │   ├── catalogos-list.ts
│       │   │   │   │       │   ├── catalogos-list.html
│       │   │   │   │       │   └── catalogos-list.css
│       │   │   │   │       └── catalogo-detail/
│       │   │   │   │           ├── catalogo-detail.ts
│       │   │   │   │           ├── catalogo-detail.html
│       │   │   │   │           └── catalogo-detail.css
│       │   │   │   ├── catalogos.providers.ts
│       │   │   │   └── catalogos.routes.ts
│       │   │   ├── organizaciones/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── empresa.model.ts
│       │   │   │   │   ├── asociacion.model.ts
│       │   │   │   │   └── area.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/organizaciones.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-organizaciones.use-case.ts
│       │   │   │   │       ├── crear-empresa.use-case.ts
│       │   │   │   │       ├── editar-empresa.use-case.ts
│       │   │   │   │       ├── crear-asociacion.use-case.ts
│       │   │   │   │       ├── editar-asociacion.use-case.ts
│       │   │   │   │       ├── crear-area.use-case.ts
│       │   │   │   │       └── editar-area.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── organizaciones-http.mapper.ts
│       │   │   │   │   │   └── organizaciones-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── organizaciones-list/
│       │   │   │   │       │   ├── organizaciones-list.ts
│       │   │   │   │       │   ├── organizaciones-list.html
│       │   │   │   │       │   └── organizaciones-list.css
│       │   │   │   │       └── organizacion-form/
│       │   │   │   │           ├── organizacion-form.ts
│       │   │   │   │           ├── organizacion-form.html
│       │   │   │   │           └── organizacion-form.css
│       │   │   │   ├── organizaciones.providers.ts
│       │   │   │   └── organizaciones.routes.ts
│       │   │   ├── roles-permisos/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── rol.model.ts
│       │   │   │   │   ├── permiso.model.ts
│       │   │   │   │   └── rol-permiso.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/roles-permisos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-roles.use-case.ts
│       │   │   │   │       ├── obtener-rol.use-case.ts
│       │   │   │   │       ├── crear-rol.use-case.ts
│       │   │   │   │       ├── editar-rol.use-case.ts
│       │   │   │   │       ├── deshabilitar-rol.use-case.ts
│       │   │   │   │       └── actualizar-permisos-rol.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── roles-permisos-http.mapper.ts
│       │   │   │   │   │   └── roles-permisos-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── roles-list/
│       │   │   │   │       │   ├── roles-list.ts
│       │   │   │   │       │   ├── roles-list.html
│       │   │   │   │       │   └── roles-list.css
│       │   │   │   │       ├── rol-detail/
│       │   │   │   │       │   ├── rol-detail.ts
│       │   │   │   │       │   ├── rol-detail.html
│       │   │   │   │       │   └── rol-detail.css
│       │   │   │   │       └── rol-permisos/
│       │   │   │   │           ├── rol-permisos.ts
│       │   │   │   │           ├── rol-permisos.html
│       │   │   │   │           └── rol-permisos.css
│       │   │   │   ├── roles-permisos.providers.ts
│       │   │   │   └── roles-permisos.routes.ts
│       │   │   ├── empleados/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── empleado.model.ts
│       │   │   │   │   └── empleado-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/empleados.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-empleados.use-case.ts
│       │   │   │   │       ├── obtener-empleado.use-case.ts
│       │   │   │   │       ├── crear-empleado.use-case.ts
│       │   │   │   │       ├── editar-empleado.use-case.ts
│       │   │   │   │       └── retirar-empleado.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── empleados-http.mapper.ts
│       │   │   │   │   │   └── empleados-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── empleados-list/
│       │   │   │   │       │   ├── empleados-list.ts
│       │   │   │   │       │   ├── empleados-list.html
│       │   │   │   │       │   └── empleados-list.css
│       │   │   │   │       ├── empleado-detail/
│       │   │   │   │       │   ├── empleado-detail.ts
│       │   │   │   │       │   ├── empleado-detail.html
│       │   │   │   │       │   └── empleado-detail.css
│       │   │   │   │       └── empleado-form/
│       │   │   │   │           ├── empleado-form.ts
│       │   │   │   │           ├── empleado-form.html
│       │   │   │   │           └── empleado-form.css
│       │   │   │   ├── empleados.providers.ts
│       │   │   │   └── empleados.routes.ts
│       │   │   ├── usuarios/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── usuario.model.ts
│       │   │   │   │   ├── usuario-dispositivo.model.ts
│       │   │   │   │   └── usuario-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/usuarios.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-usuarios.use-case.ts
│       │   │   │   │       ├── obtener-usuario.use-case.ts
│       │   │   │   │       ├── crear-cuenta.use-case.ts
│       │   │   │   │       ├── editar-cuenta.use-case.ts
│       │   │   │   │       ├── deshabilitar-cuenta.use-case.ts
│       │   │   │   │       ├── reactivar-cuenta.use-case.ts
│       │   │   │   │       ├── asignar-rol-usuario.use-case.ts
│       │   │   │   │       └── retirar-rol-usuario.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── usuarios-http.mapper.ts
│       │   │   │   │   │   └── usuarios-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── usuarios-list/
│       │   │   │   │       │   ├── usuarios-list.ts
│       │   │   │   │       │   ├── usuarios-list.html
│       │   │   │   │       │   └── usuarios-list.css
│       │   │   │   │       ├── usuario-detail/
│       │   │   │   │       │   ├── usuario-detail.ts
│       │   │   │   │       │   ├── usuario-detail.html
│       │   │   │   │       │   └── usuario-detail.css
│       │   │   │   │       └── usuario-form/
│       │   │   │   │           ├── usuario-form.ts
│       │   │   │   │           ├── usuario-form.html
│       │   │   │   │           └── usuario-form.css
│       │   │   │   ├── usuarios.providers.ts
│       │   │   │   └── usuarios.routes.ts
│       │   │   └── administracion.routes.ts
│       │   ├── documentos-evidencias/
│       │   │   ├── domain/
│       │   │   │   ├── documento-evidencia.model.ts
│       │   │   │   ├── evidencia-contexto.model.ts
│       │   │   │   └── evidencia-filtro.model.ts
│       │   │   ├── application/
│       │   │   │   ├── port/out/
│       │   │   │   │   ├── documentos-evidencias.gateway.ts
│       │   │   │   │   └── evidence-storage.gateway.ts
│       │   │   │   └── use-case/
│       │   │   │       ├── listar-documentos-evidencias.use-case.ts
│       │   │   │       ├── obtener-documento-evidencia.use-case.ts
│       │   │   │       ├── subir-documento-evidencia.use-case.ts
│       │   │   │       ├── registrar-fotografia.use-case.ts
│       │   │   │       └── retirar-documento-evidencia.use-case.ts
│       │   │   ├── adapter/
│       │   │   │   ├── out/
│       │   │   │   │   ├── http/
│       │   │   │   │   │   ├── documentos-evidencias-http.mapper.ts
│       │   │   │   │   │   └── documentos-evidencias-http.adapter.ts
│       │   │   │   │   └── storage/
│       │   │   │   │       └── cloudinary-evidence-storage.adapter.ts
│       │   │   │   └── in/ui/
│       │   │   │       ├── components/
│       │   │   │       │   ├── evidence-panel/
│       │   │   │       │   │   ├── evidence-panel.ts
│       │   │   │       │   │   ├── evidence-panel.html
│       │   │   │       │   │   └── evidence-panel.css
│       │   │   │       │   ├── evidence-uploader/
│       │   │   │       │   │   ├── evidence-uploader.ts
│       │   │   │       │   │   ├── evidence-uploader.html
│       │   │   │       │   │   └── evidence-uploader.css
│       │   │   │       │   ├── evidence-camera/
│       │   │   │       │   │   ├── evidence-camera.ts
│       │   │   │       │   │   ├── evidence-camera.html
│       │   │   │       │   │   └── evidence-camera.css
│       │   │   │       │   └── evidence-preview/
│       │   │   │       │       ├── evidence-preview.ts
│       │   │   │       │       ├── evidence-preview.html
│       │   │   │       │       └── evidence-preview.css
│       │   │   │       └── pages/
│       │   │   │           ├── documentos-evidencias-list/
│       │   │   │           │   ├── documentos-evidencias-list.ts
│       │   │   │           │   ├── documentos-evidencias-list.html
│       │   │   │           │   └── documentos-evidencias-list.css
│       │   │   │           └── documento-evidencia-detail/
│       │   │   │               ├── documento-evidencia-detail.ts
│       │   │   │               ├── documento-evidencia-detail.html
│       │   │   │               └── documento-evidencia-detail.css
│       │   │   ├── documentos-evidencias.providers.ts
│       │   │   ├── documentos-evidencias.routes.ts
│       │   │   └── public-api.ts
│       │   ├── recursos/
│       │   │   ├── inventario-vehiculos/
│       │   │   │   ├── domain/
│       │   │   │   │   └── bien-inventario.model.ts
│       │   │   │   │   ├── vehiculo.model.ts
│       │   │   │   │   ├── suministro.model.ts
│       │   │   │   │   └── movimiento-suministro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/inventario-vehiculos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       └── listar-bienes.use-case.ts
│       │   │   │   │       └── obtener-bien.use-case.ts
│       │   │   │   │       └── crear-bien.use-case.ts
│       │   │   │   │       └── editar-bien.use-case.ts
│       │   │   │   │       ├── retirar-bien.use-case.ts
│       │   │   │   │       ├── obtener-vehiculo.use-case.ts
│       │   │   │   │       ├── actualizar-kilometraje.use-case.ts
│       │   │   │   │       ├── listar-suministros.use-case.ts
│       │   │   │   │       ├── consultar-kardex-suministro.use-case.ts
│       │   │   │   │       └── registrar-movimiento-suministro.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── inventario-vehiculos-http.mapper.ts
│       │   │   │   │   │   └── inventario-vehiculos-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── inventario-vehiculos-list/
│       │   │   │   │       │   ├── inventario-vehiculos-list.ts
│       │   │   │   │       │   ├── inventario-vehiculos-list.html
│       │   │   │   │       │   └── inventario-vehiculos-list.css
│       │   │   │   │       ├── recurso-detail/
│       │   │   │   │       │   ├── recurso-detail.ts
│       │   │   │   │       │   ├── recurso-detail.html
│       │   │   │   │       │   └── recurso-detail.css
│       │   │   │   │       └── recurso-form/
│       │   │   │   │           ├── recurso-form.ts
│       │   │   │   │           ├── recurso-form.html
│       │   │   │   │           └── recurso-form.css
│       │   │   │   ├── inventario-vehiculos.providers.ts
│       │   │   │   └── inventario-vehiculos.routes.ts
│       │   │   ├── programados/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── recurso-programado.model.ts
│       │   │   │   │   ├── disponibilidad-recurso.model.ts
│       │   │   │   │   ├── disponibilidad-recurso.model.ts
│       │   │   │   │   └── recurso-programado-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/programados.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-recursos-programados.use-case.ts
│       │   │   │   │       ├── obtener-recurso-programado.use-case.ts
│       │   │   │   │       ├── consultar-disponibilidad-recursos.use-case.ts
│       │   │   │   │       ├── programar-recurso.use-case.ts
│       │   │   │   │       └── editar-recurso-programado.use-case.ts
│       │   │   │   │       ├── asignar-recurso.use-case.ts
│       │   │   │   │       ├── registrar-devolucion-recurso.use-case.ts
│       │   │   │   │       └── cancelar-recurso-programado.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── programados-http.mapper.ts
│       │   │   │   │   │   └── programados-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── recursos-programados-list/
│       │   │   │   │       │   ├── recursos-programados-list.ts
│       │   │   │   │       │   ├── recursos-programados-list.html
│       │   │   │   │       │   └── recursos-programados-list.css
│       │   │   │   │       └── recurso-programado-form/
│       │   │   │   │           ├── recurso-programado-form.ts
│       │   │   │   │           ├── recurso-programado-form.html
│       │   │   │   │           └── recurso-programado-form.css
│       │   │   │   ├── programados.providers.ts
│       │   │   │   └── programados.routes.ts
│       │   │   └── recursos.routes.ts
│       │   ├── gestion-tecnica/
│       │   │   ├── productores/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── productor.model.ts
│       │   │   │   │   ├── productor-detalle.model.ts
│       │   │   │   │   └── productor-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/productores.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-productores.use-case.ts
│       │   │   │   │       ├── obtener-productor.use-case.ts
│       │   │   │   │       ├── crear-productor.use-case.ts
│       │   │   │   │       ├── editar-productor.use-case.ts
│       │   │   │   │       └── retirar-productor.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── productores-http.mapper.ts
│       │   │   │   │   │   └── productores-http.adapter.ts
│       │   │   │   │   └── in/ui/
│       │   │   │   │       ├── components/
│       │   │   │   │       │   └── productor-summary/
│       │   │   │   │       │       ├── productor-summary.ts
│       │   │   │   │       │       ├── productor-summary.html
│       │   │   │   │       │       └── productor-summary.css
│       │   │   │   │       └── pages/
│       │   │   │   │           ├── productores-list/
│       │   │   │   │           │   ├── productores-list.ts
│       │   │   │   │           │   ├── productores-list.html
│       │   │   │   │           │   └── productores-list.css
│       │   │   │   │           ├── productor-detail/
│       │   │   │   │           │   ├── productor-detail.ts
│       │   │   │   │           │   ├── productor-detail.html
│       │   │   │   │           │   └── productor-detail.css
│       │   │   │   │           └── productor-form/
│       │   │   │   │               ├── productor-form.ts
│       │   │   │   │               ├── productor-form.html
│       │   │   │   │               └── productor-form.css
│       │   │   │   ├── productores.providers.ts
│       │   │   │   └── productores.routes.ts
│       │   │   ├── predios/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── predio.model.ts
│       │   │   │   │   ├── predio-detalle.model.ts
│       │   │   │   │   ├── titularidad.model.ts
│       │   │   │   │   └── predio-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/predios.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-predios.use-case.ts
│       │   │   │   │       ├── obtener-predio.use-case.ts
│       │   │   │   │       ├── crear-predio.use-case.ts
│       │   │   │   │       ├── editar-predio.use-case.ts
│       │   │   │   │       └── retirar-predio.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── predios-http.mapper.ts
│       │   │   │   │   │   └── predios-http.adapter.ts
│       │   │   │   │   └── in/ui/
│       │   │   │   │       ├── components/
│       │   │   │   │       │   ├── predio-map/
│       │   │   │   │       │   │   ├── predio-map.ts
│       │   │   │   │       │   │   ├── predio-map.html
│       │   │   │   │       │   │   └── predio-map.css
│       │   │   │   │       │   └── titularidad-panel/
│       │   │   │   │       │       ├── titularidad-panel.ts
│       │   │   │   │       │       ├── titularidad-panel.html
│       │   │   │   │       │       └── titularidad-panel.css
│       │   │   │   │       └── pages/
│       │   │   │   │           ├── predios-list/
│       │   │   │   │           │   ├── predios-list.ts
│       │   │   │   │           │   ├── predios-list.html
│       │   │   │   │           │   └── predios-list.css
│       │   │   │   │           ├── predio-detail/
│       │   │   │   │           │   ├── predio-detail.ts
│       │   │   │   │           │   ├── predio-detail.html
│       │   │   │   │           │   └── predio-detail.css
│       │   │   │   │           └── predio-form/
│       │   │   │   │               ├── predio-form.ts
│       │   │   │   │               ├── predio-form.html
│       │   │   │   │               └── predio-form.css
│       │   │   │   ├── predios.providers.ts
│       │   │   │   └── predios.routes.ts
│       │   │   ├── parcelas-cultivos/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── parcela.model.ts
│       │   │   │   │   ├── cultivo.model.ts
│       │   │   │   │   └── expediente-cultivo.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/parcelas-cultivos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-parcelas-cultivos.use-case.ts
│       │   │   │   │       ├── obtener-expediente-cultivo.use-case.ts
│       │   │   │   │       ├── crear-parcela.use-case.ts
│       │   │   │   │       ├── editar-parcela.use-case.ts
│       │   │   │   │       ├── crear-cultivo.use-case.ts
│       │   │   │   │       ├── editar-cultivo.use-case.ts
│       │   │   │   │       └── finalizar-cultivo.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── parcelas-cultivos-http.mapper.ts
│       │   │   │   │   │   └── parcelas-cultivos-http.adapter.ts
│       │   │   │   │   └── in/ui/
│       │   │   │   │       ├── components/
│       │   │   │   │       │   └── cultivo-status/
│       │   │   │   │       │       ├── cultivo-status.ts
│       │   │   │   │       │       ├── cultivo-status.html
│       │   │   │   │       │       └── cultivo-status.css
│       │   │   │   │       └── pages/
│       │   │   │   │           ├── parcelas-cultivos-list/
│       │   │   │   │           │   ├── parcelas-cultivos-list.ts
│       │   │   │   │           │   ├── parcelas-cultivos-list.html
│       │   │   │   │           │   └── parcelas-cultivos-list.css
│       │   │   │   │           ├── parcela-form/
│       │   │   │   │           │   ├── parcela-form.ts
│       │   │   │   │           │   ├── parcela-form.html
│       │   │   │   │           │   └── parcela-form.css
│       │   │   │   │           ├── cultivo-form/
│       │   │   │   │           │   ├── cultivo-form.ts
│       │   │   │   │           │   ├── cultivo-form.html
│       │   │   │   │           │   └── cultivo-form.css
│       │   │   │   │           └── expediente-cultivo/
│       │   │   │   │               ├── expediente-cultivo.ts
│       │   │   │   │               ├── expediente-cultivo.html
│       │   │   │   │               └── expediente-cultivo.css
│       │   │   │   ├── parcelas-cultivos.providers.ts
│       │   │   │   └── parcelas-cultivos.routes.ts
│       │   │   ├── censos/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── censo.model.ts
│       │   │   │   │   └── censo-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/censos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-censos.use-case.ts
│       │   │   │   │       ├── crear-censo.use-case.ts
│       │   │   │   │       └── editar-censo.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── censos-http.mapper.ts
│       │   │   │   │   │   └── censos-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── censos-list/
│       │   │   │   │       │   ├── censos-list.ts
│       │   │   │   │       │   ├── censos-list.html
│       │   │   │   │       │   └── censos-list.css
│       │   │   │   │       └── censo-form/
│       │   │   │   │           ├── censo-form.ts
│       │   │   │   │           ├── censo-form.html
│       │   │   │   │           └── censo-form.css
│       │   │   │   ├── censos.providers.ts
│       │   │   │   └── censos.routes.ts
│       │   │   ├── salidas/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── salida-campo.model.ts
│       │   │   │   │   ├── salida-participante.model.ts
│       │   │   │   │   └── salida-recurso.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/salidas.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-salidas.use-case.ts
│       │   │   │   │       ├── obtener-salida.use-case.ts
│       │   │   │   │       ├── programar-salida.use-case.ts
│       │   │   │   │       ├── editar-salida.use-case.ts
│       │   │   │   │       ├── asignar-participantes.use-case.ts
│       │   │   │   │       ├── cancelar-salida.use-case.ts
│       │   │   │   │       └── finalizar-salida.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── salidas-http.mapper.ts
│       │   │   │   │   │   └── salidas-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── salidas-list/
│       │   │   │   │       │   ├── salidas-list.ts
│       │   │   │   │       │   ├── salidas-list.html
│       │   │   │   │       │   └── salidas-list.css
│       │   │   │   │       ├── salida-detail/
│       │   │   │   │       │   ├── salida-detail.ts
│       │   │   │   │       │   ├── salida-detail.html
│       │   │   │   │       │   └── salida-detail.css
│       │   │   │   │       └── salida-form/
│       │   │   │   │           ├── salida-form.ts
│       │   │   │   │           ├── salida-form.html
│       │   │   │   │           └── salida-form.css
│       │   │   │   ├── salidas.providers.ts
│       │   │   │   └── salidas.routes.ts
│       │   │   ├── visitas/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── visita-tecnica.model.ts
│       │   │   │   │   ├── visita-evidencia.model.ts
│       │   │   │   │   └── visita-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/visitas.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-visitas.use-case.ts
│       │   │   │   │       ├── obtener-visita.use-case.ts
│       │   │   │   │       └── iniciar-visita.use-case.ts
│       │   │   │   │       ├── editar-visita.use-case.ts
│       │   │   │   │       ├── finalizar-visita.use-case.ts
│       │   │   │   │       └── anular-visita.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── visitas-http.mapper.ts
│       │   │   │   │   │   └── visitas-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── visitas-list/
│       │   │   │   │       │   ├── visitas-list.ts
│       │   │   │   │       │   ├── visitas-list.html
│       │   │   │   │       │   └── visitas-list.css
│       │   │   │   │       └── visita-detail/
│       │   │   │   │           ├── visita-detail.ts
│       │   │   │   │           ├── visita-detail.html
│       │   │   │   │           └── visita-detail.css
│       │   │   │   ├── visitas.providers.ts
│       │   │   │   └── visitas.routes.ts
│       │   │   ├── evaluaciones/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── evaluacion-agronomica.model.ts
│       │   │   │   │   └── materia-seca.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/evaluaciones.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-evaluaciones.use-case.ts
│       │   │   │   │       ├── obtener-evaluacion.use-case.ts
│       │   │   │   │       ├── crear-evaluacion.use-case.ts
│       │   │   │   │       ├── editar-evaluacion.use-case.ts
│       │   │   │   │       └── registrar-materia-seca.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── evaluaciones-http.mapper.ts
│       │   │   │   │   │   └── evaluaciones-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── evaluaciones-list/
│       │   │   │   │       │   ├── evaluaciones-list.ts
│       │   │   │   │       │   ├── evaluaciones-list.html
│       │   │   │   │       │   └── evaluaciones-list.css
│       │   │   │   │       ├── evaluacion-detail/
│       │   │   │   │       │   ├── evaluacion-detail.ts
│       │   │   │   │       │   ├── evaluacion-detail.html
│       │   │   │   │       │   └── evaluacion-detail.css
│       │   │   │   │       └── evaluacion-form/
│       │   │   │   │           ├── evaluacion-form.ts
│       │   │   │   │           ├── evaluacion-form.html
│       │   │   │   │           └── evaluacion-form.css
│       │   │   │   ├── evaluaciones.providers.ts
│       │   │   │   └── evaluaciones.routes.ts
│       │   │   ├── sanidad/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── caso-sanitario.model.ts
│       │   │   │   │   ├── tratamiento.model.ts
│       │   │   │   │   └── seguimiento-sanitario.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/sanidad.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-casos-sanitarios.use-case.ts
│       │   │   │   │       ├── obtener-caso-sanitario.use-case.ts
│       │   │   │   │       ├── crear-caso-sanitario.use-case.ts
│       │   │   │   │       ├── editar-caso-sanitario.use-case.ts
│       │   │   │   │       ├── cambiar-estado-caso.use-case.ts
│       │   │   │   │       └── cerrar-caso-sanitario.use-case.ts
│       │   │   │   │       ├── registrar-tratamiento.use-case.ts
│       │   │   │   │       └── registrar-seguimiento.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── sanidad-http.mapper.ts
│       │   │   │   │   │   └── sanidad-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── sanidad-list/
│       │   │   │   │       │   ├── sanidad-list.ts
│       │   │   │   │       │   ├── sanidad-list.html
│       │   │   │   │       │   └── sanidad-list.css
│       │   │   │   │       ├── caso-sanitario-detail/
│       │   │   │   │       │   ├── caso-sanitario-detail.ts
│       │   │   │   │       │   ├── caso-sanitario-detail.html
│       │   │   │   │       │   └── caso-sanitario-detail.css
│       │   │   │   │       └── caso-sanitario-form/
│       │   │   │   │           ├── caso-sanitario-form.ts
│       │   │   │   │           ├── caso-sanitario-form.html
│       │   │   │   │           └── caso-sanitario-form.css
│       │   │   │   ├── sanidad.providers.ts
│       │   │   │   └── sanidad.routes.ts
│       │   │   ├── produccion/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── produccion-disponible.model.ts
│       │   │   │   │   ├── estimacion-produccion.model.ts
│       │   │   │   │   └── produccion-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/produccion.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-produccion.use-case.ts
│       │   │   │   │       ├── obtener-produccion.use-case.ts
│       │   │   │   │       ├── crear-estimacion.use-case.ts
│       │   │   │   │       ├── editar-estimacion.use-case.ts
│       │   │   │   │       ├── confirmar-produccion.use-case.ts
│       │   │   │   │       └── descartar-produccion.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── produccion-http.mapper.ts
│       │   │   │   │   │   └── produccion-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── produccion-list/
│       │   │   │   │       │   ├── produccion-list.ts
│       │   │   │   │       │   ├── produccion-list.html
│       │   │   │   │       │   └── produccion-list.css
│       │   │   │   │       ├── produccion-detail/
│       │   │   │   │       │   ├── produccion-detail.ts
│       │   │   │   │       │   ├── produccion-detail.html
│       │   │   │   │       │   └── produccion-detail.css
│       │   │   │   │       └── produccion-form/
│       │   │   │   │           ├── produccion-form.ts
│       │   │   │   │           ├── produccion-form.html
│       │   │   │   │           └── produccion-form.css
│       │   │   │   ├── produccion.providers.ts
│       │   │   │   └── produccion.routes.ts
│       │   │   └── gestion-tecnica.routes.ts
│       │   ├── gestion-comercial/
│       │   │   ├── campanias/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── campania.model.ts
│       │   │   │   │   └── campania-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/campanias.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-campanias.use-case.ts
│       │   │   │   │       ├── obtener-campania.use-case.ts
│       │   │   │   │       ├── crear-campania.use-case.ts
│       │   │   │   │       ├── editar-campania.use-case.ts
│       │   │   │   │       ├── activar-campania.use-case.ts
│       │   │   │   │       ├── cerrar-campania.use-case.ts
│       │   │   │   │       └── cancelar-campania.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── campanias-http.mapper.ts
│       │   │   │   │   │   └── campanias-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── campanias-list/
│       │   │   │   │       │   ├── campanias-list.ts
│       │   │   │   │       │   ├── campanias-list.html
│       │   │   │   │       │   └── campanias-list.css
│       │   │   │   │       ├── campania-detail/
│       │   │   │   │       │   ├── campania-detail.ts
│       │   │   │   │       │   ├── campania-detail.html
│       │   │   │   │       │   └── campania-detail.css
│       │   │   │   │       └── campania-form/
│       │   │   │   │           ├── campania-form.ts
│       │   │   │   │           ├── campania-form.html
│       │   │   │   │           └── campania-form.css
│       │   │   │   ├── campanias.providers.ts
│       │   │   │   └── campanias.routes.ts
│       │   │   ├── condiciones-precios/
│       │   │   │   ├── domain/
│       │   │   │   │   └── condicion-comercial.model.ts
│       │   │   │   │   └── precio-comercial.model.ts
│       │   │   │   │   └── precio-version.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/condiciones-precios.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       └── listar-condiciones.use-case.ts
│       │   │   │   │       └── crear-condicion.use-case.ts
│       │   │   │   │       └── editar-condicion.use-case.ts
│       │   │   │   │       ├── deshabilitar-condicion.use-case.ts
│       │   │   │   │       ├── listar-precios.use-case.ts
│       │   │   │   │       ├── crear-precio.use-case.ts
│       │   │   │   │       ├── versionar-precio.use-case.ts
│       │   │   │   │       └── ver-historial-precio.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── condiciones-precios-http.mapper.ts
│       │   │   │   │   │   └── condiciones-precios-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── condiciones-precios-list/
│       │   │   │   │       │   ├── condiciones-precios-list.ts
│       │   │   │   │       │   ├── condiciones-precios-list.html
│       │   │   │   │       │   └── condiciones-precios-list.css
│       │   │   │   │       ├── condicion-precio-detail/
│       │   │   │   │       │   ├── condicion-precio-detail.ts
│       │   │   │   │       │   ├── condicion-precio-detail.html
│       │   │   │   │       │   └── condicion-precio-detail.css
│       │   │   │   │       └── condicion-precio-form/
│       │   │   │   │           ├── condicion-precio-form.ts
│       │   │   │   │           ├── condicion-precio-form.html
│       │   │   │   │           └── condicion-precio-form.css
│       │   │   │   ├── condiciones-precios.providers.ts
│       │   │   │   └── condiciones-precios.routes.ts
│       │   │   ├── participantes/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── participante-campania.model.ts
│       │   │   │   │   └── participante-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/participantes.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-participantes.use-case.ts
│       │   │   │   │       └── obtener-participante.use-case.ts
│       │   │   │   │       ├── incluir-participante.use-case.ts
│       │   │   │   │       └── programar-participante-operativo.use-case.ts
│       │   │   │   │       └── retirar-participante.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── participantes-http.mapper.ts
│       │   │   │   │   │   └── participantes-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── participantes-list/
│       │   │   │   │       │   ├── participantes-list.ts
│       │   │   │   │       │   ├── participantes-list.html
│       │   │   │   │       │   └── participantes-list.css
│       │   │   │   │       └── participante-form/
│       │   │   │   │           ├── participante-form.ts
│       │   │   │   │           ├── participante-form.html
│       │   │   │   │           └── participante-form.css
│       │   │   │   ├── participantes.providers.ts
│       │   │   │   └── participantes.routes.ts
│       │   │   ├── operativos/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── operativo.model.ts
│       │   │   │   │   ├── operativo-recurso.model.ts
│       │   │   │   │   └── operativo-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/operativos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-operativos.use-case.ts
│       │   │   │   │       ├── obtener-operativo.use-case.ts
│       │   │   │   │       ├── crear-operativo.use-case.ts
│       │   │   │   │       ├── editar-operativo.use-case.ts
│       │   │   │   │       ├── asignar-zonas-operativo.use-case.ts
│       │   │   │   │       └── iniciar-recepcion-operativo.use-case.ts
│       │   │   │   │       ├── cerrar-operativo.use-case.ts
│       │   │   │   │       └── cancelar-operativo.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── operativos-http.mapper.ts
│       │   │   │   │   │   └── operativos-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── operativos-list/
│       │   │   │   │       │   ├── operativos-list.ts
│       │   │   │   │       │   ├── operativos-list.html
│       │   │   │   │       │   └── operativos-list.css
│       │   │   │   │       ├── operativo-detail/
│       │   │   │   │       │   ├── operativo-detail.ts
│       │   │   │   │       │   ├── operativo-detail.html
│       │   │   │   │       │   └── operativo-detail.css
│       │   │   │   │       └── operativo-form/
│       │   │   │   │           ├── operativo-form.ts
│       │   │   │   │           ├── operativo-form.html
│       │   │   │   │           └── operativo-form.css
│       │   │   │   ├── operativos.providers.ts
│       │   │   │   └── operativos.routes.ts
│       │   │   ├── jabas/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── movimiento-jaba.model.ts
│       │   │   │   │   ├── saldo-jaba.model.ts
│       │   │   │   │   └── jaba-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/jabas.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-jabas.use-case.ts
│       │   │   │   │       ├── consultar-saldo-jabas.use-case.ts
│       │   │   │   │       └── consultar-historial-jabas.use-case.ts
│       │   │   │   │       └── registrar-recepcion-jabas.use-case.ts
│       │   │   │   │       └── asignar-jabas.use-case.ts
│       │   │   │   │       ├── registrar-devolucion-jabas.use-case.ts
│       │   │   │   │       └── anular-movimiento-jabas.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── jabas-http.mapper.ts
│       │   │   │   │   │   └── jabas-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── jabas-list/
│       │   │   │   │       │   ├── jabas-list.ts
│       │   │   │   │       │   ├── jabas-list.html
│       │   │   │   │       │   └── jabas-list.css
│       │   │   │   │       └── movimiento-jaba-form/
│       │   │   │   │           ├── movimiento-jaba-form.ts
│       │   │   │   │           ├── movimiento-jaba-form.html
│       │   │   │   │           └── movimiento-jaba-form.css
│       │   │   │   ├── jabas.providers.ts
│       │   │   │   └── jabas.routes.ts
│       │   │   ├── acopio-entregas/
│       │   │   │   ├── domain/
│       │   │   │   │   └── entrega-detalle.model.ts
│       │   │   │   │   ├── entrega.model.ts
│       │   │   │   │   └── entrega-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/acopio-entregas.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       └── listar-entregas.use-case.ts
│       │   │   │   │       ├── obtener-entrega.use-case.ts
│       │   │   │   │       ├── registrar-entrega.use-case.ts
│       │   │   │   │       └── editar-entrega-preliminar.use-case.ts
│       │   │   │   │       ├── confirmar-entrega.use-case.ts
│       │   │   │   │       └── anular-entrega.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── acopio-entregas-http.mapper.ts
│       │   │   │   │   │   └── acopio-entregas-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── acopio-entregas-list/
│       │   │   │   │       │   ├── acopio-entregas-list.ts
│       │   │   │   │       │   ├── acopio-entregas-list.html
│       │   │   │   │       │   └── acopio-entregas-list.css
│       │   │   │   │       ├── entrega-detail/
│       │   │   │   │       │   ├── entrega-detail.ts
│       │   │   │   │       │   ├── entrega-detail.html
│       │   │   │   │       │   └── entrega-detail.css
│       │   │   │   │       └── acopio-entrega-form/
│       │   │   │   │           ├── acopio-entrega-form.ts
│       │   │   │   │           ├── acopio-entrega-form.html
│       │   │   │   │           └── acopio-entrega-form.css
│       │   │   │   ├── acopio-entregas.providers.ts
│       │   │   │   └── acopio-entregas.routes.ts
│       │   │   ├── incidencias/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── incidencia-operativa.model.ts
│       │   │   │   │   └── incidencia-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/incidencias.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-incidencias.use-case.ts
│       │   │   │   │       ├── obtener-incidencia.use-case.ts
│       │   │   │   │       └── registrar-incidencia.use-case.ts
│       │   │   │   │       └── revisar-incidencia.use-case.ts
│       │   │   │   │       ├── resolver-incidencia.use-case.ts
│       │   │   │   │       └── anular-incidencia.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── incidencias-http.mapper.ts
│       │   │   │   │   │   └── incidencias-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── incidencias-list/
│       │   │   │   │       │   ├── incidencias-list.ts
│       │   │   │   │       │   ├── incidencias-list.html
│       │   │   │   │       │   └── incidencias-list.css
│       │   │   │   │       ├── incidencia-detail/
│       │   │   │   │       │   ├── incidencia-detail.ts
│       │   │   │   │       │   ├── incidencia-detail.html
│       │   │   │   │       │   └── incidencia-detail.css
│       │   │   │   │       └── incidencia-form/
│       │   │   │   │           ├── incidencia-form.ts
│       │   │   │   │           ├── incidencia-form.html
│       │   │   │   │           └── incidencia-form.css
│       │   │   │   ├── incidencias.providers.ts
│       │   │   │   └── incidencias.routes.ts
│       │   │   ├── ajustes-precio/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── ajuste-precio.model.ts
│       │   │   │   │   └── impacto-ajuste.model.ts
│       │   │   │   │   └── ajuste-precio-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/ajustes-precio.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-ajustes-precio.use-case.ts
│       │   │   │   │       ├── ver-impacto-ajuste.use-case.ts
│       │   │   │   │       └── registrar-ajuste-precio.use-case.ts
│       │   │   │   │       └── anular-ajuste-precio.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── ajustes-precio-http.mapper.ts
│       │   │   │   │   │   └── ajustes-precio-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── ajustes-precio-list/
│       │   │   │   │       │   ├── ajustes-precio-list.ts
│       │   │   │   │       │   ├── ajustes-precio-list.html
│       │   │   │   │       │   └── ajustes-precio-list.css
│       │   │   │   │       ├── ajuste-precio-detail/
│       │   │   │   │       │   ├── ajuste-precio-detail.ts
│       │   │   │   │       │   ├── ajuste-precio-detail.html
│       │   │   │   │       │   └── ajuste-precio-detail.css
│       │   │   │   │       └── ajuste-precio-form/
│       │   │   │   │           ├── ajuste-precio-form.ts
│       │   │   │   │           ├── ajuste-precio-form.html
│       │   │   │   │           └── ajuste-precio-form.css
│       │   │   │   ├── ajustes-precio.providers.ts
│       │   │   │   └── ajustes-precio.routes.ts
│       │   │   └── gestion-comercial.routes.ts
│       │   ├── finanzas/
│       │   │   ├── gastos/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── gasto.model.ts
│       │   │   │   │   ├── prorrateo.model.ts
│       │   │   │   │   └── gasto-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/gastos.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-gastos.use-case.ts
│       │   │   │   │       ├── obtener-gasto.use-case.ts
│       │   │   │   │       ├── crear-gasto.use-case.ts
│       │   │   │   │       ├── editar-gasto.use-case.ts
│       │   │   │   │       └── prorratear-gasto.use-case.ts
│       │   │   │   │       ├── aprobar-gasto.use-case.ts
│       │   │   │   │       └── anular-gasto.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── gastos-http.mapper.ts
│       │   │   │   │   │   └── gastos-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── gastos-list/
│       │   │   │   │       │   ├── gastos-list.ts
│       │   │   │   │       │   ├── gastos-list.html
│       │   │   │   │       │   └── gastos-list.css
│       │   │   │   │       ├── gasto-detail/
│       │   │   │   │       │   ├── gasto-detail.ts
│       │   │   │   │       │   ├── gasto-detail.html
│       │   │   │   │       │   └── gasto-detail.css
│       │   │   │   │       └── gasto-form/
│       │   │   │   │           ├── gasto-form.ts
│       │   │   │   │           ├── gasto-form.html
│       │   │   │   │           └── gasto-form.css
│       │   │   │   ├── gastos.providers.ts
│       │   │   │   └── gastos.routes.ts
│       │   │   ├── liquidaciones/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── liquidacion.model.ts
│       │   │   │   │   ├── liquidacion-detalle.model.ts
│       │   │   │   │   └── liquidacion-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/liquidaciones.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-liquidaciones.use-case.ts
│       │   │   │   │       ├── obtener-liquidacion.use-case.ts
│       │   │   │   │       ├── calcular-liquidacion.use-case.ts
│       │   │   │   │       ├── recalcular-liquidacion.use-case.ts
│       │   │   │   │       └── aprobar-liquidacion.use-case.ts
│       │   │   │   │       └── anular-liquidacion.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── liquidaciones-http.mapper.ts
│       │   │   │   │   │   └── liquidaciones-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── liquidaciones-list/
│       │   │   │   │       │   ├── liquidaciones-list.ts
│       │   │   │   │       │   ├── liquidaciones-list.html
│       │   │   │   │       │   └── liquidaciones-list.css
│       │   │   │   │       └── liquidacion-detail/
│       │   │   │   │           ├── liquidacion-detail.ts
│       │   │   │   │           ├── liquidacion-detail.html
│       │   │   │   │           └── liquidacion-detail.css
│       │   │   │   ├── liquidaciones.providers.ts
│       │   │   │   └── liquidaciones.routes.ts
│       │   │   ├── pagos-socios/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── pago-socio.model.ts
│       │   │   │   │   └── pago-socio-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/pagos-socios.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-pagos-socios.use-case.ts
│       │   │   │   │       ├── obtener-pago-socio.use-case.ts
│       │   │   │   │       ├── registrar-pago-socio.use-case.ts
│       │   │   │   │       └── confirmar-pago-socio.use-case.ts
│       │   │   │   │       └── anular-pago-socio.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── pagos-socios-http.mapper.ts
│       │   │   │   │   │   └── pagos-socios-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── pagos-socios-list/
│       │   │   │   │       │   ├── pagos-socios-list.ts
│       │   │   │   │       │   ├── pagos-socios-list.html
│       │   │   │   │       │   └── pagos-socios-list.css
│       │   │   │   │       ├── pago-socio-detail/
│       │   │   │   │       │   ├── pago-socio-detail.ts
│       │   │   │   │       │   ├── pago-socio-detail.html
│       │   │   │   │       │   └── pago-socio-detail.css
│       │   │   │   │       └── pago-socio-form/
│       │   │   │   │           ├── pago-socio-form.ts
│       │   │   │   │           ├── pago-socio-form.html
│       │   │   │   │           └── pago-socio-form.css
│       │   │   │   ├── pagos-socios.providers.ts
│       │   │   │   └── pagos-socios.routes.ts
│       │   │   ├── cobros-compradores/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── cobro-comprador.model.ts
│       │   │   │   │   └── saldo-comprador.model.ts
│       │   │   │   │   └── cobro-comprador-filtro.model.ts
│       │   │   │   ├── application/
│       │   │   │   │   ├── port/out/cobros-compradores.gateway.ts
│       │   │   │   │   └── use-case/
│       │   │   │   │       ├── listar-cobros-compradores.use-case.ts
│       │   │   │   │       ├── consultar-saldo-comprador.use-case.ts
│       │   │   │   │       ├── registrar-cobro-comprador.use-case.ts
│       │   │   │   │       └── confirmar-cobro-comprador.use-case.ts
│       │   │   │   │       └── anular-cobro-comprador.use-case.ts
│       │   │   │   ├── adapter/
│       │   │   │   │   ├── out/http/
│       │   │   │   │   │   ├── cobros-compradores-http.mapper.ts
│       │   │   │   │   │   └── cobros-compradores-http.adapter.ts
│       │   │   │   │   └── in/ui/pages/
│       │   │   │   │       ├── cobros-compradores-list/
│       │   │   │   │       │   ├── cobros-compradores-list.ts
│       │   │   │   │       │   ├── cobros-compradores-list.html
│       │   │   │   │       │   └── cobros-compradores-list.css
│       │   │   │   │       ├── cobro-comprador-detail/
│       │   │   │   │       │   ├── cobro-comprador-detail.ts
│       │   │   │   │       │   ├── cobro-comprador-detail.html
│       │   │   │   │       │   └── cobro-comprador-detail.css
│       │   │   │   │       └── cobro-comprador-form/
│       │   │   │   │           ├── cobro-comprador-form.ts
│       │   │   │   │           ├── cobro-comprador-form.html
│       │   │   │   │           └── cobro-comprador-form.css
│       │   │   │   ├── cobros-compradores.providers.ts
│       │   │   │   └── cobros-compradores.routes.ts
│       │   │   └── finanzas.routes.ts
│       │   └── reportes-control/
│       │       ├── reportes/
│       │       │   ├── domain/
│       │       │   │   ├── reporte.model.ts
│       │       │   │   ├── reporte-seccion.model.ts
│       │       │   │   └── reporte-filtro.model.ts
│       │       │   ├── application/
│       │       │   │   ├── port/out/reportes.gateway.ts
│       │       │   │   └── use-case/
│       │       │   │       ├── listar-reportes.use-case.ts
│       │       │   │       ├── obtener-datos-reporte.use-case.ts
│       │       │   │       └── exportar-reporte.use-case.ts
│       │       │   ├── adapter/
│       │       │   │   ├── out/http/
│       │       │   │   │   ├── reportes-http.mapper.ts
│       │       │   │   │   └── reportes-http.adapter.ts
│       │       │   │   └── in/ui/pages/
│       │       │   │       ├── reportes-list/
│       │       │   │       │   ├── reportes-list.ts
│       │       │   │       │   ├── reportes-list.html
│       │       │   │       │   └── reportes-list.css
│       │       │   │       └── reporte-detail/
│       │       │   │           ├── reporte-detail.ts
│       │       │   │           ├── reporte-detail.html
│       │       │   │           └── reporte-detail.css
│       │       │   ├── reportes.providers.ts
│       │       │   └── reportes.routes.ts
│       │       ├── auditoria/
│       │       │   ├── domain/
│       │       │   │   ├── auditoria-evento.model.ts
│       │       │   │   ├── auditoria-detalle.model.ts
│       │       │   │   └── auditoria-filtro.model.ts
│       │       │   ├── application/
│       │       │   │   ├── port/out/auditoria.gateway.ts
│       │       │   │   └── use-case/
│       │       │   │       ├── listar-auditoria.use-case.ts
│       │       │   │       ├── obtener-evento-auditoria.use-case.ts
│       │       │   │       └── exportar-auditoria.use-case.ts
│       │       │   ├── adapter/
│       │       │   │   ├── out/http/
│       │       │   │   │   ├── auditoria-http.mapper.ts
│       │       │   │   │   └── auditoria-http.adapter.ts
│       │       │   │   └── in/ui/pages/
│       │       │   │       ├── auditoria-list/
│       │       │   │       │   ├── auditoria-list.ts
│       │       │   │       │   ├── auditoria-list.html
│       │       │   │       │   └── auditoria-list.css
│       │       │   │       └── auditoria-detail/
│       │       │   │           ├── auditoria-detail.ts
│       │       │   │           ├── auditoria-detail.html
│       │       │   │           └── auditoria-detail.css
│       │       │   ├── auditoria.providers.ts
│       │       │   └── auditoria.routes.ts
│       │       └── reportes-control.routes.ts
│       ├── app.config.ts
│       ├── app.routes.ts
│       ├── app.ts
│       ├── app.html
│       └── app.css
└── public/
    └── images/
        └── desco-logo.svg
```

---

# 3. QUÉ ARCHIVOS DEL PROYECTO BASE SÍ TOCAREMOS

Aunque Angular ya crea una aplicación funcional, los archivos raíz que sí forman parte de nuestro trabajo son:

```text
src/app/app.ts
src/app/app.html
src/app/app.css
src/app/app.config.ts
src/app/app.routes.ts
src/styles.css
```

También añadiremos:

```text
.postcssrc.json
src/environments/
src/styles/
tools/openapi/
src/app/core/
src/app/infrastructure/
src/app/shared/
src/app/features/
public/images/desco-logo.svg
```

## `app.ts`

Será el componente raíz mínimo.

No contendrá reglas de permisos, llamadas HTTP ni lógica de negocio.

Su responsabilidad será servir como entrada de la aplicación.

## `app.html`

Será mínimo.

La composición real de la aplicación autenticada vivirá en `shared/layout/app-shell`.

## `app.css`

Solo contendrá estilos estrictamente propios del host raíz cuando sean necesarios.

## `app.config.ts`

Será uno de los últimos archivos de plataforma en estabilizarse porque compone:

- router;
- HTTP;
- interceptores;
- OpenAPI;
- manejo global de errores;
- providers globales;
- configuración necesaria de la aplicación standalone.

## `app.routes.ts`

Compone las rutas principales y carga lazy de las features.

No contiene rutas distintas por rol.

## `styles.css`

Será el punto de entrada global para:

- Tailwind;
- daisyUI;
- Flowbite cuando corresponda;
- `theme.css`;
- `vendor-overrides.css`;
- `app-utilities.css`.

---

# 4. DEPENDENCIAS QUE DEBEMOS INSTALAR

El proyecto está nuevo, por lo que antes de desarrollar la arquitectura se instalarán solamente las dependencias realmente necesarias.

## 4.1. Tailwind CSS

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

Se crea manualmente:

```text
.postcssrc.json
```

y se modifica:

```text
src/styles.css
```

No necesitamos introducir un `tailwind.config.js` solo por costumbre.

---

## 4.2. daisyUI

```bash
npm install -D daisyui@latest
```

daisyUI se utilizará principalmente para elementos visuales sencillos:

- botones;
- inputs;
- select;
- textarea;
- badge;
- alert;
- card;
- tabs;
- estilos básicos de tablas.

Estos elementos **no justificarán crear un wrapper Angular en `shared`**.

---

## 4.3. Flowbite

```bash
npm install flowbite
```

Flowbite se utilizará únicamente donde aporte comportamiento interactivo suficientemente útil.

Su inicialización se centralizará en:

```text
src/app/core/ui/flowbite.service.ts
```

No se inicializará Flowbite manualmente en cada página.

---

## 4.4. Font Awesome para Angular 20

Para Angular 20 se utilizará una versión compatible de `angular-fontawesome`:

```bash
npm install @fortawesome/angular-fontawesome@3 @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons
```

No instalaremos paquetes de iconos regular/brands mientras no sean necesarios.

La selección de iconos globales se centralizará en:

```text
src/app/core/ui/fontawesome.config.ts
```

---

## 4.5. OpenAPI Generator

```bash
npm install -D @openapitools/openapi-generator-cli
```

No añadiremos paquetes HTTP alternativos.

Angular ya dispone de `HttpClient` y el cliente generado utilizará la infraestructura estándar de Angular.

---

## 4.6. Environments

Generaremos la configuración de environments de Angular:

```bash
ng generate environments
```

Los archivos que realmente editaremos son:

```text
src/environments/environment.ts
src/environments/environment.development.ts
```

La configuración automática que Angular aplique en el workspace no necesita aparecer en nuestra arquitectura.

---

# 5. DEPENDENCIAS QUE NO INSTALAREMOS TODAVÍA

No conviene llenar el proyecto nuevo con librerías que todavía no son necesarias.

Por ahora no se instalarán de forma preventiva:

```text
librerías de charts
librerías de mapas
librerías de fechas adicionales
state managers externos
component libraries adicionales
wrappers de modales
wrappers de tablas
librerías de formularios externas
```

Angular Signals + Reactive Forms + RxJS + nuestra arquitectura son suficientes para comenzar.

Si un módulo como Predios necesita posteriormente un mapa real, la librería se escogerá al implementar ese módulo.

---

# 6. ORDEN REAL DE PROGRAMACIÓN

El árbol anterior representa la estructura final, pero el trabajo se realizará por fases.

## FASE 0 — comprobar el proyecto limpio

Antes de cualquier dependencia:

```text
ng serve
ng build
```

La aplicación base debe compilar.

---

## FASE 1 — stack visual

Instalar y validar:

```text
Tailwind
daisyUI
Flowbite
Font Awesome
```

Después programar:

```text
.postcssrc.json
src/styles.css
src/styles/theme.css
src/styles/vendor-overrides.css
src/styles/app-utilities.css
src/app/core/ui/fontawesome.config.ts
src/app/core/ui/flowbite.service.ts
```

No avanzar hasta comprobar que el proyecto sigue compilando.

---

## FASE 2 — environments + OpenAPI

Preparar:

```text
src/environments/
tools/openapi/
src/app/infrastructure/openapi/
```

Orden:

```text
environment.ts
environment.development.ts
        ↓
openapi-generator-config.json
        ↓
generate-api.mjs
        ↓
generated/
        ↓
api-response-unwrapper.ts
        ↓
openapi-http-error.mapper.ts
        ↓
openapi.providers.ts
```

El backend es el contrato.

Swagger genera infraestructura HTTP.

Swagger **no genera nuestra arquitectura**.

---

# 7. CONFIGURACIÓN DE OPENAPI

La salida siempre será:

```text
src/app/infrastructure/openapi/generated/
```

No se crearán manualmente dentro de `generated/`:

```text
models
services
apis
configuration
index
```

ni ningún otro archivo.

Todo será responsabilidad del generador.

La configuración conceptual del generador será:

```text
generatorName: typescript-angular
ngVersion: 20.0.0
providedIn: root
withInterfaces: false
useSingleRequestParameter: true
stringEnums: true
```

## Regla absoluta

```text
adapter/out/http
        ↓
generated
```

pero nunca:

```text
page
  ↓
generated
```

ni:

```text
shared
  ↓
generated
```

ni:

```text
domain
  ↓
generated
```

---

# 8. FASE 3 — CORE DE SESIÓN Y HTTP

Programar primero:

```text
core/session/
core/http/
```

Orden recomendado:

```text
session-state.model.ts
session.constants.ts
token-storage.service.ts
device-id.service.ts
session.store.ts
        ↓
api-error.model.ts
http-context.tokens.ts
correlation-id.service.ts
idempotency-key.service.ts
        ↓
correlation-id.interceptor.ts
device-id.interceptor.ts
api-error.interceptor.ts
```

Esto prepara la base para que autenticación y cualquier feature puedan consumir HTTP sin repetir infraestructura.

El backend contempla metadata como:

```text
Authorization
X-Correlation-Id
X-Device-Id
X-Idempotency-Key
```

Por ello estos conceptos son plataforma y no deben repetirse en cada feature.

---

# 9. FASE 4 — ACCESO DINÁMICO

Después se programa:

```text
core/access/
```

Orden:

```text
models/
        ↓
access.store.ts
        ↓
access.service.ts
permission.service.ts
module-access.service.ts
        ↓
permission.directive.ts
permission.guard.ts
module-access.guard.ts
```

## Regla principal

No existe:

```text
role.guard.ts
admin.guard.ts
tecnico.guard.ts
auditor.guard.ts
```

El frontend no se diseña por rol.

Trabajará con:

```text
usuario
roles informativos
módulos efectivos
permisos efectivos
```

---

# 10. FASE 5 — NAVEGACIÓN

Programar:

```text
core/navigation/
```

El orden es:

```text
navigation-item.model.ts
navigation.service.ts
breadcrumb.service.ts
```

`navigation.service.ts` transforma los módulos recibidos desde el backend en navegación.

Conceptualmente debe utilizar:

```text
moduloId
moduloPadreId
codigo
nombre
orden
ruta
icono
visibleMenu
esGrupo
```

El sidebar **no tendrá una lista codificada por rol**.

---

# 11. FASE 6 — SHARED FUNDAMENTAL

`shared` se programa antes de comenzar a multiplicar pantallas para evitar copiar bloques grandes de código.

Pero no todo debe ir a `shared`.

## Orden recomendado

```text
shared/models
        ↓
shared/forms/form-error
        ↓
shared/feedback/toast-center
        ↓
shared/feedback/action-confirm-dialog
        ↓
shared/data-display/loading-state
        ↓
shared/data-display/empty-state
        ↓
shared/data-display/error-state
        ↓
shared/data-display/paginator
        ↓
shared/data-display/data-table
        ↓
shared/listing
        ↓
shared/layout/breadcrumb
        ↓
shared/layout/page-header
        ↓
shared/layout/sidebar
        ↓
shared/layout/topbar
        ↓
shared/layout/app-shell
```

---

# 12. QUÉ SÍ PERTENECE A SHARED

## `loading-state`

Se reutiliza en prácticamente todas las consultas.

Archivos:

```text
loading-state.ts
loading-state.html
loading-state.css
```

---

## `empty-state`

Evita que cada listado implemente un estado vacío diferente.

---

## `error-state`

Representa errores recuperables de consulta.

No sustituye el manejo global de excepciones.

---

## `paginator`

Se reutiliza porque los módulos de DESCO trabajan con listados paginados.

---

## `data-table`

Es uno de los componentes con mayor valor real de reutilización.

Centralizará la estructura compleja de:

- tabla responsive;
- columnas;
- loading;
- empty;
- orden;
- selección cuando corresponda;
- integración con paginator;
- templates de celdas.

No conocerá:

```text
Productor
Predio
Campaña
Pago
Empleado
```

La lógica de negocio queda en cada feature.

---

## `filter-panel`

Reutiliza la estructura de un panel de filtros.

Los filtros específicos siguen perteneciendo a la feature.

---

## `list-query-state`

Es especialmente importante porque el sistema requiere conservar filtros/paginación cuando el usuario entra a un detalle y regresa.

---

## `action-confirm-dialog`

Se utilizará para:

- confirmar;
- retirar;
- anular;
- cancelar;
- cerrar;
- aprobar;
- otras acciones sensibles.

Puede admitir motivo cuando el permiso/proceso lo requiera.

No crearemos un modal diferente para cada módulo.

---

## `toast-center`

Centraliza feedback de operaciones.

---

## `form-error`

Centraliza el render de errores de Reactive Forms.

---

## `breadcrumb`

Uso transversal en navegación interna.

---

## `page-header`

Centraliza:

- título;
- contexto;
- breadcrumb;
- espacio para acción principal.

La acción concreta se proyecta desde la feature.

---

## `sidebar`

Es compartido porque es una pieza compleja y única para toda la plataforma.

Debe soportar:

- módulos dinámicos;
- grupos;
- hijos;
- orden;
- iconos;
- ruta;
- activo;
- responsive;
- colapsado.

---

## `topbar`

Centraliza:

- usuario;
- Mi cuenta;
- cierre de sesión;
- apertura del sidebar móvil;
- información global de cabecera.

---

## `app-shell`

Compone:

```text
sidebar
+
topbar
+
router outlet
+
layout responsive
```

Todos los usuarios autenticados utilizan el mismo shell.

---

# 13. QUÉ NO DEBEMOS CONVERTIR EN SHARED

No se crearán wrappers solo para decir que existe reutilización.

Evitar:

```text
shared/button
shared/input
shared/select
shared/text-area
shared/card
shared/badge
shared/icon
shared/tab
```

Para estas piezas se usará normalmente:

```text
HTML
+
Tailwind
+
daisyUI
```

y Flowbite cuando exista una interacción que realmente lo justifique.

Tampoco deben ir a `shared`:

```text
productor-form
predio-form
campania-card
liquidacion-detail
sanidad-panel
pago-form
```

porque pertenecen al negocio de una feature.

---

# 14. FASE 7 — AUTENTICACIÓN

Con la plataforma preparada se implementa:

```text
features/acceso/
```

El orden interno de una feature hexagonal será siempre:

```text
domain
        ↓
application/port/out
        ↓
application/use-case
        ↓
adapter/out/http mapper
        ↓
adapter/out/http adapter
        ↓
providers
        ↓
adapter/in/ui state/components/pages
        ↓
routes
```

## Acceso cubrirá

```text
login
validación de correo
solicitud 2FA
verificación 2FA
recuperación de contraseña
restablecimiento
refresh
/me
logout
logout de otras sesiones
cambio obligatorio de contraseña
```

Después de un login exitoso deben quedar inicializados:

```text
SessionStore
AccessStore
```

---

# 15. INTERCEPTORES DE AUTENTICACIÓN

Los interceptores estrictamente relacionados con autenticación permanecen dentro de:

```text
features/acceso/adapter/out/http/interceptors/
```

porque dependen del flujo de acceso.

Tenemos:

```text
access-token.interceptor.ts
session-refresh.interceptor.ts
```

Mientras que los interceptores independientes del login permanecen en:

```text
core/http/interceptors/
```

Esto evita convertir `core` en una carpeta donde todo termina mezclado.

---

# 16. FASE 8 — CERRAR LA PLATAFORMA BASE

Cuando ya existen:

```text
OpenAPI
core/session
core/http
core/access
core/navigation
shared
acceso
```

recién estabilizamos:

```text
app.config.ts
app.routes.ts
app.ts
app.html
app.css
```

En este punto la aplicación debe permitir:

```text
abrir login
        ↓
autenticar
        ↓
resolver verificación/2FA
        ↓
guardar sesión
        ↓
obtener contexto
        ↓
construir navegación
        ↓
entrar al shell
```

---

# 17. FASE 9 — INICIO

Se implementa:

```text
features/inicio/
```

Primero puede funcionar como landing autenticada.

El backend final devuelve:

```text
indicadores
alertas
accesosRapidos
```

No se espera un arreglo `pendientes[]` independiente. Si una alerta representa un pendiente, se resuelve como presentación de la alerta.

No habrá un dashboard diferente por rol.

Los datos visibles dependen del acceso efectivo del usuario.

---

# 18. FASE 10 — MI CUENTA

Después:

```text
features/mi-cuenta/
```

Orden funcional:

```text
perfil       → AccessStore / auth.me
seguridad    → password + cambio de correo
sesiones     → Cuenta
dispositivos → Cuenta
```

Es conveniente implementar este módulo temprano porque permite comprobar:

- cierre de otras sesiones;
- dispositivos reconocidos;
- cambios de seguridad;
- comportamiento de sesión.

---

# 19. FASE 11 — ADMINISTRACIÓN BASE

Orden:

```text
1. catalogos
2. organizaciones
3. roles-permisos
4. empleados
5. usuarios
```

## Dependencias

```text
catalogos
   ↓
organizaciones / áreas
   ↓
empleados
   ↓
usuarios
```

y paralelamente:

```text
roles-permisos
      ↓
usuarios
```

`roles-permisos` administra la configuración de acceso.

Esto **no significa que el frontend esté construido por rol**.

---

# 20. FASE 12 — DOCUMENTOS Y EVIDENCIAS

Antes de entrar de lleno a los procesos de campo se implementará:

```text
features/documentos-evidencias/
```

Es una feature transversal, no un componente `shared`.

Tiene:

```text
dominio propio
permisos propios
API propia
operaciones propias
trazabilidad
```

Por eso conserva su hexágono.

La carga binaria se abstrae mediante:

```text
evidence-storage.gateway.ts
        ↓
cloudinary-evidence-storage.adapter.ts
```

El backend recibe posteriormente los metadatos resultantes (`publicId`, `secureUrl`, MIME, tamaño, etc.).

Puede exponer mediante:

```text
public-api.ts
```

componentes como:

```text
evidence-panel
evidence-uploader
evidence-camera
evidence-preview
```

para que otras features los consuman sin acceder a sus archivos internos.

---

# 21. FASE 13 — RECURSOS

Orden:

```text
inventario-vehiculos
        ↓
programados
```

Esto prepara la infraestructura operativa antes de procesos que asignen vehículos, bienes o recursos.

---

# 22. FASE 14 — GESTIÓN TÉCNICA

Orden recomendado:

```text
1. productores
2. predios
3. parcelas-cultivos
4. censos
5. salidas
6. visitas
7. evaluaciones
8. sanidad
9. produccion
```

## Dependencia conceptual

```text
Productor
   ↓
Predio
   ↓
Parcela / Cultivo
   ├── Censo
   ├── Salida
   ├── Visita
   ├── Evaluación
   ├── Sanidad
   └── Producción
```

No conviene comenzar por Producción disponible si aún no existen productores, predios y cultivos navegables en frontend.

---

# 23. FASE 15 — GESTIÓN COMERCIAL

Orden:

```text
1. campanias
2. condiciones-precios
3. participantes
4. operativos
5. jabas
6. acopio-entregas
7. incidencias
8. ajustes-precio
```

Conceptualmente:

```text
producción disponible
        ↓
campaña
        ↓
condiciones/precios
        ↓
participantes
        ↓
operativo
        ↓
jabas / acopio / entregas
        ↓
incidencias / ajustes
```

---

# 24. FASE 16 — FINANZAS

Orden:

```text
1. gastos
2. liquidaciones
3. pagos-socios
4. cobros-compradores
```

Este bloque se implementa después del comercial porque gran parte de su contexto nace de operaciones ya ejecutadas.

---

# 25. FASE 17 — REPORTES Y CONTROL

Último bloque funcional:

```text
reportes
        ↓
auditoria
```

Se implementa al final porque debe consultar información producida por los demás procesos.

La auditoría no debe convertirse en un rol.

Es un módulo con permisos propios.

---



# 25.1. FASE 18 — CIERRE E2E

Después de terminar Reportes y Auditoría se ejecuta el flujo completo:

```text
Login
 ↓
Contexto acceso
 ↓
Administración
 ↓
Productor
 ↓
Predio
 ↓
Cultivo
 ↓
Salida / Visita
 ↓
Evaluación / Sanidad / Producción
 ↓
Campaña / Precio / Participantes
 ↓
Operativo / Jabas / Entrega
 ↓
Incidencia / Ajuste
 ↓
Gasto / Liquidación / Pago / Cobro
 ↓
Reporte / Auditoría
```

El E2E no crea reglas nuevas en frontend; valida la integración de todas las capas.

---

# 26. REGLA HEXAGONAL DE CADA FEATURE

Cada módulo mantiene la misma dirección:

```text
UI
│
▼
application/use-case
│
▼
application/port/out
▲
│ implementa
adapter/out/http
│
▼
OpenAPI generated
│
▼
Spring Boot
```

## `domain/`

Contiene modelos y conceptos del proceso.

No importa:

```text
Angular
HttpClient
generated
Flowbite
Font Awesome
```

## `application/port/out/`

Define lo que la aplicación necesita del exterior.

El gateway debe ser independiente de OpenAPI.

## `application/use-case/`

Expresa acciones funcionales.

Ejemplos:

```text
listar
obtener
crear
editar
retirar
confirmar
aprobar
cerrar
exportar
```

según el módulo.

## `adapter/out/http/`

Es el único punto de una feature que conoce el cliente OpenAPI generado.

Como regla base:

```text
*-http.mapper.ts
*-http.adapter.ts
```

## `adapter/in/ui/`

Contiene las pantallas y componentes de la feature.

Las páginas no llaman directamente al cliente generado.

## `*.providers.ts`

Une:

```text
port
  ↓
adapter
```

en el sistema de DI de Angular.

## `*.routes.ts`

Define lazy loading y guards de módulo/permisos.

---

# 27. REGLA DE OPENAPI

La regla más importante de integración será:

```text
generated
    =
detalle externo
```

No debe convertirse en nuestro dominio.

Un cambio en Swagger debería impactar principalmente:

```text
adapter/out/http/*-http.mapper.ts
adapter/out/http/*-http.adapter.ts
infrastructure/openapi/
```

y no obligar a cambiar decenas de páginas.

---

# 28. `ApiResponse<T>`

El backend utiliza un envelope HTTP uniforme.

La aplicación no debe arrastrar ese envelope por toda la UI.

Por ello:

```text
generated response
        ↓
api-response-unwrapper
        ↓
adapter mapper
        ↓
modelo interno
```

Una página no debería trabajar con:

```text
ApiResponseProductorResponse
```

sino con un modelo interno como:

```text
Productor
```

---

# 29. PERMISOS MODULARES

El frontend no tendrá carpetas:

```text
admin/
tecnico/
coordinador/
auditor/
```

La navegación se construye con los módulos efectivos del usuario.

Las acciones se muestran con permisos.

Conceptualmente:

```text
AccessStore
├── usuario
├── roles
├── modulos
└── permisos
```

## Sidebar

Usa:

```text
modulos
```

## Botones/acciones

Usan:

```text
permisos
```

## Route guards

Usan:

```text
módulo requerido
o
permiso requerido
```

## Backend

Vuelve a validar siempre.

La UI jamás sustituye la seguridad del backend.

---

# 30. ROLES

El hecho de que `AccessContext` incluya roles no convierte los roles en la regla principal del frontend.

Un rol puede:

```text
crearse
editarse
recibir permisos
perder permisos
```

sin que Angular tenga que crear una nueva estructura.

Por eso:

```text
rol
=
dato de acceso
```

mientras:

```text
permiso
=
capacidad efectiva
```

---

# 31. ESTADO + PERMISO

Tener permiso no siempre significa que la operación sea válida.

La UI debe considerar:

```text
PERMISO
   +
ESTADO DEL REGISTRO
   =
ACCIÓN DISPONIBLE
```

Ejemplo:

```text
usuario tiene ENTREGAS_EDITAR
+
entrega está PRELIMINAR
=
mostrar Editar
```

pero:

```text
usuario tiene ENTREGAS_EDITAR
+
entrega está CERRADA
=
no ofrecer Editar
```

El backend volverá a validar de todos modos.

---

# 32. UNA SOLA INTERFAZ PARA TODOS

La plataforma autenticada será:

```text
AppShell
├── Sidebar dinámico
├── Topbar
└── RouterOutlet
```

No:

```text
AdminLayout
TecnicoLayout
AuditorLayout
LogisticaLayout
FinanzasLayout
```

La diferencia entre usuarios es su contexto efectivo.

---

# 33. COMPONENTES ANGULAR STANDALONE

No tendremos:

```text
AppModule
SharedModule
FeatureModule
```

Las páginas y componentes serán standalone.

Cada componente importará solamente lo que realmente utiliza.

Esto es especialmente importante para:

- lazy loading;
- mantenimiento;
- reducción de acoplamiento;
- claridad de dependencias.

---

# 34. TAILWIND + DAISYUI + FLOWBITE

La prioridad visual será:

```text
Tailwind
   ↓
daisyUI
   ↓
Flowbite solo cuando aporte interacción
   ↓
CSS propio solo cuando sea necesario
```

## Tailwind

Responsable de:

- layout;
- responsive;
- spacing;
- flex/grid;
- utilidades.

## daisyUI

Responsable de patrones simples ya estilizados.

## Flowbite

Responsable de componentes interactivos seleccionados.

## CSS propio

Se utiliza para:

- comportamiento visual muy específico;
- overrides;
- estilos que no sean razonables con utilities;
- identidad DESCO.

No debemos convertir cada componente en cientos de líneas CSS si Tailwind ya resuelve el problema.

---

# 35. FONT AWESOME

No se importará todo el catálogo de iconos indiscriminadamente.

`fontawesome.config.ts` centralizará los iconos globales utilizados por:

```text
sidebar
topbar
acciones globales
estados
```

Las features pueden importar iconos específicos cuando solo ellas los necesiten.

---

# 36. LISTADOS

La mayoría de módulos siguen una estructura parecida:

```text
Page
├── PageHeader
├── FilterPanel
├── DataTable
├── Paginator
├── LoadingState
├── EmptyState
└── ErrorState
```

Esto reutiliza infraestructura visual sin convertir las reglas del negocio en genéricas.

---

# 37. FORMULARIOS

No crearemos un `GenericFormComponent`.

Cada proceso mantiene su propio formulario.

Compartiremos únicamente elementos verdaderamente transversales como:

```text
form-error
action-confirm-dialog
```

Los formularios utilizarán Reactive Forms.

---

# 38. COMPONENTES INTERNOS DE FEATURE

Una pieza permanece dentro de la feature cuando conoce conceptos del negocio.

Ejemplo:

```text
gestion-tecnica/predios/
└── adapter/in/ui/components/
    ├── predio-map/
    └── titularidad-panel/
```

No deben trasladarse a `shared` simplemente porque se usen dos veces dentro del mismo módulo.

---

# 39. CUÁNDO ALGO PUEDE PASAR A SHARED

Una pieza puede convertirse en shared cuando cumple la mayoría de estas condiciones:

1. es utilizada por tres o más áreas;
2. no conoce entidades concretas del negocio;
3. concentra HTML/lógica significativa;
4. reduce duplicación real;
5. su API sigue siendo simple;
6. no necesita decenas de inputs para funcionar.

Si para reutilizarla hay que hacerla excesivamente configurable, probablemente debe permanecer local.

---

# 40. ERRORES

El manejo se divide en dos niveles.

## Global

```text
core/errors/global-error-handler.ts
core/http/interceptors/api-error.interceptor.ts
```

## De pantalla

```text
shared/data-display/error-state/
```

La UI muestra mensajes funcionales.

No debe exponer:

```text
stacktrace
SQL
procedimiento almacenado
clases Java
errores internos
```

---

# 41. ID DE DISPOSITIVO

`device-id.service.ts` conserva un identificador lógico estable del navegador/dispositivo.

No se debe generar uno nuevo en cada request.

El interceptor:

```text
device-id.interceptor.ts
```

lo añade automáticamente.

---

# 42. CORRELACIÓN

`correlation-id.service.ts` y su interceptor permiten relacionar una petición frontend con trazas del backend.

La feature no genera manualmente esta cabecera.

---

# 43. IDEMPOTENCIA

La idempotencia no se resolverá mediante interceptor porque OpenAPI genera `X-Idempotency-Key` como parámetro requerido en las escrituras.

Se utiliza:

```text
idempotency-key.service.ts
        ↓
adapter/out/http
        ↓
cliente OpenAPI generado
        ↓
X-Idempotency-Key
```

Cada operación lógica crea una key y la conserva durante sus reintentos.

Esto complementa, pero no reemplaza, la regla UI de evitar doble envío.


# 44. DOCUMENTOS Y CÁMARA

Las APIs genéricas del navegador permanecen en:

```text
core/browser/
├── geolocation.service.ts
└── camera.service.ts
```

Pero la lógica de evidencia vive en:

```text
features/documentos-evidencias/
```

La cámara es infraestructura del navegador.

Una evidencia es negocio.

---

# 45. DESCARGAS

Las descargas binarias/exportaciones comparten:

```text
core/files/file-download.service.ts
```

Los casos de uso de cada feature deciden qué se exporta.

---

# 46. ORDEN INTERNO AL PROGRAMAR UNA PANTALLA

Para una pantalla de negocio nueva:

```text
1. modelo de dominio
2. gateway
3. casos de uso
4. mapper
5. adapter HTTP
6. providers
7. componente interno si hace falta
8. página TypeScript
9. HTML
10. CSS específico
11. routes
12. permisos
13. estados loading/empty/error
14. build
```

No comenzar por copiar HTML y después intentar descubrir cómo conectar el dominio.

---

# 47. ORDEN DE LOS ARCHIVOS DE UN COMPONENTE

Para cada conjunto:

```text
componente.ts
componente.html
componente.css
```

programar en ese orden.

Primero TypeScript:

- inputs;
- outputs;
- estado;
- dependencias;
- eventos.

Después HTML.

Finalmente CSS específico.

---

# 48. BUILD COMO PUNTO DE CONTROL

Después de completar una pieza importante:

```text
ng build
```

Especialmente después de:

```text
instalar Tailwind
instalar daisyUI
instalar Flowbite
instalar Font Awesome
generar OpenAPI
terminar core
terminar acceso
terminar shared
terminar una feature
```

No acumular veinte módulos rotos para recién compilar al final.

---

# 49. QUÉ SIGNIFICA QUE UNA FEATURE ESTÁ TERMINADA

Una feature funcional no se considera terminada solo porque renderiza una tabla.

Debe tener, cuando corresponda:

```text
domain
gateway
use cases
mapper
adapter
providers
rutas
páginas
componentes locales
permisos
estado de proceso
filtros
paginación
conservación del listado
loading
empty
error
confirmación
motivo
evitar doble envío
feedback
```

y no debe tener imports directos desde `generated/` en su UI.

---

# 50. QUÉ NO DEBE APARECER EN EL PROYECTO

Evitar estructuras como:

```text
src/app/components/
src/app/services/
src/app/models/
src/app/admin/
src/app/tecnico/
src/app/auditor/
src/app/logistica/
```

como contenedores globales.

Tampoco:

```text
page → generated
component → generated
domain → Angular
application → HttpClient
sidebar → rol fijo
button genérico para todo
formulario genérico para todo
```

---

# 51. DIRECCIÓN FINAL DE DEPENDENCIAS

```text
               ┌─────────────────────┐
               │   adapter/in/ui     │
               │ páginas/componentes │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │    application      │
               │      use cases      │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │      port/out       │
               └──────────▲──────────┘
                          │
                   implementado por
                          │
               ┌──────────┴──────────┐
               │   adapter/out/http  │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │ OpenAPI generated   │
               └──────────┬──────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │ Spring Boot DESCO   │
               └─────────────────────┘
```

---

# 52. PRIORIDAD GLOBAL RESUMIDA

La secuencia oficial queda:

```text
01. Proyecto Angular limpio compilando
02. Tailwind
03. daisyUI
04. Flowbite
05. Font Awesome
06. environments
07. OpenAPI Generator
08. generated
09. core/session
10. core/http
11. features/acceso
12. core/access
13. core/navigation
14. core/reference-data + infrastructure/reference-data
15. shared fundamental
16. app.config + app.routes + app shell
17. inicio
18. mi-cuenta
19. administracion/catalogos
20. administracion/organizaciones
21. administracion/roles-permisos
22. administracion/empleados
23. administracion/usuarios
24. documentos-evidencias
25. recursos/inventario-vehiculos
26. recursos/programados
27. gestion-tecnica/productores
28. gestion-tecnica/predios
29. gestion-tecnica/parcelas-cultivos
30. gestion-tecnica/censos
31. gestion-tecnica/salidas
32. gestion-tecnica/visitas
33. gestion-tecnica/evaluaciones
34. gestion-tecnica/sanidad
35. gestion-tecnica/produccion
36. gestion-comercial/campanias
37. gestion-comercial/condiciones-precios
38. gestion-comercial/participantes
39. gestion-comercial/operativos
40. gestion-comercial/jabas
41. gestion-comercial/acopio-entregas
42. gestion-comercial/incidencias
43. gestion-comercial/ajustes-precio
44. finanzas/gastos
45. finanzas/liquidaciones
46. finanzas/pagos-socios
47. finanzas/cobros-compradores
48. reportes-control/reportes
49. reportes-control/auditoria
50. E2E completo
```


# 53. DECISIÓN ARQUITECTÓNICA FINAL

La aplicación se construirá alrededor de cuatro bloques:

```text
src/app/
├── core/
│   └── plataforma transversal + reference data
├── infrastructure/
│   └── OpenAPI + adapters transversales externos
├── shared/
│   └── reutilización visual y técnica de alto valor
└── features/
    └── procesos reales de DESCO
```

Y cada feature de negocio seguirá:

```text
domain
application
adapter/out
adapter/in
providers
routes
```

La plataforma no crecerá creando pantallas por rol.

Crecerá agregando:

```text
nuevos módulos
nuevos permisos
nuevas features
nuevos casos de uso
```

manteniendo una única experiencia autenticada.

---

# 53.1. FUENTE DE VERDAD PARA PROGRAMAR

Antes de implementar cada feature:

```text
1. backend ejecutándose
2. /v3/api-docs actualizado
3. regenerar generated/
4. revisar operationId reales
5. programar mapper/adapter/use cases
```

No se programarán adapters basándose en nombres asumidos.

---

# 54. PRINCIPIO RECTOR

> **No reutilizar por reutilizar. No separar por rol. No acoplar la UI a Swagger. No duplicar infraestructura.**

La arquitectura debe permitir que:

- Swagger se regenere;
- los roles cambien;
- los permisos crezcan;
- aparezcan nuevos módulos;
- los componentes realmente complejos se reutilicen;
- cada proceso mantenga su independencia;
- Angular continúe siendo fácil de mantener.

Esta es la estructura que se utilizará como referencia para comenzar a programar el frontend desde el proyecto Angular 20 limpio.
