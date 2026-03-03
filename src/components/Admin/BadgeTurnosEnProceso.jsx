import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BadgeTurnosEnProceso = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await axios.get('/api/turnos/en-proceso/count');
        setCount(res.data.count);
      } catch {
        setCount(0);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 2000); // refresca cada 7s
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;
  return (
    <span style={{
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
