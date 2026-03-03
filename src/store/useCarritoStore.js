import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'react-toastify';

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
  name: 'carrito-storage'
}));

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
