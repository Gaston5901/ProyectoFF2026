import UsuariosModel from "../models/usuariosSchema.js";

export async function ensureDefaultAdmin() {
  const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || "admin@turnos.com").toLowerCase().trim();
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

  try {
    // Compat: si la colección tiene documentos legacy con `username`, también matcheamos por ahí.
    let admin = await UsuariosModel.findOne({ email: adminEmail });
    if (!admin) {
      admin = await UsuariosModel.findOne({ username: adminEmail });
    }

    if (!admin) {
      const nuevo = new UsuariosModel({
        nombre: "Admin",
        email: adminEmail,
        telefono: "",
        password: adminPassword,
        rol: "admin",
      });
      await nuevo.save();
      console.log(`[Seed] Admin creado: ${adminEmail}`);
      return;
    }

    // Asegurar rol admin (si venía de antes con otro valor)
    if (admin.rol !== "admin" && admin.rol !== "superadmin") {
      admin.rol = "admin";
      await admin.save();
      console.log(`[Seed] Rol admin asegurado para: ${adminEmail}`);
    }
  } catch (error) {
    console.error("[Seed] Error asegurando admin por defecto:", error);
  }
}
