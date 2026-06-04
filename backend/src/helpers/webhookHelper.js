import TurnosModel from "../models/turnosSchema.js";
import ServiciosModel from "../models/serviciosSchema.js";
import { enviarComprobanteTurno } from "./emailSender.cjs";

// Busca IDs de turnos dentro del metadata o referencia externa del pago.
function pickTurnoIdsFromPago(pago) {
  const metadata = pago?.metadata || {};
  const ids = [];

  const lista = metadata.turnosIds || metadata.turnoIds || metadata.turnos_ids;
  if (Array.isArray(lista)) {
    ids.push(...lista);
  } else if (typeof lista === "string") {
    ids.push(...lista.split(","));
  }

  const single = metadata.turnoId || metadata.turno_id || pago?.external_reference || null;
  if (single) ids.push(single);

  return Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)));
}

// Procesa un pago aprobado y marca los turnos asociados como confirmados.
export async function procesarPagoAprobado(pago) {
  // IMPORTANTE: no crear turnos “a ciegas” desde el pago,
  // porque el schema requiere usuario/servicio (ObjectId).
  // Extrae los turnos vinculados al pago y sale si no hay ninguno.
  const turnoIds = pickTurnoIdsFromPago(pago);
  if (turnoIds.length === 0) {
    console.log("[Webhook] Pago aprobado sin turnoId/metadata. Ignorando.");
    return;
  }

  // Guarda el ID del pago de Mercado Pago para relacionarlo con el turno.
  const pagoId = String(pago?.id || "");

  for (const turnoId of turnoIds) {
    // Confirma el turno y persiste el pago asociado.
    const turno = await TurnosModel.findByIdAndUpdate(
      turnoId,
      {
        estado: "confirmado",
        pagoId,
      },
      { new: true }
    );

    if (!turno) {
    // Evita reenviar el mismo comprobante más de una vez.
      console.log("[Webhook] No se encontró turno para turnoId:", turnoId);
      continue;
    }

    const turnoParaEmail = await TurnosModel.findOneAndUpdate(
      { _id: turnoId, emailEnviado: { $ne: true } },
      { emailEnviado: true },
      { new: true }
    );

    if (!turnoParaEmail) {
      continue;
    }

    // Enviar email de confirmación (si hay email guardado en el turno)
    try {
      // Busca el servicio para armar el detalle del comprobante.
      const servicioDoc = turno.servicio ? await ServiciosModel.findById(turno.servicio) : null;
      const serviciosArr = [
        {
          title: servicioDoc?.nombre || "Servicio",
          unit_price: servicioDoc?.precio || 0,
        },
      ];

      const fechaIso = turno.fecha instanceof Date ? turno.fecha.toISOString().slice(0, 10) : String(turno.fecha);
      const to = turno.email || pago?.payer?.email;
      if (!to) continue;

      // Genera y envía el comprobante al cliente.
      await enviarComprobanteTurno({
        to,
        nombre: turno.nombre || pago?.payer?.first_name || "",
        servicios: serviciosArr,
        seña: turno.montoPagado || 0,
        total: turno.montoTotal || servicioDoc?.precio || 0,
        pagoId: turno.pagoId || pagoId,
        fecha: fechaIso,
        hora: turno.hora || "",
        extras: null,
      });
    } catch (error) {
      console.error("[Webhook] Error enviando email:", error);
    }
  }
}
