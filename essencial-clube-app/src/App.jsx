import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute, PublicRoute, RoleRoute } from './components/PrivateRoute';
import MainLayout from './components/Layout/MainLayout';

// Páginas públicas
import Login from './pages/Login';

// Páginas do Cliente
import Dashboard from './pages/Dashboard';
import Premios from './pages/Premios';
import Indicar from './pages/Indicar';
import Perfil from './pages/Perfil';

// Páginas do Parceiro
import ParceiroHome from './pages/Parceiro/ParceiroHome';
import LancarPontos from './pages/Parceiro/LancarPontos';
import Historico from './pages/Parceiro/Historico';

// Páginas do Admin
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsuarios from './pages/Admin/AdminUsuarios';
import AdminResgates from './pages/Admin/AdminResgates';
import AdminParceiros from './pages/Admin/AdminParceiros';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Redirect raiz */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rotas do Cliente */}
          <Route
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/premios" element={<Premios />} />
            <Route path="/indicar" element={<Indicar />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/extrato" element={<Dashboard />} /> {/* TODO: criar página */}
          </Route>

          {/* Rotas do Parceiro */}
          <Route
            element={
              <RoleRoute allowedRoles={['parceiro', 'admin']}>
                <MainLayout />
              </RoleRoute>
            }
          >
            <Route path="/parceiro" element={<ParceiroHome />} />
            <Route path="/parceiro/lancar" element={<LancarPontos />} />
            <Route path="/parceiro/historico" element={<Historico />} />
          </Route>

          {/* Rotas do Admin */}
          <Route
            element={
              <RoleRoute allowedRoles={['admin']}>
                <MainLayout />
              </RoleRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/resgates" element={<AdminResgates />} />
            <Route path="/admin/parceiros" element={<AdminParceiros />} />
          </Route>

          {/* Rota de indicação (pública) */}
          <Route path="/i/:code" element={<Navigate to="/login" replace />} /> {/* TODO: implementar */}

          {/* 404 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
