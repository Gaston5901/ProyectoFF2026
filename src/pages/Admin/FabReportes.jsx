import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FabReportes = ({ offsetIndex = 0 }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const size = isMobile ? 48 : 60;
  const baseBottom = isMobile ? 16 : 32;
  const baseRight = isMobile ? 16 : 32;
  const gap = isMobile ? 12 : 14;
  const bottom = baseBottom + offsetIndex * (size + gap);

  return (
    <button
      onClick={() => navigate('/admin/reportes')}
      style={{
        position: 'fixed',
        bottom,
        right: baseRight,
        zIndex: 3000,
        background: '#111',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: size,
        height: size,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      title="Reportes"
      aria-label="Ir a reportes"
      type="button"
    >
      <FileText size={isMobile ? 22 : 28} />
    </button>
  );
};

export default FabReportes;
