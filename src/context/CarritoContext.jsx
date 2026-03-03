// Archivo dejado para compatibilidad; ahora se usa Zustand.
import { useCarrito as useCarritoZustand } from '../store/useCarritoStore';
import { createContext, useContext } from 'react';

const CarritoContext = createContext(null);

export const useCarrito = () => useCarritoZustand();

export const CarritoProvider = ({ children }) => {
  // Mantener JSX para no romper estructura previa.
  return <CarritoContext.Provider value={{}}>{children}</CarritoContext.Provider>;
};
