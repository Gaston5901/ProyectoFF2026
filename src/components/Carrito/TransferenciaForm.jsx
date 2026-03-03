import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrito } from '../../store/useCarritoStore';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FaRegCopy } from 'react-icons/fa6';
import { FaCircle } from 'react-icons/fa';
import { FaArrowRight } from 'react-icons/fa';
import Swal from 'sweetalert2';

const aliasList = [
  'Triny.zela.sanna.mp',
  'TZELARAYANSAN.NX.ARS',
];

const TransferenciaForm = () => {
  const { items, calcularTotal, vaciarCarrito } = useCarrito();
  const { user } = useAuth();
  const [nombreTitular, setNombreTitular] = useState('');
  const [metodo, setMetodo] = useState('');
  const [comprobante, setComprobante] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) {
      setComprobante(null);
      return;
    }
    // Validar tipo de archivo: permitir imágenes y PDF
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      setError('El archivo debe ser una imagen o PDF');
      setShowError(true);
      setComprobante(null);
      return;
    }
    setComprobante(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setShowError(false);
    if (!nombreTitular || !comprobante || !metodo) {
      Swal.fire({
        icon: 'info',
        title: 'Faltan datos',
        text: 'Completa todos los campos y adjunta el comprobante.',
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: 'top',
        customClass: {
          popup: 'swal2-toast-fino'
        }
      });
      return;
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      // Tomar el primer item del carrito (solo se permite uno por reserva)
      const primerItem = items[0] || {};
      formData.append('titularTransferencia', nombreTitular);
      formData.append('metodoTransferencia', metodo);
      formData.append('comprobante', comprobante);
      // Si el item tiene servicioId, usarlo; si no, buscar el _id o id
      // Enviar siempre el ID del servicio
      formData.append('servicio', primerItem.servicioId || primerItem.servicio?._id || primerItem.servicio?.id || '');
      formData.append('metodoPago', 'transferencia');
      formData.append('estadoTransferencia', 'pendiente');
      formData.append('fecha', primerItem.fecha || '');
      formData.append('hora', primerItem.hora || '');
      formData.append('email', user?.email || '');
      formData.append('montoTotal', primerItem.servicio?.precio || 0);
      // Estado inicial: pendiente
      formData.append('estadoTransferencia', 'pendiente');
      await api.post('/turnos/transferencia', formData, {
        headers: undefined // No headers manuales, axios detecta FormData
      });
      vaciarCarrito();
      toast.success('¡Turno solicitado! Esperá la confirmación por email.', {
        position: 'top-center',
        autoClose: 3500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'colored',
      });
      setTimeout(() => {
        navigate('/mis-turnos');
        setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
      }, 400);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo completar el turno',
        text: 'Intenta de nuevo.',
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: 'top',
        customClass: {
          popup: 'swal2-toast-fino'
        }
      });
    }
    setEnviando(false);
  };

  // Calcular datos del primer servicio (si hay uno solo)
  const primerItem = items[0] || {};
  const monto = primerItem.servicio?.precio || 0;
  const senia = Math.round(monto * 0.5);

  const camposCompletos = nombreTitular && comprobante && metodo;

  return (
    <form onSubmit={handleSubmit} style={{
      background:'#fff',
      borderRadius:16,
      padding:'18px 8px 16px 8px',
      maxWidth:420,
      margin:'16px auto',
      boxShadow:'0 2px 16px #e91e6322',
      display:'flex',
      flexDirection:'column',
      gap:14,
      minHeight:420,
      justifyContent:'flex-start',
      position:'relative',
      overflow:'visible',
    }}>
      <h2 style={{color:'#e91e63',textAlign:'center'}}>Pago por Transferencia</h2>
      <div>
        <strong style={{display:'block',marginBottom:2}}>Alias para transferir:</strong>
        <ul style={{margin:'8px 0 0 0',padding:'0',listStyle:'none',position:'relative'}}>
          {aliasList.map((alias, idx) => (
            <li key={alias} style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,position:'relative'}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}>
                <FaCircle size={9} color="#e91e63" style={{marginRight:2,position:'absolute',left:0,top:'50%',transform:'translateY(-50%)'}} />
                <span style={{fontSize:14,wordBreak:'break-all',background:'#fce4ec',borderRadius:4,padding:'2px 6px',boxShadow:'0 1px 2px #e91e6322',fontWeight:500,color:'#e91e63',marginLeft:18}}>{alias}</span>
              </span>
              <button type="button" onClick={()=>navigator.clipboard.writeText(alias)} style={{background:'#e3e7ef',color:'#e91e63',border:'none',borderRadius:6,padding:'2px 4px',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:2,boxShadow:'0 1px 2px #e91e6322'}} title="Copiar alias">
                <FaRegCopy size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <label style={{fontWeight:600}}>Nombre del titular que transfiere:
        <input type="text" value={nombreTitular} onChange={e=>setNombreTitular(e.target.value)} required style={{width:'100%',marginTop:6,padding:8,borderRadius:6,border:'1.5px solid #e91e63'}} />
      </label>
      <label style={{fontWeight:600,marginTop:2}}>Método:
        <select value={metodo} onChange={e=>setMetodo(e.target.value)} required style={{width:'100%',marginTop:6,padding:8,borderRadius:6,border:'1.5px solid #e91e63'}}>
          <option value="" disabled>Selecciona el método de pago</option>
          <option value="Tarjeta Naranja">Tarjeta Naranja</option>
          <option value="Mercado Pago">Mercado Pago</option>
        </select>
      </label>
      <label style={{fontWeight:600,marginTop:2}}>Comprobante (foto o PDF):
        <div style={{position:'relative',width:'100%',marginTop:6}}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            required
            capture="environment"
            style={{
              opacity: 0,
              width: '100%',
              height: 40,
              position: 'absolute',
              left: 0,
              top: 0,
              cursor: 'pointer',
              zIndex: 2,
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f3f6fa',
            border: '1.5px solid #e91e63',
            borderRadius: 22,
            padding: '0 16px',
            height: 40,
            fontSize: 15,
            color: '#e91e63',
            fontWeight: 500,
            boxShadow: '0 1px 4px #e91e6322',
            position: 'relative',
            zIndex: 1,
            transition: 'border 0.2s',
            overflow: 'hidden',
          }}>
            <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {comprobante ? comprobante.name : 'Seleccionar archivo'}
            </span>
            <span style={{marginLeft:10,background:'#fff',borderRadius:'50%',width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 2px #e91e6322'}}>
              <svg width="14" height="14" fill="#e91e63" viewBox="0 0 20 20"><path d="M16.5 9.5a.75.75 0 0 0-.75.75v4.25a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1v-9.5a1 1 0 0 1 1-1h4.25a.75.75 0 0 0 0-1.5h-4.25A2.5 2.5 0 0 0 3 5.25v9.5A2.5 2.5 0 0 0 5.5 17.25h9.5A2.5 2.5 0 0 0 17.5 14.75v-4.25a.75.75 0 0 0-.75-.75z"></path><path d="M17.03 3.97a.75.75 0 0 0-1.06 0l-7.72 7.72a.75.75 0 0 0-.22.53v2.03a.75.75 0 0 0 .75.75h2.03a.75.75 0 0 0 .53-.22l7.72-7.72a.75.75 0 0 0-1.06-1.06zm-7.22 8.78v.72h.72l6.72-6.72-.72-.72-6.72 6.72z"></path></svg>
            </span>
          </div>
        </div>
        {showError && error && (
          <div style={{color:'#e91e63',fontWeight:600,marginTop:6,fontSize:14}}>{error}</div>
        )}
      </label>
      <div style={{fontWeight:600,marginTop:8}}>Seña a transferir: <span style={{fontWeight:700,color:'#e91e63',fontSize:20}}>${senia}</span></div>
      <button type="submit" disabled={enviando || !camposCompletos} style={{
        background: camposCompletos ? 'linear-gradient(90deg,#d32f2f 0%,#ff5252 100%)' : '#eee',
        color: camposCompletos ? '#fff' : '#aaa',
        border: 'none',
        borderRadius: 22,
        padding: '8px 0',
        fontWeight: 700,
        fontSize: 16,
        marginTop: 14,
        cursor: enviando || !camposCompletos ? 'not-allowed' : 'pointer',
        boxShadow: camposCompletos ? '0 2px 8px #d32f2f22' : 'none',
        letterSpacing: 0.5,
        transition: 'background 0.2s, box-shadow 0.2s',
        outline: 'none',
        position: 'relative',
        overflow: 'hidden',
        opacity: enviando || !camposCompletos ? 0.7 : 1,
        borderBottom: camposCompletos ? '2px solid #b71c1c' : 'none',
        width: '70%',
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onMouseOver={e => {
        if (camposCompletos) e.currentTarget.style.background = 'linear-gradient(90deg,#ff5252 0%,#d32f2f 100%)';
      }}
      onMouseOut={e => {
        if (camposCompletos) e.currentTarget.style.background = 'linear-gradient(90deg,#d32f2f 0%,#ff5252 100%)';
      }}
    >
        <span style={{marginLeft:16}}>{enviando ? 'Solicitando turno...' : 'Solicitar turno'}</span>
        <span style={{
          background:'#fff',
          borderRadius:'50%',
          width:28,
          height:28,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          marginRight:8,
          boxShadow:'0 1px 4px #d32f2f22',
        }}>
          <FaArrowRight color={camposCompletos ? '#d32f2f' : '#aaa'} size={18} />
        </span>
      </button>
    </form>
  );
};

export default TransferenciaForm;
