import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import TransferenciaForm from './TransferenciaForm';
import { Landmark } from 'lucide-react';

const ModalTransferencia = ({ open, onClose }) => {
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
        @media (min-width: 900px) {
          .transferencia-modal-card { width: min(92vw, 720px); max-width: 720px; }
        }
      `}</style>

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
        <button onClick={onClose} style={{position:'absolute',top:10,right:10,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#e91e63',fontWeight:'bold',zIndex:2}}>×</button>
        <div style={{padding: 0}}>
          <TransferenciaForm />
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
};

const PagarConTransferenciaBtn = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn btn-secondary btn-pagar btn-transferencia"
        onClick={() => setOpen(true)}
      >
        <Landmark size={20} />
        Transferencia
      </button>
      <ModalTransferencia open={open} onClose={()=>setOpen(false)} />
    </>
  );
};

export default PagarConTransferenciaBtn;
