# ene-web

Frontend del Sistema de Gestión de Operaciones de Extremo Norte Expediciones.

## Todavía no está scaffoldeado

Según CLAUDE.md §3, la base es un fork de `next-shadcn-dashboard-starter`
(el mismo que usa FAS, disponible en `~/sites/FAS/template-starter`).

### Pasos

1. Copiar el template:
   ```bash
   cp -R ~/sites/FAS/template-starter/. ./
   rm -rf .git
   ```
2. Aplicar las **reglas de adaptación obligatorias** de CLAUDE.md §3:
   - Arrancar Clerk por completo y reemplazar por Better Auth contra `ene-api`.
     **No conservar `@clerk/nextjs`** — en `fas-web` quedó como residuo.
   - No usar Server Actions ni el fetch de Next para datos de negocio:
     TanStack Query + ky contra `ene-api`.
   - Reemplazar el sidebar de ejemplo por la estructura real de ítems de menú
     y perfiles, respetando niveles LECTURA / TOTAL.
   - Eliminar módulos del template no usados (kanban, e-commerce).
   - Remarcar el theming a identidad Extremo Norte.
3. Fijar el puerto en 3010 (`next dev -p 3010`) para no chocar con FAS.
4. Descomentar el servicio `web` en `docker-compose.yml`.

Hasta entonces `make up` levanta postgres, pgAdmin y la API, que es lo que
necesita la etapa 1.
