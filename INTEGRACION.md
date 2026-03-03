# GUÍA DE INTEGRACIÓN - MERCADO PAGO

## 📋 Pasos para Integrar Mercado Pago

### 1. Crear Cuenta y Obtener Credenciales

1. Ir a https://www.mercadopago.com.ar/developers
2. Crear una cuenta o iniciar sesión
3. Ir a "Tus integraciones" > "Crear aplicación"
4. Seleccionar "Pagos online"
5. Copiar las credenciales:
   - **Public Key** (para el frontend)
   - **Access Token** (para el backend)

### 2. Instalar Dependencias

```bash
npm install @mercadopago/sdk-react
```

### 3. Configurar Variables de Entorno

Crear archivo `.env` en la raíz:

```env
VITE_MP_PUBLIC_KEY=tu_public_key_aqui
VITE_MP_ACCESS_TOKEN=tu_access_token_aqui
```

### 4. Actualizar Carrito.jsx

Reemplazar la función `procesarPago` en `src/pages/Carrito.jsx`:

```javascript
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Inicializar Mercado Pago
initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);

const [preferenceId, setPreferenceId] = useState(null);

const crearPreferencia = async () => {
  try {
    const items = cartItems.map(item => ({
      title: item.servicio.nombre,
      description: `Turno ${item.fecha} a las ${item.hora}`,
      unit_price: item.servicio.precio / 2, // Seña 50%
      quantity: 1,
      currency_id: 'ARS'
    }));

    const preference = {
      items,
      back_urls: {
        success: `${window.location.origin}/pago/success`,
        failure: `${window.location.origin}/pago/failure`,
        pending: `${window.location.origin}/pago/pending`
      },
      auto_return: 'approved',
      notification_url: 'https://tu-backend.com/webhooks/mercadopago'
    };

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      preference,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_MP_ACCESS_TOKEN}`
        }
      }
    );

    setPreferenceId(response.data.id);
  } catch (error) {
    console.error('Error al crear preferencia:', error);
    toast.error('Error al procesar el pago');
  }
};

// En el render del botón de pago:
{preferenceId ? (
  <Wallet initialization={{ preferenceId }} />
) : (
  <button className="btn btn-primary" onClick={crearPreferencia}>
    Proceder al Pago
  </button>
)}
```

### 5. Crear Rutas de Callback

Crear archivos en `src/pages/`:

**PagoSuccess.jsx**
```javascript
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { turnosAPI } from '../services/api';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';

const PagoSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, vaciarCarrito } = useCarrito();
  const { user } = useAuth();

  useEffect(() => {
    procesarPagoExitoso();
  }, []);

  const procesarPagoExitoso = async () => {
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');

    if (status === 'approved') {
      // Crear turnos en la BD
      for (const item of items) {
        await turnosAPI.create({
          usuarioId: user.id,
          servicioId: item.servicio.id,
          fecha: item.fecha,
          hora: item.hora,
          estado: 'confirmado',
          pagoId: paymentId,
          montoPagado: item.servicio.precio / 2,
          montoTotal: item.servicio.precio,
          createdAt: new Date().toISOString(),
        });
      }

      // Enviar email de confirmación
      await enviarEmailConfirmacion(user, items, paymentId);

      vaciarCarrito();
      setTimeout(() => navigate('/mis-turnos'), 3000);
    }
  };

  return (
    <div className="pago-success">
      <h1>¡Pago Exitoso! ✅</h1>
      <p>Tu reserva ha sido confirmada</p>
      <p>Recibirás un email con los detalles</p>
    </div>
  );
};
```

### 6. Configurar Webhooks (Backend)

Para recibir notificaciones de pago en tiempo real, necesitás un backend.

**Ejemplo con Node.js/Express:**

```javascript
const express = require('express');
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

app.post('/webhooks/mercadopago', async (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment') {
    const payment = await mercadopago.payment.get(data.id);
    
    if (payment.status === 'approved') {
      // Actualizar estado del turno en la BD
      // Enviar email de confirmación
    }
  }

  res.sendStatus(200);
});
```

## 📧 INTEGRACIÓN DE EMAILS

### Opción 1: EmailJS (Recomendado para Frontend)

1. **Crear cuenta en EmailJS:**
   - https://www.emailjs.com/
   - Crear un servicio de email (Gmail, Outlook, etc.)
   - Crear una plantilla de email

2. **Instalar:**
```bash
npm install @emailjs/browser
```

3. **Configurar:**

```javascript
import emailjs from '@emailjs/browser';

