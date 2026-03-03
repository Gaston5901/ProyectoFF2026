# Configuración de conexión a MongoDB

La conexión a la base de datos está lista para funcionar tanto con MongoDB Compass (local) como con MongoDB Atlas (nube).

## 1. MongoDB Local (Compass)

Por defecto, el archivo `.env` ya tiene la URI para una base local:

```
MONGODB_URI=mongodb://127.0.0.1:27017/panaderia
```

## 2. MongoDB Atlas

Cuando quieras usar Atlas, reemplaza la variable en `.env` por la cadena que te da Atlas, por ejemplo:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

## 3. Cambiar de entorno

No necesitas cambiar nada en el código, solo la variable en `.env`.

---

Ahora avanzaré con la funcionalidad de recuperación de contraseña usando nodemailer.