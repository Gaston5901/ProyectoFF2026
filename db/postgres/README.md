# PostgreSQL (schema)

Este directorio contiene el esquema relacional propuesto para el proyecto.

## Requisitos
- Docker Desktop (recomendado) o un PostgreSQL local.

## Levantar PostgreSQL con Docker Compose
Desde la raíz del repo:

1) Levantar el contenedor:
- `docker compose up -d postgres`

2) Ver estado:
- `docker compose ps`

Los valores por defecto están en `docker-compose.yml`:
- DB: `proyecto_final2026`
- User: `postgres`
- Pass: `postgres`
- Port: `5432`

## Crear tablas (aplicar schema.sql)
Opción A (con psql instalado):
- `psql "postgres://postgres:postgres@localhost:5432/proyecto_final2026" -f db/postgres/schema.sql`

Opción B (desde el contenedor, sin instalar psql):
- `docker exec -i proyecto-final2026-postgres psql -U postgres -d proyecto_final2026 < db/postgres/schema.sql`

## Qué incluye
- `usuarios`, `servicios`, `turnos`, `pagos`, `pagos_turnos`
- `configuracion` (incluye `horarios_por_dia` como JSONB)
- `carrusel`
- `productos`

## Nota de migración
Las tablas incluyen una columna `mongo_id` (TEXT UNIQUE) para poder guardar el ObjectId original durante la migración desde MongoDB.
