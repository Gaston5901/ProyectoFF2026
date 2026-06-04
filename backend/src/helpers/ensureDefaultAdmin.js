import UsuariosModel from "../models/usuariosSchema.js";

// Asegura que exista el superadmin por defecto en MongoDB.
export async function ensureDefaultAdmin() {
  // Lee credenciales/valores por defecto desde variables de entorno.
  const superAdminEmail = (
    process.env.DEFAULT_SUPERADMIN_EMAIL ||
    process.env.DEFAULT_ADMIN_EMAIL ||
    "superadmin@gmail.com"
  )
    .toLowerCase()
    .trim();
  const superAdminPassword =
    process.env.DEFAULT_SUPERADMIN_PASSWORD ||
    process.env.DEFAULT_ADMIN_PASSWORD ||
    "superadmin123";
  const superAdminNombre = (process.env.DEFAULT_SUPERADMIN_NOMBRE || "Triny").trim();
  const legacyEmails = ["admin@turnos.com"].filter((email) => email !== superAdminEmail);

  try {
    // Busca por email o username para soportar datos viejos.
    const emailsToMatch = [superAdminEmail, ...legacyEmails];

    // Compat: si la colección tiene documentos legacy con `username`, también matcheamos por ahí.
    let admin = await UsuariosModel.findOne({
      $or: [
        ...emailsToMatch.map((email) => ({ email })),
        ...emailsToMatch.map((email) => ({ username: email })),
      ],
    });

    if (!admin) {
      const nuevo = new UsuariosModel({
        nombre: superAdminNombre,
        email: superAdminEmail,
        telefono: "",
        password: superAdminPassword,
        rol: "superadmin",
      });
      await nuevo.save();
      console.log(`[Seed] Superadmin creado: ${superAdminEmail} (${superAdminNombre})`);
      return;
    }

    // Si ya existe, solo corrige los campos que estén desactualizados.
    let changed = false;

    // Asegurar rol superadmin (dueña)
    if (admin.rol !== "superadmin") {
      admin.rol = "superadmin";
      changed = true;
    }

    if (String(admin.email || '').toLowerCase().trim() !== superAdminEmail) {
      admin.email = superAdminEmail;
      changed = true;
    }

    if (String(admin.username || '').toLowerCase().trim() !== superAdminEmail) {
      admin.username = superAdminEmail;
      changed = true;
    }

    // Asegurar nombre fijo (Triny)
    if (String(admin.nombre || '').trim() !== superAdminNombre) {
      admin.nombre = superAdminNombre;
      changed = true;
    }

    const passwordMatches = admin.password
      ? await admin.compararPassword(superAdminPassword)
      : false;
    if (!passwordMatches) {
      admin.password = superAdminPassword;
      changed = true;
    }

    if (changed) {
      await admin.save();
      console.log(`[Seed] Superadmin asegurado para: ${superAdminEmail} (${admin.nombre})`);
    }
  } catch (error) {
    // No rompe la app: solo informa si el seed no pudo aplicarse.
    console.error("[Seed] Error asegurando admin por defecto:", error);
  }
}
