# DESCO — shared visual

Estos componentes son standalone y utilizan los tokens y estilos existentes.
No contienen llamadas HTTP, permisos, reglas de negocio ni estado compartido de dominio.
Los formularios y las pantallas conservan sus validaciones, adaptadores y eventos.

| Componente | Selector | Configuración principal |
| --- | --- | --- |
| Encabezado | `app-page-header` | `title`, `subtitle`, `eyebrow`, `icon`, `showBack`, `(back)` |
| Filtros | `app-filter-panel` | `showActions`, `showApply`, `showClear`, `(apply)`, `(clear)` |
| Barra de listado | `app-list-toolbar` | `search`, `view`, `showRefresh`, `(searchChange)`, `(viewChange)`, `(refresh)` |
| Contenedor de listado | `app-list-container` | `columns`, `rows`, `cellTemplates`, `cardTemplate`, paginación y eventos |
| Tabla | `app-data-table` | Contrato previo intacto; opcional `density`, `caption` |
| Tarjeta | `app-record-card` | Contenido proyectado, opcional `density` |
| Estado | `app-status-badge` | `label`, `tone`, `dot` |
| Vista | `app-list-view-switch` | `view`, `(viewChange)` |
| Paginación | `app-paginator` | `page`, `size`, `totalRecords`, `totalPages`, eventos |
| Botón | `app-button` | `tone`, `size`, `icon`, `iconOnly`, `loading`, `(pressed)` |
| Campo | `app-form-field` | `label`, `forId`, `required`, `error`, `hint` y control proyectado |
| Modal | `app-modal-shell` | `title`, `size`, `busy`, `open()`, `close()`, `(closed)`, `[modalActions]` |
| Confirmación | `app-action-confirm-dialog` | `show(config)` (sin cambios) |
| Panel | `app-section-panel` | `title`, `description`, `icon`, `padded`, `[panelActions]` |
| Pestañas | `app-tabs` | `tabs`, `active`, `(activeChange)` |
| Ficha | `app-detail-card`, `app-detail-grid`, `app-detail-field` | `title`, `columns`, `label`, `value` |

Para usar `app-list-container` con tarjetas, pasar `cardTemplate` como referencia de
`<ng-template let-item>...</ng-template>`; cuando no hay plantilla usa tabla.
Proveer `trackByKey` con un identificador estable. Si la paginación se realiza en
servidor, pasar las filas de la página actual; el componente no pagina ni filtra datos.

En `app-modal-shell`, `<div modalActions>...</div>` proyecta botones. El llamador
controla `busy` y el guardado; el componente bloquea cierre si está ocupado.

La integración de pantallas actuales se realizará por etapas y solo tras probar cada
flujo. Esta fase deja los componentes disponibles sin cambiar pantallas ni backend.
