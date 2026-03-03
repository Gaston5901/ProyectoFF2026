
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Home from './pages/Home';
import Servicios from './pages/Servicios';
import ReservarTurno from './pages/ReservarTurno';
import Login from './pages/Login';
import Register from './pages/Register';
import MisTurnos from './pages/MisTurnos';
import Carrito from './pages/Carrito';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminTurnos from './pages/Admin/Turnos';
import AdminEstadisticas from './pages/Admin/Estadisticas';
import PanelTrabajo from './pages/Admin/PanelTrabajo';
import Historial from './pages/Admin/Historial';
import ServiciosAdmin from './pages/Admin/ServiciosAdmin';
import EditarCarrusel from './pages/Admin/EditarCarrusel';
import EditarHorariosAdmin from './pages/Admin/EditarHorariosAdmin';
import UsuariosAdmin from './pages/Admin/UsuariosAdmin';
import RecuperarPassword from './pages/RecuperarPassword';
import PagoExitoso from './pages/PagoExitoso';
import PagoFallido from './pages/PagoFallido';
import PagoPendiente from './pages/PagoPendiente';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Nosotros from './pages/Nosotros'; 

function App() {
  return (
    <Router>
      <AuthProvider>
          <div className="app">
            <Navbar />
            <main style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '80px' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/servicios" element={<Servicios />} />
                <Route path="/reservar" element={<ReservarTurno />} />
                <Route path="/login" element={<Login />} />
                <Route path="/recuperar" element={<RecuperarPassword />} />
                <Route path="/register" element={<Register />} />
                <Route path="/pago-exitoso" element={<PagoExitoso />} />
                <Route path="/pago-fallido" element={<PagoFallido />} />
                <Route path="/pago-pendiente" element={<PagoPendiente />} />
                <Route
                  path="/mis-turnos"
                  element={
                    <ProtectedRoute>
                      <MisTurnos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/carrito"
                  element={
                    <ProtectedRoute>
                      <Carrito />
                    </ProtectedRoute>
                  }
                />
                <Route
                   path="/admin/panel"
                   element={
                     <ProtectedRoute adminOnly>
                       <AdminDashboard />
                     </ProtectedRoute>
                   }
                 />
                 <Route
                   path="/admin/panel-trabajo"
                   element={
                     <ProtectedRoute adminOnly>
                       <PanelTrabajo />
                     </ProtectedRoute>
                   }
                 />
                <Route
                  path="/admin/historial"
                  element={
                    <ProtectedRoute adminOnly>
                      <Historial />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/servicios-admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <ServiciosAdmin />
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/admin/editar-carrusel"
                  element={
                    <ProtectedRoute adminOnly>
                      <EditarCarrusel />
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/admin/editar-horarios"
                  element={
                    <ProtectedRoute adminOnly>
                      <EditarHorariosAdmin />
                    </ProtectedRoute>
                  }
                />


                <Route
                  path="/admin/usuarios"
                  element={
                    <ProtectedRoute adminOnly>
                      <UsuariosAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/turnos"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminTurnos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/estadisticas"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminEstadisticas />
                    </ProtectedRoute>
                  }
                />
                <Route path="/nosotros" element={<Nosotros />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
            <Footer />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
      </AuthProvider>
    </Router>
  );
}


export default App;
