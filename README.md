https://agora.red/nyanails?fbclid=PAb21jcAORVAtleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAad6z3_c8kqwh6DY1zuqkvvQHDAsKhnFyDkuQ4GJW6b2OZPv9KPXT0EL6Oq3MQ_aem_XmGu6vHjIfC4tAXL3Bi_sA

# 💅 Delfina Nails Studio - Sistema de Turnos

Aplicación web para la gestión profesional de turnos de Delfina Nails Studio. Reservas online con seña del 50%, administración centralizada y estadísticas.

## 🌟 Características

### Clientes
- Registro e inicio de sesión (con toggle ver contraseña)
- Recuperación de contraseña por email con código
- Catálogo de servicios reales con precios y duración
- Reserva paso a paso (servicio → fecha → horario)
- Horarios dinámicos por día (diferentes franjas lunes-sábado)
- Indicación de horarios ocupados y búsqueda de próximo disponible
- Carrito con Zustand (manejo de estado global)
- Pago de la seña (50%) con integración preparada Mercado Pago
- Email comprobante de seña automático (Nodemailer)
- Historial de turnos
- Diseño responsive (mobile-first)

### Administración
- Dashboard con estadísticas en tiempo real
- **Panel de Trabajo:** turnos de hoy, mañana y expirados con acción de confirmación
- Gestión de turnos (filtrar, confirmar, completar, cancelar)
- **Historial completo:** todos los turnos registrados con búsqueda avanzada
- **Gestión de Servicios:** CRUD completo (crear, editar, eliminar servicios con precio/duración)
- **Gestión de Usuarios:** listado de clientes y administradores
- Creación de turnos presenciales
- Ranking de servicios más solicitados
- Cálculo de señas y ganancias
- Navegación contextual según rol (admin vs cliente)

## 🚀 Tecnologías
**Frontend:** React 18 + Vite · React Router DOM · Zustand · Axios · date-fns · React Toastify · Lucide Icons · CSS variables
**Backend:** Express · Nodemailer · CORS · dotenv
**Persistencia:** JSON Server (desarrollo)

## 📋 Prerequisitos
Node.js 16+ y npm

## 🔧 Instalación Rápida
```bash
npm install
cd server
npm install
cd ..
```

## ▶️ Ejecución

**Terminal 1 - Backend Nodemailer (puerto 4000):**
```powershell
cd server
npm run dev
```

**Terminal 2 - JSON Server API (puerto 3001):**
```powershell
npm run server
```

**Terminal 3 - Frontend React (puerto 5173):**
```powershell
npm run dev
```

Luego visitar: http://localhost:5173

## 👤 Usuario Admin
Email: admin@turnos.com  |  Contraseña: admin123

## 📍 Datos del Estudio
- Nombre: Delfina Nails Studio
- Teléfono: 3816472708
- Instagram: @nailsstudio_delfina
- Dirección: Barrio San Martín mza A casa 5
- Horarios:
  - Lunes / Miércoles / Viernes: 08:00 - 17:30
  - Martes / Jueves / Sábado: 08:00 - 20:00
  - Domingo: Cerrado

## 🗂 Estructura
```
src/
  components/ (Layout: Navbar, Footer | Auth: ProtectedRoute)
  context/ (AuthContext, CarritoContext - migrado a Zustand)
  store/ (useCarritoStore.js - Zustand)
  pages/ 
    Home, Servicios, ReservarTurno, Carrito, MisTurnos
    Login, Register, RecuperarPassword
    Admin/ (Dashboard, Turnos, PanelTrabajo, Historial, Estadisticas, ServiciosAdmin, UsuariosAdmin)
  services/ (api.js)
  App.jsx / main.jsx / index.css
server/
  index.js (Express + Nodemailer)
  emailTemplates/ (comprobanteTurno.js, recuperarPassword.js)
  package.json
  .env
db.json (JSON Server)
```

## 🎨 Servicios Actuales
1. Esmaltado Semipermanente – $8.000 (60 min)
2. Refuerzo / Capping – $10.000 (75 min)
3. Soft Gel Manos – $9.000 (80 min)
4. Diseños a Mano Alzada – $5.000 (45 min, precio base)
5. Esmaltado Semipermanente en Pies – $8.000 (60 min)
6. Soft Gel en Pies – $9.500 (70 min)

Seña (50%) calculada automáticamente. El resto se abona en el estudio.

## 💳 Pagos
Integración preparada para Mercado Pago (SDK pendiente configuración en frontend). Actualmente se simula el pago y se registra el turno con seña del 50%.

## 📧 Emails
Backend Nodemailer configurado:
- **Comprobante de seña:** enviado automáticamente al pagar con detalles de servicios, fechas, horarios e ID de pago.
- **Recuperación de contraseña:** código de 6 dígitos válido por 30 minutos.

**Configuración SMTP:** editar `server/.env` con tus credenciales de Gmail u otro servicio (ver `.env.example`).

## 🔐 Seguridad (Desarrollo)
Contraseñas en texto plano y auth mock. Para producción: bcrypt + JWT + validaciones + HTTPS.

## 🛠 Variables `.env` Ejemplo

**Frontend (raíz proyecto) - `.env`:**
```env
VITE_MP_PUBLIC_KEY=TU_PUBLIC_KEY
VITE_MP_ACCESS_TOKEN=TU_ACCESS_TOKEN
VITE_API_URL=http://localhost:3001
```

**Backend (`server/.env`):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_app
EMAIL_FROM="Delfina Nails Studio <no-reply@delfinanails.com>"
FRONTEND_URL=http://localhost:5173
PORT=4000
```

## 🚀 Deploy Sugerido
Build: `npm run build` → subir a Vercel / Netlify. Backend real recomendado (Firebase / Supabase) para reemplazar JSON Server.

## 🎯 Próximas Mejoras
- Integración real Mercado Pago (SDK + credenciales productivas)
- Recordatorios automáticos vía email/WhatsApp
- Reseñas y galería de trabajos
- Notificaciones push
- Modo oscuro
- PWA (Progressive Web App)
- Exportar estadísticas a CSV/PDF
- Calendario visual completo en admin

## 🐛 Troubleshooting
- **"Cannot find module"**: borrar `node_modules` y reinstalar.
- **API no responde**: verificar `npm run server` y puerto 3001.
- **Email no se envía**: revisar credenciales SMTP en `server/.env` y verificar que el backend esté corriendo en puerto 4000.
- **Error import Zustand**: ejecutar `npm install zustand` en la raíz del proyecto.

## ❤️ Nota
Proyecto desarrollado para **Delfina Nails Studio** con arquitectura escalable y mejores prácticas.

**BY: TRINY ZELARAYAN SANNA**

---
Hecho con dedicación para potenciar tu negocio. 💅✨
