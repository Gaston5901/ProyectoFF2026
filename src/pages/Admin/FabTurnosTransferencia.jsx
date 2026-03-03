import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import TurnosTransferenciaModal from './TurnosTransferenciaModal';

const FabTurnosTransferencia = ({ onReloadDatos }) => {
  const [open, setOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [count, setCount] = useState(0); // Simula que hay 1 pendiente
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/turnos/en-proceso/count');
        setCount(res.data.count);
      } catch {
        setCount(0);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setModalLoading(true);
          setOpen(true);
        }}
        style={{
          position: 'fixed',
          bottom: isMobile ? 16 : 32,
          right: isMobile ? 16 : 32,
          zIndex: 3000,
          background: '#111',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: isMobile ? 48 : 60,
          height: isMobile ? 48 : 60,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? 22 : 28,
          cursor: 'pointer',
        }}
        title="Turnos a confirmar"
      >
        <Bell size={isMobile ? 24 : 32} />
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: isMobile ? 6 : 10,
            right: isMobile ? 6 : 10,
            background: 'red',
            color: '#fff',
            borderRadius: '50%',
            minWidth: isMobile ? 18 : 22,
            height: isMobile ? 18 : 22,
            fontSize: isMobile ? 13 : 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            border: '2px solid #fff',
            boxShadow: '0 2px 8px #0002',
          }}>
            {count}
          </span>
        )}
      </button>
      {open && (
        <TurnosTransferenciaModal
          onClose={() => {
            setOpen(false);
            setModalLoading(false);
          }}
          onReady={() => setModalLoading(false)}
          onReloadDatos={onReloadDatos}
        />
      )}
    </>
  );
};

export default FabTurnosTransferencia;
