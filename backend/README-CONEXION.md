# Configuración de conexión a bases de datos

La conexión a la base de datos está lista para funcionar tanto con PostgreSQL como con MongoDB.

El proveedor activo se define con `DB_PROVIDER`:

- `postgres`, `pg` o `postgresql` → usa PostgreSQL con `DATABASE_URL`.
- cualquier otro valor (o vacío) → usa MongoDB con `MONGODB_URI`.

## 1. PostgreSQL

Si vas a usar PostgreSQL, configurá la cadena correspondiente en `.env`:

```
DATABASE_URL=postgresql://<usuario>:<password>@<host>:5432/<dbname>
```

## 2. MongoDB Local (Compass)

Si vas a usar MongoDB local, por defecto el archivo `.env` ya tiene la URI:

```
MONGODB_URI=mongodb://127.0.0.1:27017/panaderia
```

## 3. MongoDB Atlas

Cuando quieras usar Atlas, reemplazá la variable en `.env` por la cadena que te da Atlas:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

## 4. Cambiar de entorno

No necesitás cambiar nada en el código, solo la variable en `.env`.

---

Ahora avanzaré con la funcionalidad de recuperación de contraseña usando nodemailer.