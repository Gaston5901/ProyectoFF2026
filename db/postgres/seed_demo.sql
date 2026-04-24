-- Seed DEMO para Postgres (proyecto final2026)
-- Inserta ~40 usuarios cliente y ~45 turnos con variedad de estados y medios.
-- Incluye turnos del mes pasado y del mes actual.
--
-- Cómo ejecutar (psql):
--   psql "$DATABASE_URL" -f db/postgres/seed_demo.sql
-- o desde pgAdmin/DBeaver: pegar y ejecutar.

BEGIN;

WITH
params AS (
  SELECT
    40::int  AS users_to_add,
    45::int  AS turnos_to_add,
    -- bcryptjs hash('123456', 10)
    '$2b$10$tY5Zsmn3ikRouPnq4r4nrOOqq5Yy4yaPZKyMVIADqVsfiqXZd5mfi'::text AS password_hash
),
seed_servicios AS (
  INSERT INTO servicios (nombre, descripcion, precio, duracion_min, imagen_url, activo)
  VALUES
    ('Esmaltado Semipermanente', 'Demo seed', 8000, 60, '', true),
    ('Refuerzo / Capping', 'Demo seed', 15000, 150, '', true),
    ('Soft Gel Manos', 'Demo seed', 9000, 80, '', true),
    ('Diseños a Mano Alzada', 'Demo seed', 5000, 45, '', true),
    ('Esmaltado Semipermanente en Pies', 'Demo seed', 8000, 60, '', true),
    ('Soft Gel en Pies', 'Demo seed', 9500, 70, '', true)
  ON CONFLICT (nombre) DO NOTHING
  RETURNING id
),
seed_users_desired AS (
  SELECT
    gs AS n,
    lower(format('cliente%02s@demo.com', gs)) AS email,
    lower(format('cliente%02s@demo.com', gs)) AS username,
    format('Cliente %s', lpad(gs::text, 2, '0')) AS nombre,
    format('381%s', lpad(((1000000 + (random() * 8999999)::int))::text, 7, '0')) AS telefono
  FROM generate_series(1, (SELECT users_to_add FROM params)) gs
),
seed_users AS (
  INSERT INTO usuarios (nombre, email, username, telefono, password_hash, rol)
  SELECT
    d.nombre,
    d.email,
    d.username,
    d.telefono,
    (SELECT password_hash FROM params),
    'cliente'::user_role
  FROM seed_users_desired d
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
),
clientes AS (
  SELECT u.id, u.email, u.username, u.nombre, u.telefono
  FROM usuarios u
  WHERE u.email IN (SELECT email FROM seed_users_desired)
),
servs AS (
  SELECT id, nombre, precio
  FROM servicios
  WHERE activo = true
),
-- Generar slots únicos (fecha+hora), evitando domingos.
-- Rango: desde el 1er día del mes pasado hasta +10 días.
slot_candidates AS (
  SELECT
    d::date AS fecha,
    h::time AS hora
  FROM generate_series(
    date_trunc('month', (current_date - interval '1 month'))::date,
    (current_date + interval '10 days')::date,
    interval '1 day'
  ) AS d
  CROSS JOIN unnest(ARRAY['08:00','10:30','14:00','17:30','20:00']::time[]) AS h
  WHERE extract(dow from d) <> 0
),
slots AS (
  SELECT fecha, hora, row_number() OVER (ORDER BY random()) AS rn
  FROM slot_candidates
  LIMIT (SELECT turnos_to_add FROM params)
),
turnos_seed AS (
  SELECT
    s.rn,
    s.fecha,
    s.hora,
    c.id AS usuario_id,
    c.email,
    c.nombre,
    c.telefono,
    sv.id AS servicio_id,
    sv.nombre AS servicio_nombre,
    sv.precio::numeric(12,2) AS monto_total,

    -- Estado variado (sin usar 'expirado' porque no está en el enum del schema.sql)
    CASE
      WHEN s.rn <= 12 THEN 'completado'::appointment_status
      WHEN s.rn <= 20 THEN 'confirmado'::appointment_status
      WHEN s.rn <= 26 THEN 'pendiente'::appointment_status
      WHEN s.rn <= 31 THEN 'cancelado'::appointment_status
      WHEN s.rn <= 35 THEN 'devuelto'::appointment_status
      WHEN s.rn <= 39 THEN 'rechazado'::appointment_status
      ELSE 'en_proceso'::appointment_status
    END AS estado,

    -- Medio: mp / transfer / manual (presencial)
    CASE
      WHEN (s.rn % 4) = 0 THEN 'transfer'
      WHEN (s.rn % 3) = 0 THEN 'mp'
      ELSE 'manual'
    END AS medio
  FROM slots s
  JOIN LATERAL (SELECT * FROM clientes ORDER BY random() LIMIT 1) c ON true
  JOIN LATERAL (SELECT * FROM servs ORDER BY random() LIMIT 1) sv ON true
),
turnos_payload AS (
  SELECT
    t.*,
    round((t.monto_total * 0.5)::numeric, 2) AS senia,

    -- pago_id legible
    CASE
      WHEN t.medio = 'mp' THEN format('MP-DEMO-%s-%s', to_char(now(), 'YYYYMMDDHH24MISS'), lpad(t.rn::text, 3, '0'))
      WHEN t.medio = 'transfer' THEN format('TRANSFERENCIA-DEMO-%s-%s', to_char(now(), 'YYYYMMDDHH24MISS'), lpad(t.rn::text, 3, '0'))
      ELSE format('PRESENCIAL-DEMO-%s-%s', to_char(now(), 'YYYYMMDDHH24MISS'), lpad(t.rn::text, 3, '0'))
    END AS pago_id,

    -- registro_estadistica
    CASE
      WHEN t.estado = 'completado'::appointment_status THEN CASE WHEN (t.rn % 2) = 0 THEN 'total' ELSE 'seña' END
      WHEN t.estado = 'confirmado'::appointment_status THEN 'seña'
      WHEN t.estado = 'pendiente'::appointment_status THEN 'seña'
      WHEN t.estado = 'cancelado'::appointment_status THEN CASE WHEN (t.rn % 2) = 0 THEN 'seña' ELSE 'ninguno' END
      ELSE 'ninguno'
    END AS registro_estadistica,

    -- monto_pagado
    CASE
      WHEN t.estado = 'completado'::appointment_status THEN CASE WHEN (t.rn % 2) = 0 THEN t.monto_total ELSE round((t.monto_total * 0.5)::numeric, 2) END
      WHEN t.estado = 'confirmado'::appointment_status THEN round((t.monto_total * 0.5)::numeric, 2)
      WHEN t.estado = 'pendiente'::appointment_status THEN CASE WHEN (t.rn % 5) = 0 THEN round((t.monto_total * 0.5)::numeric, 2) ELSE 0 END
      WHEN t.estado = 'cancelado'::appointment_status THEN CASE WHEN (t.rn % 2) = 0 THEN round((t.monto_total * 0.5)::numeric, 2) ELSE 0 END
      ELSE 0
    END AS monto_pagado,

    -- senia_devuelta
    (t.estado = 'devuelto'::appointment_status) AS senia_devuelta,

    -- Transferencia: estado + comprobante
    CASE
      WHEN t.medio <> 'transfer' THEN NULL
      WHEN t.estado = 'rechazado'::appointment_status THEN 'rechazado'::transfer_status
      WHEN t.estado = 'en_proceso'::appointment_status THEN 'pendiente'::transfer_status
      ELSE 'aprobado'::transfer_status
    END AS estado_transferencia,

    CASE
      WHEN t.medio = 'transfer' THEN format('uploads/comprobantes/demo-%s.jpg', lpad(t.rn::text, 3, '0'))
      ELSE ''
    END AS comprobante_path,

    CASE
      WHEN t.medio = 'transfer' AND t.estado = 'rechazado'::appointment_status THEN 'Comprobante demo rechazado'
      ELSE ''
    END AS motivo_rechazo_transferencia,

    CASE WHEN t.medio = 'transfer' THEN 'Delfina Nails' ELSE '' END AS titular_transferencia,
    CASE WHEN t.medio = 'transfer' THEN CASE WHEN (t.rn % 2) = 0 THEN 'Alias' ELSE 'CBU' END ELSE '' END AS metodo_transferencia

  FROM turnos_seed t
),
insert_turnos AS (
  INSERT INTO turnos (
    pago_id,
    usuario_id,
    servicio_id,
    fecha,
    hora,
    estado,
    email,
    nombre,
    telefono,
    comentario,
    registro_estadistica,
    monto_pagado,
    monto_total,
    email_enviado,
    senia_devuelta,
    comprobante_path,
    estado_transferencia,
    motivo_rechazo_transferencia,
    titular_transferencia,
    metodo_transferencia,
    created_at,
    updated_at
  )
  SELECT
    p.pago_id,
    p.usuario_id,
    p.servicio_id,
    p.fecha,
    p.hora,
    p.estado,
    p.email,
    p.nombre,
    p.telefono,
    '',
    p.registro_estadistica,
    p.monto_pagado,
    p.monto_total,
    false,
    p.senia_devuelta,
    p.comprobante_path,
    p.estado_transferencia,
    p.motivo_rechazo_transferencia,
    p.titular_transferencia,
    p.metodo_transferencia,
    (now() - make_interval(days => (5 + (random() * 25))::int)),
    now()
  FROM turnos_payload p
  -- Evitar choques si ya existen slots bloqueados por datos previos
  ON CONFLICT ON CONSTRAINT turnos_unique_slot_active_uq DO NOTHING
  RETURNING id
)
SELECT
  (SELECT count(*) FROM seed_users_desired) AS usuarios_deseados,
  (SELECT count(*) FROM seed_users) AS usuarios_insertados,
  (SELECT count(*) FROM insert_turnos) AS turnos_insertados;

COMMIT;
