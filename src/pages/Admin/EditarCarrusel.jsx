import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './EditarCarrusel.css';

import { API_BASE_URL } from '../../config/apiBaseUrl.js';



// API real usando backend Express
const API_URL = `${API_BASE_URL}/carrusel`;

const api = {
  getImages: async () => {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('No se pudo obtener el carrusel');
    const data = await res.json();
    return Array.isArray(data.imagenes) ? data.imagenes : [];
  },
  saveImages: async (images) => {
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagenes: images })
    });
    if (!res.ok) throw new Error('No se pudo guardar el carrusel');
    const data = await res.json();
    return Array.isArray(data.imagenes) ? data.imagenes : [];
  },
};

const EditarCarrusel = () => {
  const [imagenes, setImagenes] = useState([]);
  const [nuevaUrl, setNuevaUrl] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarImagenes();
  }, []);

  const cargarImagenes = async () => {
    setCargando(true);
    try {
      const imgs = await api.getImages();
      setImagenes(imgs);
    } catch (err) {
      setImagenes([]);
    } finally {
      setCargando(false);
    }
  };

  const handleAgregarUrl = async (e) => {
    e.preventDefault();
    if (!nuevaUrl.trim()) return;
    if (imagenes.length >= 4) {
      setError('Solo puedes tener hasta 4 imágenes en el carrusel.');
      return;
    }
    setImagenes([...imagenes, nuevaUrl.trim()]);
    setNuevaUrl('');
    setError('');
    await api.saveImages([...imagenes, nuevaUrl.trim()]);
  };

  const handleEliminar = async (idx) => {
    const result = await Swal.fire({
      title: '¿Seguro que querés quitar la imagen?'
      , text: 'Esta acción no se puede deshacer.'
      , icon: 'warning'
      , showCancelButton: true
      , confirmButtonText: 'Sí, borrar'
      , cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    const nuevas = imagenes.filter((_, i) => i !== idx);
    setImagenes(nuevas);
    await api.saveImages(nuevas);
  };

  const handleArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (imagenes.length >= 4) {
      setError('Solo puedes tener hasta 4 imágenes en el carrusel.');
      return;
    }
    if (file.size > 1024 * 1024) { // 1MB
      setError('La imagen es demasiado grande. Elige una de menos de 1MB.');
      return;
    }
    setSubiendo(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await api.saveImages([...imagenes, reader.result]);
          await cargarImagenes(); // recarga desde backend para asegurar persistencia
        } catch (err) {
          setError('Error al guardar la imagen en el servidor');
        } finally {
          setSubiendo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error al subir la imagen');
      setSubiendo(false);
    }
  };

  return (
    <div className="editar-carrusel-admin">
      <h2>Editar Carrusel</h2>
      <div className="imagenes-carrusel-lista">
        {cargando && (
          <div className="carrusel-cargando">
            <span className="carrusel-spinner" />
            <span className="carrusel-cargando-texto">Cargando imágenes...</span>
          </div>
        )}
        {imagenes.map((img, idx) => (
          <div key={idx} className="img-carrusel-item">
            <img src={img} alt="carrusel" />
            <button onClick={() => handleEliminar(idx)} title="Eliminar">🗑️</button>
          </div>
        ))}
        {!cargando && imagenes.length === 0 && <p>No hay imágenes en el carrusel.</p>}
      </div>
      <form className="form-carrusel-admin" onSubmit={handleAgregarUrl}>
        <input
          type="text"
          placeholder="Pega aquí la URL de la imagen..."
          value={nuevaUrl}
          onChange={e => setNuevaUrl(e.target.value)}
          disabled={imagenes.length >= 4}
        />
        <button type="submit" disabled={imagenes.length >= 4}>Agregar por URL</button>
      </form>
      <div className="subir-carrusel-admin">
        <label className="btn-subir-carrusel">
          Subir imagen
          <input type="file" accept="image/*" style={{display:'none'}} onChange={handleArchivo} disabled={subiendo || imagenes.length >= 4} />
        </label>
        {subiendo && <span className="subiendo-carrusel">Subiendo...</span>}
      </div>
      {error && <div className="error-carrusel">{error}</div>}
      <p style={{marginTop:18, color:'#888', fontSize:13}}>
        Puedes agregar imágenes pegando un link o subiendo desde tu computadora.<br/>
        (En producción, las imágenes subidas deberían guardarse en el servidor o en un servicio como Cloudinary o Firebase Storage.)
      </p>
    </div>
  );
};

export default EditarCarrusel;
