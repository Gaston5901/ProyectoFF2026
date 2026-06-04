import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Badge que muestra cuántos turnos están en proceso.
const BadgeTurnosEnProceso = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Consulta el conteo actual al backend.
    const fetchCount = async () => {
      try {
        const res = await axios.get('/api/turnos/en-proceso/count');
        setCount(res.data.count);
      } catch {
        setCount(0);
      }
    };
    fetchCount();
    // Vuelve a consultar periódicamente para mantener el número actualizado.
    const interval = setInterval(fetchCount, 2000); // refresca cada 2s
    // Limpia el intervalo al desmontar el componente.
    return () => clearInterval(interval);
  }, []);

  // Si no hay turnos en proceso, no muestra nada.
  if (count === 0) return null;
  return (
    <span style={{
      // Estilo tipo badge circular para destacar el contador.
      background: 'red',
      color: 'white',
      borderRadius: '50%',
      padding: '0.3em 0.7em',
      fontSize: '0.9em',
      marginLeft: '0.5em',
      fontWeight: 'bold',
    }}>{count}</span>
  );
};

export default BadgeTurnosEnProceso;
