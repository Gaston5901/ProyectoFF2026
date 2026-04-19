-- PostgreSQL schema for "proyecto final2026"
-- Objetivo: reflejar el dominio actual (Mongo/Mongoose) en un modelo relacional.
-- Nota: se incluyen columnas `mongo_id` (TEXT UNIQUE) para facilitar migración desde ObjectId.

BEGIN;

-- =====================
-- Enums
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('cliente', 'usuario', 'admin', 'superadmin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'pendiente',
      'en_proceso',
      'confirmado',
      'cancelado',
      'devuelto',
      'realizado',
      'completado',
      'rechazado'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
    CREATE TYPE transfer_status AS ENUM ('pendiente', 'aprobado', 'rechazado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE payment_provider AS ENUM ('mp', 'transfer', 'manual');
  END IF;
END $$;

-- =====================
-- Usuarios
-- =====================
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,

  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  telefono TEXT NOT NULL DEFAULT '',

  password_hash TEXT NOT NULL,
  rol user_role NOT NULL DEFAULT 'cliente',

  suspendido BOOLEAN NOT NULL DEFAULT FALSE,
  oculto BOOLEAN NOT NULL DEFAULT FALSE,

  password_reset_token_hash TEXT NULL,
  password_reset_expires TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT usuarios_email_lower_chk CHECK (email = lower(email)),
  CONSTRAINT usuarios_username_lower_chk CHECK (username = lower(username))
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (email);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_uq ON usuarios (username);
CREATE INDEX IF NOT EXISTS usuarios_suspendido_idx ON usuarios (suspendido);
CREATE INDEX IF NOT EXISTS usuarios_oculto_idx ON usuarios (oculto);
CREATE INDEX IF NOT EXISTS usuarios_password_reset_token_hash_idx ON usuarios (password_reset_token_hash);
CREATE INDEX IF NOT EXISTS usuarios_password_reset_expires_idx ON usuarios (password_reset_expires);

-- =====================
-- Servicios
-- =====================
CREATE TABLE IF NOT EXISTS servicios (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,

  nombre TEXT NOT NULL,
  descripcion TEXT NULL,
  precio NUMERIC(12,2) NOT NULL,
  duracion_min INTEGER NOT NULL,
  imagen_url TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT servicios_precio_nonneg_chk CHECK (precio >= 0),
  CONSTRAINT servicios_duracion_positive_chk CHECK (duracion_min > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS servicios_nombre_uq ON servicios (nombre);

-- =====================
-- Productos
-- =====================
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,

  nombre TEXT NOT NULL,
  precio NUMERIC(12,2) NOT NULL,
  descripcion TEXT NOT NULL,
  imagen_url TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT productos_precio_nonneg_chk CHECK (precio >= 0)
);

CREATE INDEX IF NOT EXISTS productos_nombre_idx ON productos (nombre);

-- =====================
-- Configuracion (configuracion)
-- 1 fila esperada
-- horarios_por_dia: JSONB que replica la estructura actual:
--   {
--     "1": ["08:00", ...],
--     "2026-04-17": ["10:00", ...]
--   }
-- =====================
CREATE TABLE IF NOT EXISTS configuracion (
  id SMALLINT PRIMARY KEY DEFAULT 1,

  hora_inicio TEXT NOT NULL DEFAULT '08:00',
  hora_fin TEXT NOT NULL DEFAULT '20:00',
  dias_laborales INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],
  porcentaje_senia NUMERIC(5,2) NOT NULL DEFAULT 50,
  email_notificaciones TEXT NOT NULL DEFAULT '',
  horarios_por_dia JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT configuracion_single_row_chk CHECK (id = 1),
  CONSTRAINT configuracion_porcentaje_senia_chk CHECK (porcentaje_senia >= 0 AND porcentaje_senia <= 100)
);

INSERT INTO configuracion (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- Carrusel (carrusel)
-- 1 fila esperada con hasta 4 imágenes
-- =====================
CREATE TABLE IF NOT EXISTS carrusel (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  imagenes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT carrusel_single_row_chk CHECK (id = 1),
  CONSTRAINT carrusel_max_4_chk CHECK (coalesce(array_length(imagenes, 1), 0) <= 4)
);

INSERT INTO carrusel (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- Pagos
-- =====================
CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,

  provider payment_provider NOT NULL,

  -- Mercado Pago payment id (pago.id) es numérico pero puede venir como string: lo guardamos TEXT.
  mp_payment_id TEXT NULL,

  -- "pagoIdGlobal" del frontend (p.ej. MP + timestamp) para rastrear intentos.
  client_ref TEXT NULL,

  status TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',

  paid_at TIMESTAMPTZ NULL,

  -- Para debugging/auditoría del webhook/MP
  raw JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pagos_amount_nonneg_chk CHECK (amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS pagos_mp_payment_id_uq ON pagos (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS pagos_client_ref_idx ON pagos (client_ref);
CREATE INDEX IF NOT EXISTS pagos_provider_idx ON pagos (provider);
CREATE INDEX IF NOT EXISTS pagos_status_idx ON pagos (status);
CREATE INDEX IF NOT EXISTS pagos_paid_at_idx ON pagos (paid_at);

-- =====================
-- Turnos
-- =====================
CREATE TABLE IF NOT EXISTS turnos (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,

  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  servicio_id BIGINT NOT NULL REFERENCES servicios(id) ON UPDATE CASCADE ON DELETE RESTRICT,

  fecha DATE NOT NULL,
  hora TIME NOT NULL,

  estado appointment_status NOT NULL DEFAULT 'pendiente',

  -- Campos duplicados (snapshot) para compatibilidad con UI/admin y para histórico si cambia el usuario
  email TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',

  comentario TEXT NOT NULL DEFAULT '',
  registro_estadistica TEXT NOT NULL DEFAULT '',

  monto_pagado NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_total NUMERIC(12,2) NOT NULL DEFAULT 0,

  email_enviado BOOLEAN NOT NULL DEFAULT FALSE,
  senia_devuelta BOOLEAN NOT NULL DEFAULT FALSE,

  -- Transferencia bancaria
  comprobante_path TEXT NOT NULL DEFAULT '',
  estado_transferencia transfer_status NULL,
  motivo_rechazo_transferencia TEXT NOT NULL DEFAULT '',
  titular_transferencia TEXT NOT NULL DEFAULT '',
  metodo_transferencia TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT turnos_monto_pagado_nonneg_chk CHECK (monto_pagado >= 0),
  CONSTRAINT turnos_monto_total_nonneg_chk CHECK (monto_total >= 0)
);

CREATE INDEX IF NOT EXISTS turnos_usuario_id_idx ON turnos (usuario_id);
CREATE INDEX IF NOT EXISTS turnos_servicio_id_idx ON turnos (servicio_id);
CREATE INDEX IF NOT EXISTS turnos_fecha_idx ON turnos (fecha);
CREATE INDEX IF NOT EXISTS turnos_estado_idx ON turnos (estado);
CREATE INDEX IF NOT EXISTS turnos_fecha_hora_idx ON turnos (fecha, hora);
CREATE INDEX IF NOT EXISTS turnos_estado_transferencia_idx ON turnos (estado_transferencia);

-- Evitar doble-reserva por fecha+hora cuando el turno bloquea horario.
-- Regla equivalente a la app actual:
-- bloquean: pendiente, confirmado, en_proceso
-- excepción: si transferencia fue rechazada, deja de bloquear.
CREATE UNIQUE INDEX IF NOT EXISTS turnos_unique_slot_active_uq
ON turnos (fecha, hora)
WHERE estado IN ('pendiente', 'confirmado', 'en_proceso')
  AND (estado_transferencia IS NULL OR estado_transferencia <> 'rechazado'::transfer_status);

-- =====================
-- Relación pagos <-> turnos (un pago puede confirmar varios turnos)
-- =====================
CREATE TABLE IF NOT EXISTS pagos_turnos (
  pago_id BIGINT NOT NULL REFERENCES pagos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  turno_id BIGINT NOT NULL REFERENCES turnos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pago_id, turno_id)
);

CREATE INDEX IF NOT EXISTS pagos_turnos_turno_id_idx ON pagos_turnos (turno_id);

COMMIT;
