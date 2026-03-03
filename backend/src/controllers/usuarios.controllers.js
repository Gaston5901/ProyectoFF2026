import UsuariosModel from "../models/usuariosSchema.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordRecoveryEmail } from "../helpers/emailSender.cjs";

const sanitizeUsuario = (usuarioDoc) => {
  if (!usuarioDoc) return usuarioDoc;
  const obj = typeof usuarioDoc.toObject === "function" ? usuarioDoc.toObject() : { ...usuarioDoc };
  delete obj.password;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpires;
  return obj;
};

export const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuariosModel.find();
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, telefono, password } = req.body;
    const rol = req.body.rol || "cliente";

    const usernameBody = req.body?.username;

    const emailNorm = String(email || "").toLowerCase().trim();
    if (!emailNorm) return res.status(400).json({ mensaje: "Email inválido" });

    const usernameNorm = String(usernameBody || emailNorm).toLowerCase().trim();

    // Verificar si el usuario ya existe
    const usuarioExistente = await UsuariosModel.findOne({ email: emailNorm });
    if (usuarioExistente) {
      // Si ya existe, devolver el usuario existente en vez de error
      return res.status(200).json({ usuario: sanitizeUsuario(usuarioExistente), mensaje: "Usuario ya registrado" });
    }

    const nuevoUsuario = new UsuariosModel({
      nombre,
      email: emailNorm,
      username: usernameNorm,
      telefono: telefono || "",
      password,
      rol,
    });
    await nuevoUsuario.save();

    const token = jwt.sign(
      { id: nuevoUsuario._id, rol: nuevoUsuario.rol },
      process.env.JWT_SECRET || "secreto",
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, usuario: sanitizeUsuario(nuevoUsuario) });
  } catch (error) {
    console.error(error);
    // Duplicados (email/username) -> 409
    if (error?.code === 11000) {
      return res.status(409).json({ mensaje: "El usuario ya existe" });
    }
    res.status(500).json({ mensaje: "Error al crear el usuario" });
  }
}

export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await UsuariosModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await UsuariosModel.findByIdAndDelete(id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await UsuariosModel.findById(id);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailNorm = String(email || "").toLowerCase().trim();

    const usuario = await UsuariosModel.findOne({
      $or: [{ email: emailNorm }, { username: emailNorm }],
    });
    if (!usuario) return res.status(400).json({ error: "Usuario o contraseña incorrectos" });

    const esValido = await usuario.compararPassword(password);
    if (!esValido) return res.status(400).json({ error: "Usuario o contraseña incorrectos" });

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET || "secreto",
      { expiresIn: "7d" }
    );

    res.json({ token, usuario: sanitizeUsuario(usuario) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}

export const recuperarPassword = async (req, res) => {
  try {
    const username = req.body?.username;
    const emailNorm = String(username || "").toLowerCase().trim();
    if (!emailNorm) return res.status(400).json({ mensaje: "Email inválido" });

    const usuario = await UsuariosModel.findOne({
      $or: [{ email: emailNorm }, { username: emailNorm }],
    });

    // Respuesta neutra para no filtrar si el usuario existe
    if (!usuario) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    usuario.passwordResetTokenHash = tokenHash;
    usuario.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    await usuario.save();

    await sendPasswordRecoveryEmail(usuario.email, token);

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al solicitar recuperación" });
  }
};

export const resetearPassword = async (req, res) => {
  try {
    const username = req.body?.username;
    const token = req.body?.token;
    const password = req.body?.password;

    const emailNorm = String(username || "").toLowerCase().trim();
    if (!token || typeof token !== "string") return res.status(400).json({ mensaje: "Token inválido" });
    if (!password || typeof password !== "string") return res.status(400).json({ mensaje: "Password inválido" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const andConditions = [
      { passwordResetTokenHash: tokenHash },
      { passwordResetExpires: { $gt: new Date() } },
    ];

    // Si el frontend envía email/username, lo usamos como filtro extra.
    // Si no lo envía (p.ej. usuario abrió el link en otro dispositivo), permitimos reset solo por token.
    if (emailNorm) {
      andConditions.unshift({ $or: [{ email: emailNorm }, { username: emailNorm }] });
    }

    const usuario = await UsuariosModel.findOne({ $and: andConditions });

    if (!usuario) return res.status(400).json({ mensaje: "Token inválido o expirado" });

    usuario.password = password;
    usuario.passwordResetTokenHash = null;
    usuario.passwordResetExpires = null;
    await usuario.save();

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al restablecer contraseña" });
  }
};