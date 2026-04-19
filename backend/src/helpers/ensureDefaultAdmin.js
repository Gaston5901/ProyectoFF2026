import UsuariosModel from "../models/usuariosSchema.js";

export async function ensureDefaultAdmin() {
  const superAdminEmail = (
    process.env.DEFAULT_SUPERADMIN_EMAIL ||
    process.env.DEFAULT_ADMIN_EMAIL ||
    "admin@turnos.com"
  )
    .toLowerCase()
    .trim();
  const superAdminPassword =
    process.env.DEFAULT_SUPERADMIN_PASSWORD ||
    process.env.DEFAULT_ADMIN_PASSWORD ||
    "admin123";
  const superAdminNombre = (process.env.DEFAULT_SUPERADMIN_NOMBRE || "Triny").trim();

  try {
    // Compat: si la colección tiene documentos legacy con `username`, también matcheamos por ahí.
    let admin = await UsuariosModel.findOne({ email: superAdminEmail });
    if (!admin) {
      admin = await UsuariosModel.findOne({ username: superAdminEmail });
    }

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

    let changed = false;

    // Asegurar rol superadmin (dueña)
    if (admin.rol !== "superadmin") {
      admin.rol = "superadmin";
      changed = true;
    }

    // Asegurar nombre fijo (Triny)
    if (String(admin.nombre || '').trim() !== superAdminNombre) {
      admin.nombre = superAdminNombre;
      changed = true;
    }

    if (changed) {
      await admin.save();
      console.log(`[Seed] Superadmin asegurado para: ${superAdminEmail} (${admin.nombre})`);
    }
  } catch (error) {
    console.error("[Seed] Error asegurando admin por defecto:", error);
  }
}
