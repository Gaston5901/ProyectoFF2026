import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../../config/apiBaseUrl';

const TurnosTransferenciaModal = ({ onClose, onReady, onReloadDatos }) => {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comprobanteUrl, setComprobanteUrl] = useState(null); // visor de comprobante
  const [comprobanteLoading, setComprobanteLoading] = useState(false);
  const [accionLoadingId, setAccionLoadingId] = useState(null); // id del turno en proceso

  useEffect(() => {
    fetchTurnos();
  }, []);

  const fetchTurnos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/turnos/en-proceso');
      // Asegura que turnos sea un array
      if (Array.isArray(res.data)) {
        setTurnos(res.data);
      } else if (res.data && Array.isArray(res.data.turnos)) {
        setTurnos(res.data.turnos);
      } else if (res.data && Array.isArray(res.data.transferencia)) {
        setTurnos(res.data.transferencia);
      } else {
        setTurnos([]);
      }
      setError(null);
    } catch (err) {
      setError('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  // Acción para confirmar o rechazar transferencia
  const handleAccion = async (id, accion) => {
    setAccionLoadingId(id);
    try {
      if (accion === 'confirmar') {
        await api.patch(`/turnos/${id}/aprobar-transferencia`);
      } else {
        await api.patch(`/turnos/${id}/rechazar-transferencia`);
      }
      // El mail de confirmación ya se envía desde el backend al aprobar la transferencia
      await fetchTurnos();
      await Swal.fire({
        title: `Turno ${accion === 'confirmar' ? 'confirmado' : 'rechazado'} correctamente`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#fff',
        color: '#222',
        target: document.body,
        heightAuto: true,
        customClass: {
          popup: 'swal2-over-modal',
        },
      });
      setAccionLoadingId(null);
    } catch (err) {
      Swal.fire({
        title: 'Error al actualizar el turno',
        icon: 'error',
        background: '#fff',
        color: '#222',
        target: document.body,
        heightAuto: true,
        customClass: {
          popup: 'swal2-over-modal',
        },
      });
      setAccionLoadingId(null);
    }
  };

  // Handler para cerrar el modal y recargar datos si corresponde
  const handleClose = () => {
    if (onReloadDatos) onReloadDatos();
    if (onClose) onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 18,
        padding: 32,
        minWidth: 320,
        maxWidth: 1100,
        width: '98vw',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        position: 'relative',
        border: '1.5px solid #e91e63',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1500,
      }}>
        <button onClick={handleClose} style={{position:'absolute',top:18,right:18,fontSize:28,background:'none',border:'none',cursor:'pointer',color:'#e91e63',fontWeight:'bold'}}>×</button>
        {comprobanteUrl ? (
          <div style={{width:'100%',minHeight:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <button onClick={()=>{setComprobanteUrl(null); setComprobanteLoading(false);}} style={{marginBottom:18,background:'#e91e63',color:'#fff',border:'none',borderRadius:8,padding:'8px 22px',fontWeight:600,fontSize:18,cursor:'pointer'}}>Volver</button>
            {comprobanteLoading && (
              <div style={{margin:'30px 0',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}}>
                <div className="spinner" style={{border:'4px solid #eee',borderTop:'4px solid #e91e63',borderRadius:'50%',width:48,height:48,animation:'spin 1s linear infinite'}}></div>
                <style>{`@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`}</style>
                <span style={{marginTop:12,color:'#e91e63',fontWeight:600,fontSize:18}}>Cargando</span>
              </div>
            )}
            {
              comprobanteUrl.match(/\.(jpg|jpeg|png|gif)$/i)
                ? <img src={comprobanteUrl} alt="Comprobante" style={{maxWidth:'100%',maxHeight:500,borderRadius:12,boxShadow:'0 2px 8px #e91e6322',display:comprobanteLoading?'none':'block'}} onLoad={()=>setComprobanteLoading(false)} onError={()=>setComprobanteLoading(false)} />
                : comprobanteUrl.match(/\.(pdf)$/i)
                  ? (
                      window.innerWidth <= 600
                        ? <iframe src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(comprobanteUrl)}`} title="Comprobante PDF" style={{width:'100%',height:500,border:'none',borderRadius:12,boxShadow:'0 2px 8px #e91e6322',display:comprobanteLoading?'none':'block'}} onLoad={()=>setComprobanteLoading(false)} />
                        : <iframe src={comprobanteUrl} title="Comprobante PDF" style={{width:'100%',height:500,border:'none',borderRadius:12,boxShadow:'0 2px 8px #e91e6322',display:comprobanteLoading?'none':'block'}} onLoad={()=>setComprobanteLoading(false)} />
                    )
                  : <iframe src={comprobanteUrl} title="Comprobante" style={{width:'100%',height:500,border:'none',borderRadius:12,boxShadow:'0 2px 8px #e91e6322',display:comprobanteLoading?'none':'block'}} onLoad={()=>setComprobanteLoading(false)} />
            }
          </div>
        ) : <>
        <h2 style={{marginBottom:24, color:'#e91e63', fontWeight:700, fontSize:28, textAlign:'center'}}>Turnos a confirmar <span style={{fontWeight:400, fontSize:20}}>(Transferencia)</span></h2>
        {error && <div>{error}</div>}
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            maxWidth: '100vw',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: 320,
              maxWidth: 900,
              fontSize: 16,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 8px #e91e6322',
              borderCollapse: 'collapse',
              margin: '0 auto',
            }}
          >
            <thead>
              <tr style={{background:'#fce4ec',color:'#e91e63'}}>
                <th style={{padding:'10px 8px',fontWeight:700}}>Cliente</th>
                <th style={{padding:'10px 8px',fontWeight:700}}>Método</th>
                {/* <th style={{padding:'10px 8px',fontWeight:700}}>Entidad</th> */}
                <th style={{padding:'10px 8px',fontWeight:700}}>Fecha/Hora</th>
                <th style={{padding:'10px 8px',fontWeight:700}}>Servicio</th>
                <th style={{padding:'10px 8px',fontWeight:700}}>Monto</th>
                <th style={{padding:'10px 8px',fontWeight:700}}>Seña</th>
                <th style={{padding:'10px 8px',fontWeight:700}}>Comprobante</th>
                <th style={{padding:'10px 8px',fontWeight:700}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{padding: 20}}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: window.innerWidth <= 600 ? 'flex-start' : 'center',
                        justifyContent: 'center',
                        minWidth: 200,
                        width: '100%',
                      }}
                    >
                      <div
                        className="spinner"
                        style={{
                          border: '4px solid #eee',
                          borderTop: '4px solid #e91e63',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'inline-block',
                          animation: 'spin 1s linear infinite',
                          verticalAlign: 'middle',
                          margin: window.innerWidth <= 600 ? '0 0 0 0' : '0 auto',
                        }}
                      ></div>
                      <style>{`@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`}</style>
                      <div
                        style={{
                          marginTop: 8,
                          color: '#e91e63',
                          fontWeight: 600,
                          fontSize: 18,
                          textAlign: window.innerWidth <= 600 ? 'left' : 'center',
                          width: '100%',
                        }}
                      >
                        Cargando...
                      </div>
                    </div>
                  </td>
                </tr>
              ) : turnos.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{padding:20}}>
                    <div
                      style={{
                        color:'#e91e63',
                        fontWeight:600,
                        fontSize:18,
                        textAlign:'left',
                        minWidth:200,
                        width:'100%',
                        paddingLeft:4,
                        boxSizing:'border-box',
                        whiteSpace:'normal',
                        wordBreak:'break-word',
                      }}
                    >
                      No hay turnos pendientes
                    </div>
                  </td>
                </tr>
              ) : (
                turnos.map(turno => {
                    const url = turno.comprobanteTransferencia
                      ? (turno.comprobanteTransferencia.startsWith('http')
                        ? turno.comprobanteTransferencia
                        : `${API_BASE_URL.replace(/\/api$/, '')}/uploads/comprobantes/${turno.comprobanteTransferencia}`)
                      : null;
                    return (
                    <tr key={turno._id || turno.id} style={{borderBottom:'1px solid #f8bbd0'}}>
                      <td style={{padding:'10px 8px',fontWeight:500}}>
                        {turno.usuario?.nombre || turno.nombre || '-'}
                        {turno.titularTransferencia ? (
                          <span style={{display:'block',fontWeight:400,fontSize:13,color:'#888'}}>Titular: {turno.titularTransferencia}</span>
                        ) : null}
                      </td>
                      <td style={{padding:'10px 8px'}}>
                        {turno.metodoTransferencia || turno.metodoPago || '-'}
                        {turno.estado === 'cancelado' || turno.estadoTransferencia === 'rechazado' ? (
                          <span style={{display:'block',fontWeight:600,fontSize:13,color:'#e91e63'}}>Rechazado</span>
                        ) : null}
                      </td>
                      {/* <td style={{padding:'10px 8px'}}>{turno.entidad || '-'}</td> */}
                      <td style={{padding:'10px 8px'}}>
                        {(turno.fecha ? (turno.fecha.split('T')[0] || turno.fecha) : '-') + (turno.hora ? ' ' + turno.hora : '')}
                        {turno.fecha ? (
                          <span style={{display:'block',fontWeight:400,fontSize:13,color:'#888'}}>
                            {(() => {
                              const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
                              // Ajustar para zona local y evitar desfase UTC
                              let f = new Date(turno.fecha);
                              if (!isNaN(f) && turno.fecha && turno.fecha.length === 10) {
                                // Si es solo fecha (YYYY-MM-DD), usar Date.UTC para evitar desfase de zona horaria
                                const [y, m, d] = turno.fecha.split('-');
                                f = new Date(Date.UTC(Number(y), Number(m)-1, Number(d)));
                              }
                              // Ajustar el día para la zona local
                              return !isNaN(f) ? dias[f.getUTCDay()] : '';
                            })()}
                          </span>
                        ) : null}
                      </td>
                      <td style={{padding:'10px 8px'}}>{turno.servicio?.nombre || turno.servicioNombre || '-'}</td>
                      <td style={{padding:'10px 8px',fontWeight:600,color:'#388e3c'}}>{turno.montoTotal ? `$${turno.montoTotal}` : '-'}</td>
                      <td style={{padding:'10px 8px',fontWeight:600,color:'#e91e63'}}>
                        {turno.montoTotal ? `$${Number.isInteger(turno.montoTotal/2) ? (turno.montoTotal/2) : (turno.montoTotal/2).toFixed(2)}` : '-'}
                      </td>
                      <td style={{padding:'10px 8px'}}>
                        {url ? (
                          <button
                            onClick={()=>{setComprobanteUrl(url); setComprobanteLoading(true);}}
                            style={{color:'#e91e63',textDecoration:'underline',fontWeight:600,background:'none',border:'none',cursor:'pointer',fontSize:16}}
                          >
                            Ver
                          </button>
                        ) : <span style={{color:'#888'}}>-</span>}
                      </td>
                      <td style={{padding:'10px 8px',display:'flex',gap:10,justifyContent:'center',alignItems:'center'}}>
                        <button
                          style={{
                            background:'#fff',
                            color:'#388e3c',
                            border:'2px solid #388e3c',
                            borderRadius: '50%',
                            width: 44,
                            height: 44,
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontWeight:700,
                            fontSize:26,
                            cursor: accionLoadingId === (turno._id || turno.id) ? 'not-allowed' : 'pointer',
                            boxShadow:'0 2px 8px #388e3c22',
                            transition:'all 0.18s',
                            outline:'none',
                            opacity: accionLoadingId === (turno._id || turno.id) ? 0.6 : 1
                          }}
                          onClick={() => handleAccion(turno._id || turno.id, 'confirmar')}
                          onMouseOver={e=>{if(accionLoadingId !== (turno._id || turno.id)){e.currentTarget.style.background='#388e3c';e.currentTarget.style.color='#fff';}}}
                          onMouseOut={e=>{if(accionLoadingId !== (turno._id || turno.id)){e.currentTarget.style.background='#fff';e.currentTarget.style.color='#388e3c';}}}
                          title="Confirmar"
                          disabled={accionLoadingId === (turno._id || turno.id)}
                        >
                          {accionLoadingId === (turno._id || turno.id) ? (
                            <span className="spinner" style={{border:'3px solid #eee',borderTop:'3px solid #388e3c',borderRadius:'50%',width:22,height:22,display:'inline-block',animation:'spin 1s linear infinite'}}></span>
                          ) : '✔'}
                        </button>
                        <button
                          style={{
                            background:'#fff',
                            color:'#e91e63',
                            border:'2px solid #e91e63',
                            borderRadius: '50%',
                            width: 44,
                            height: 44,
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontWeight:700,
                            fontSize:26,
                            cursor: accionLoadingId === (turno._id || turno.id) ? 'not-allowed' : 'pointer',
                            boxShadow:'0 2px 8px #e91e6322',
                            transition:'all 0.18s',
                            outline:'none',
                            opacity: accionLoadingId === (turno._id || turno.id) ? 0.6 : 1
                          }}
                          onClick={() => handleAccion(turno._id || turno.id, 'rechazar')}
                          onMouseOver={e=>{if(accionLoadingId !== (turno._id || turno.id)){e.currentTarget.style.background='#e91e63';e.currentTarget.style.color='#fff';}}}
                          onMouseOut={e=>{if(accionLoadingId !== (turno._id || turno.id)){e.currentTarget.style.background='#fff';e.currentTarget.style.color='#e91e63';}}}
                          title="Rechazar"
                          disabled={accionLoadingId === (turno._id || turno.id)}
                        >
                          {accionLoadingId === (turno._id || turno.id) ? (
                            <span className="spinner" style={{border:'3px solid #eee',borderTop:'3px solid #e91e63',borderRadius:'50%',width:22,height:22,display:'inline-block',animation:'spin 1s linear infinite'}}></span>
                          ) : '✖'}
                        </button>
                        <style>{`@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`}</style>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        
        </>} 
      </div>
    </div>
  );
};

export default TurnosTransferenciaModal;
