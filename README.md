# ENE — Sistema de Gestión de Operaciones

Extremo Norte Expediciones · desarrollado por VIAIN Asesorías Informáticas.

El contrato del proyecto —contexto, stack, estructura, modelo de datos, reglas
de negocio y convenciones— vive en **[CLAUDE.md](./CLAUDE.md)**. Es la primera
lectura obligatoria.

## Arranque

```bash
cp ene-api/.env.example ene-api/.env
make up          # postgres, pgAdmin y API
make migrate     # primera migración Prisma
make seed        # perfiles, zonas, tipos de servicio y prefijos
```

| Servicio | URL |
|---|---|
| API | http://localhost:3011 |
| Swagger | http://localhost:3011/docs |
| Health | http://localhost:3011/api/health |
| pgAdmin | http://localhost:5051 |
| PostgreSQL | localhost:5434 |

Los puertos están desplazados respecto de FAS para poder correr ambos
proyectos al mismo tiempo.

`make help` lista todos los comandos.

## Estado

Fase 1 · etapa 1 en curso. El frontend todavía no está scaffoldeado
(ver [ene-web/README.md](./ene-web/README.md)).

## Documentos

- `Docs/propuesta-funcional-v3.html` — propuesta funcional
- `Docs/carta-gantt-fase1.html` — plan de trabajo con fechas
# ENE
