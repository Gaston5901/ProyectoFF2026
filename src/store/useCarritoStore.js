import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'react-toastify';

const LEGACY_STORAGE_KEY = 'carrito-storage';
const GUEST_STORAGE_KEY = 'carrito-storage:guest';

const sanitizeStorageKeyPart = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 80);

export const getCarritoStorageKey = (user) => {
  // Cada usuario usa su propia key; si no hay sesión, se usa el carrito de invitado.
  if (!user) return GUEST_STORAGE_KEY;
  const id = user._id || user.id || user.email;
  const safe = sanitizeStorageKeyPart(id);
  return safe ? `carrito-storage:user:${safe}` : GUEST_STORAGE_KEY;
};

const migrateLegacyCartIfNeeded = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const guest = localStorage.getItem(GUEST_STORAGE_KEY);
    // Si existe la key vieja, la copiamos al carrito de invitado para no perder datos.
    if (legacy && !guest) {
      localStorage.setItem(GUEST_STORAGE_KEY, legacy);
    }
    // Eliminamos la key antigua para evitar que convivan dos fuentes distintas.
    if (legacy) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
};

migrateLegacyCartIfNeeded();

export const useCarritoStore = create(persist((set, get) => ({
  items: [],
  agregarAlCarrito: (servicio, fecha, hora) => {
    // Guarda el servicio elegido junto con la fecha y hora seleccionadas.
    const nuevoItem = { id: Date.now(), servicio, fecha, hora };
    set({ items: [...get().items, nuevoItem] });
    toast.success('Servicio agregado al carrito');
  },
  eliminarDelCarrito: (itemId) => {
    // Saca un item puntual del carrito.
    set({ items: get().items.filter(i => i.id !== itemId) });
    toast.info('Servicio eliminado del carrito');
  },
  vaciarCarrito: () => {
    // Limpia por completo el carrito activo.
    set({ items: [] });
  },
  // Calcula el total sumando el precio de cada servicio.
  calcularTotal: () => get().items.reduce((total, item) => total + item.servicio.precio, 0),
  // Calcula la seña como el 50% del total.
  calcularSeña: () => Math.round(get().items.reduce((total, item) => total + item.servicio.precio, 0) * 0.5),
  // Devuelve cuántos items hay en el carrito.
  cantidadItems: () => get().items.length,
}), {
  // Por defecto persiste en el carrito de invitado; al iniciar sesión cambia la key.
  name: GUEST_STORAGE_KEY
}));

// Cambia la key de persistencia (localStorage) al usuario actual y rehidrata.
// Importante: no borra el carrito del usuario anterior; solo cambia el "scope".
export const setCarritoStorageForUser = async (user) => {
  const name = getCarritoStorageKey(user);
  try {
    // Reconfigura la persistencia para apuntar al carrito del usuario actual.
    useCarritoStore.persist.setOptions({ name });
  } catch {
    // ignore
  }

  // Evita que quede visible el carrito anterior mientras se carga el nuevo.
  try {
    useCarritoStore.setState({ items: [] });
  } catch {
    // ignore
  }

  try {
    // Vuelve a leer desde localStorage usando la nueva key.
    await useCarritoStore.persist.rehydrate();
  } catch {
    // ignore
  }
};

// Hook de compatibilidad similar a antiguo useCarrito
export const useCarrito = () => {
  // Expone el store con la misma interfaz que usaba el código anterior.
  const { items, agregarAlCarrito, eliminarDelCarrito, vaciarCarrito, calcularTotal, calcularSeña } = useCarritoStore();
  return {
    items,
    agregarAlCarrito,
    eliminarDelCarrito,
    vaciarCarrito,
    calcularTotal,
    calcularSeña,
    cantidadItems: items.length,
  };
};
