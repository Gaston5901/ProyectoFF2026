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
    if (legacy && !guest) {
      localStorage.setItem(GUEST_STORAGE_KEY, legacy);
    }
    // Evitar que la key legacy siga causando confusión
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
    const nuevoItem = { id: Date.now(), servicio, fecha, hora };
    set({ items: [...get().items, nuevoItem] });
    toast.success('Servicio agregado al carrito');
  },
  eliminarDelCarrito: (itemId) => {
    set({ items: get().items.filter(i => i.id !== itemId) });
    toast.info('Servicio eliminado del carrito');
  },
  vaciarCarrito: () => {
    set({ items: [] });
  },
  calcularTotal: () => get().items.reduce((total, item) => total + item.servicio.precio, 0),
  calcularSeña: () => Math.round(get().items.reduce((total, item) => total + item.servicio.precio, 0) * 0.5),
  cantidadItems: () => get().items.length,
}), {
  // Por defecto: guest. Al iniciar sesión se cambia dinámicamente.
  name: GUEST_STORAGE_KEY
}));

// Cambia la key de persistencia (localStorage) al usuario actual y rehidrata.
// Importante: no borra el carrito del usuario anterior; solo cambia el "scope".
export const setCarritoStorageForUser = async (user) => {
  const name = getCarritoStorageKey(user);
  try {
    useCarritoStore.persist.setOptions({ name });
  } catch {
    // ignore
  }

  // Evitar que se mezcle el carrito anterior en memoria
  try {
    useCarritoStore.setState({ items: [] });
  } catch {
    // ignore
  }

  try {
    await useCarritoStore.persist.rehydrate();
  } catch {
    // ignore
  }
};

// Hook de compatibilidad similar a antiguo useCarrito
export const useCarrito = () => {
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
