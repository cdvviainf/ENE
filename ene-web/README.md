# ene-web

Frontend del Sistema de Gestión de Operaciones de Extremo Norte Expediciones.

Fork de `next-shadcn-dashboard-starter` vía `fas-web` (CLAUDE.md §3/§10), con
las reglas de adaptación obligatorias ya aplicadas:

- Sin Clerk. Auth con Better Auth contra `ene-api`.
- Sin Server Actions ni fetch de Next para datos de negocio: TanStack Query + ky.
- Sidebar con permisos reales (`GET /api/config/me/menu`, RN-PER-01): un ítem
  sin nivel `LECTURA`/`TOTAL` para el perfil de sesión no aparece en el menú
  y su ruta queda bloqueada (`RouteAccessGuard`).
- Sin módulos de ejemplo del template (kanban, e-commerce, forms demo).
- Sin Sentry (fuera del stack de CLAUDE.md §3).

## Estado (Etapa 3)

Este tramo cubre **shell + login + navegación por permisos**. Las 8 secciones
del menú (Cotizaciones, Órdenes de Trabajo, Órdenes de Compra, Facturación,
Cobros, Dashboard, Mantenedores, Usuarios y perfiles) están enrutadas con una
pantalla "Próximamente" — cada una se construye en su etapa (ver CLAUDE.md §12).
El backend de usuarios/perfiles ya existe; su pantalla CRUD queda para un
tramo posterior.

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
npm run dev   # puerto 3010
```

Requiere `ene-api` corriendo en `http://localhost:3011` (`make up` desde la
raíz del monorepo levanta postgres + pgAdmin + api).

## Estructura de rutas

Sigue el route group `(app)`/`(auth)` de CLAUDE.md §4: los segmentos de negocio
no llevan prefijo (`/cotizaciones`, no `/dashboard/cotizaciones`). Las rutas
deben calzar con `ItemMenu.ruta` (`ene-api/prisma/seed.ts`) para que el filtro
de permisos las reconozca.
