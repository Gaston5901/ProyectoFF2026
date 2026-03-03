import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import TransferenciaForm from './TransferenciaForm';

const ModalTransferencia = ({ open, onClose }) => {
  if (!open) return null;
  const modalContent = (
    <div style={{
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
      padding: 0,
      overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 14,
        padding: '28px 36px 24px 36px',
        minWidth: 0,
        maxWidth: 440,
        width: '400px',
        boxShadow: '0 8px 32px rgba(233,30,99,0.13)',
        position: 'relative',
        margin: '40px auto 0 auto', // margen inferior quitado
        border: '1.2px solid #e91e63',
        height: 'auto',
        minHeight: 0,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden', // evita que sobresalga
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
        className="btn btn-secondary btn-pagar"
        style={{
          marginTop: 8,
          background: '#fff',
          color: '#e91e63',
          border: '2px solid #e91e63',
          fontWeight: 700,
          transition: 'background 0.18s, color 0.18s',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#e91e63';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.color = '#e91e63';
        }}
        onClick={() => setOpen(true)}
      >
        Pagar con Transferencia
      </button>
      <ModalTransferencia open={open} onClose={()=>setOpen(false)} />
    </>
  );
};

export default PagarConTransferenciaBtn;
