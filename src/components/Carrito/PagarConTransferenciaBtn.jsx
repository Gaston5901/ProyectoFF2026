import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import TransferenciaForm from './TransferenciaForm';
import { Landmark } from 'lucide-react';

// Modal que muestra el formulario de transferencia por encima de toda la app.
const ModalTransferencia = ({ open, onClose }) => {
  // Si no está abierto, no renderiza nada.
  if (!open) return null;
  const modalContent = (
    <div className="transferencia-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.22)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 12px',
      overflow: 'hidden',
    }}>
      <style>{`
        .transferencia-modal-card { width: min(94vw, 440px); }
        @media (max-width: 600px) {
          .transferencia-modal-overlay { padding: 8px; }
          .transferencia-modal-card {
            width: calc(100vw - 16px);
            max-width: calc(100vw - 16px);
            padding: 16px 12px 14px 12px;
            border-radius: 18px;
            max-height: calc(100vh - 16px);
          }
        }
        @media (min-width: 900px) {
          .transferencia-modal-card { width: min(92vw, 720px); max-width: 720px; }
        }
      `}</style>

      {/* Tarjeta central donde se monta el formulario real de transferencia. */}
      <div className="transferencia-modal-card" style={{
        background: '#fff',
        borderRadius: 14,
        padding: '22px 22px 18px 22px',
        minWidth: 0,
        maxWidth: 720,
        boxShadow: '0 8px 32px rgba(233,30,99,0.13)',
        position: 'relative',
        margin: '0 auto',
        border: '1.2px solid #e91e63',
        height: 'auto',
        minHeight: 0,
        maxHeight: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflow: 'hidden',
      }}>
        {/* Botón para cerrar el modal. */}
        <button onClick={onClose} style={{position:'absolute',top:10,right:10,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#e91e63',fontWeight:'bold',zIndex:2}}>×</button>
        <div style={{padding: 0}}>
          {/* Formulario reutilizable que captura los datos de la transferencia. */}
          <TransferenciaForm />
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
};

// Botón que abre el modal de pago por transferencia.
const PagarConTransferenciaBtn = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Disparador visual del modal. */}
      <button
        className="btn btn-secondary btn-pagar btn-transferencia"
        onClick={() => setOpen(true)}
      >
        <Landmark size={20} />
        Transferencia
      </button>
      {/* Se monta fuera del flujo normal para quedar por encima del resto del contenido. */}
      <ModalTransferencia open={open} onClose={()=>setOpen(false)} />
    </>
  );
};

export default PagarConTransferenciaBtn;
