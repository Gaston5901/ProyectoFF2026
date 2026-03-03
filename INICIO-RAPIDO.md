# 🚀 GUÍA RÁPIDA - Delfina Nails Studio

## ⚡ Instalación

### Opción 1 (Scripts Windows)
1. Doble clic `install.bat` (instala frontend + backend)
2. Doble clic `start.bat` (abre 3 terminales: frontend + API + backend email)

### Opción 2 (Manual)
```powershell
npm install
cd server
npm install
cd ..
```

## ▶️ Ejecución

**3 Terminales necesarias:**

1. Backend Email (puerto 4000):
```powershell
cd server
npm run dev
```

2. JSON Server API (puerto 3001):
```powershell
npm run server
```

3. Frontend React (puerto 5173):
```powershell
npm run dev
```

Acceder a: **http://localhost:5173**

## 👤 Acceso Admin
- Email: admin@turnos.com
- Contraseña: admin123

## 👥 Usuario Cliente Prueba
- Email: gastonituarte100@gmail.com
- Contraseña: 123456

## 🗺 Flujo Cliente
1. Registro → `/register` (toggle ver contraseña)
2. Ver servicios → `/servicios`
3. Reservar → `/reservar` (servicio, fecha con horarios dinámicos, ver ocupados, buscar próximo disponible)
4. Carrito → `/carrito` (pagar seña 50%, recibe email comprobante automático)
5. Ver turnos → `/mis-turnos`
6. Recuperar contraseña → `/recuperar` (código por email)

## 🛎 Horarios del Estudio
- Lunes/Miércoles/Viernes: 08:00 - 17:30 (4 horarios)
- Martes/Jueves/Sábado: 08:00 - 20:00 (5 horarios)
- Domingo: Cerrado

Horarios por día configurables en `db.json` → `horariosPorDia`

## 📍 Datos
Teléfono: 3816472708
Instagram: @nailsstudio_delfina
Dirección: Barrio San Martín mza A casa 5

## 🛠 Comandos
```powershell
# Frontend
npm run dev

# JSON Server API
npm run server

# Backend Email
cd server
npm run dev

# Producción
npm run build
npm run preview
```

## 🔑 Rutas
**Cliente:**
`/` Inicio | `/servicios` | `/reservar` | `/carrito` | `/mis-turnos` | `/recuperar`

**Admin:**
`/admin/panel` Dashboard | `/admin/panel-trabajo` Hoy/Mañana/Expirados | `/admin/turnos` Gestión | `/admin/historial` Completo | `/admin/estadisticas` Gráficos | `/admin/servicios-admin` CRUD Servicios | `/admin/usuarios` Listado

## 🔒 Seguridad (Dev)
Contraseñas sin hash y auth mock. Para producción: bcrypt + JWT + validaciones + HTTPS.

## ❓ Problemas Comunes
- Puertos en uso: liberar 5173 / 3001 / 4000
- API no responde: verificar `npm run server` en puerto 3001
- Email no envía: revisar `server/.env` credenciales SMTP
- Error módulos: reinstalar `npm install` en raíz y en `server/`
- Import Zustand fallido: ejecutar `npm install zustand`

## 🎨 Personalización Rápida
- Logo: colocar archivo en `public/logo.png`
- Colores: editar `src/index.css` (CSS variables)
- Servicios: editar `db.json` → `servicios`
- Horarios por día: editar `db.json` → `horariosPorDia`
- Email templates: `server/emailTemplates/`

## 📧 Configuración Email
Editar `server/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_aplicacion_google
EMAIL_FROM="Delfina Nails Studio <no-reply@tudominio.com>"
```

Para Gmail: generar "Contraseña de aplicación" en configuración de seguridad.

## ✅ Checklist Producción
- Hash de contraseñas (bcrypt)
- JWT auth tokens
- Mercado Pago SDK real con credenciales productivas
- Emails con servicio SMTP profesional (SendGrid, Mailgun)
- DB persistente (Firebase / Supabase / PostgreSQL)
- Variables de entorno seguras
- HTTPS
- Rate limiting
- Validaciones backend

---

**BY: TRINY ZELARAYAN SANNA**

Listo. Reservá tus turnos y llevá el control. 💅✨