const enviarEmailConfirmacion = async (usuario, turnos, pagoId) => {
  const templateParams = {
    to_email: usuario.email,
    to_name: usuario.nombre,
    turnos_detalle: turnos.map(t => 
      `${t.servicio.nombre} - ${t.fecha} a las ${t.hora}`
    ).join('\n'),
    pago_id: pagoId,
    total_pagado: turnos.reduce((sum, t) => sum + t.servicio.precio / 2, 0)
  };

  try {
    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );
  } catch (error) {
    console.error('Error al enviar email:', error);
  }
};
```

4. **Plantilla de Email en EmailJS:**

```
Hola {{to_name}},

¡Tu reserva ha sido confirmada! 🎉

Detalles de tu reserva:
{{turnos_detalle}}

ID de Pago: {{pago_id}}
Seña pagada: ${{total_pagado}}

Por favor, asistí puntualmente a tu turno.
El resto del pago se realiza en el local.

¡Gracias por elegirnos!

Nail Studio 💅
```

### Opción 2: Resend (Más Profesional)

```bash
npm install resend
```

```javascript
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

const enviarEmailConfirmacion = async (usuario, turnos, pagoId) => {
  await resend.emails.send({
    from: 'noreply@tunegocio.com',
    to: usuario.email,
    subject: '¡Reserva Confirmada! 💅',
    html: `
      <h1>¡Hola ${usuario.nombre}!</h1>
      <p>Tu reserva ha sido confirmada exitosamente.</p>
      
      <h2>Detalles de tu reserva:</h2>
      <ul>
        ${turnos.map(t => `
          <li>
            <strong>${t.servicio.nombre}</strong><br>
            📅 ${t.fecha} a las ${t.hora}<br>
            💰 $${t.servicio.precio.toLocaleString()}
          </li>
        `).join('')}
      </ul>
      
      <p><strong>ID de Pago:</strong> ${pagoId}</p>
      <p><strong>Seña Pagada:</strong> $${turnos.reduce((sum, t) => sum + t.servicio.precio / 2, 0).toLocaleString()}</p>
      
      <p>Por favor, asistí puntualmente. El resto se abona en el local.</p>
      
      <p>¡Gracias por elegirnos! 💅✨</p>
    `
  });
};
```

## 🚀 DEPLOYMENT

### Deploy en Vercel (Frontend)

1. **Preparar el proyecto:**
```bash
npm run build
```

2. **Instalar Vercel CLI:**
```bash
npm install -g vercel
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Configurar variables de entorno en Vercel:**
   - Ir a Project Settings > Environment Variables
   - Agregar:
     - `VITE_MP_PUBLIC_KEY`
     - `VITE_MP_ACCESS_TOKEN`
     - `VITE_EMAILJS_SERVICE_ID`
     - etc.

### Backend para Producción

**Opciones:**

1. **Railway.app** (Fácil y gratis)
   - Crear cuenta en railway.app
   - Deploy desde GitHub
   - Agregar PostgreSQL database
   - Configurar variables de entorno

2. **Render.com** (Alternativa)
   - Similar a Railway
   - Plan gratuito disponible

3. **Supabase** (Todo en uno)
   - Base de datos PostgreSQL
   - Auth incluido
   - Storage para imágenes
   - Edge Functions para lógica de servidor

## 📊 Migrar de db.json a Base de Datos Real

### Con Supabase:

1. **Crear proyecto en supabase.com**

2. **Instalar cliente:**
```bash
npm install @supabase/supabase-js
```

3. **Configurar:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Ejemplo: Obtener servicios
const { data, error } = await supabase
  .from('servicios')
  .select('*');

// Crear turno
const { data, error } = await supabase
  .from('turnos')
  .insert([{
    usuario_id: user.id,
    servicio_id: servicio.id,
    fecha: fecha,
    hora: hora
  }]);
```

## ✅ Checklist de Producción

- [ ] Integrar Mercado Pago real
- [ ] Configurar emails automáticos
- [ ] Migrar a base de datos real
- [ ] Implementar autenticación con JWT
- [ ] Hashear contraseñas (bcrypt)
- [ ] Configurar HTTPS
- [ ] Implementar rate limiting
- [ ] Agregar logs de errores (Sentry)
- [ ] Optimizar imágenes
- [ ] Configurar CDN
- [ ] Testing end-to-end
- [ ] Backup automático de BD
- [ ] Monitoreo de uptime

---

**¡Todo listo para producción! 🚀**
