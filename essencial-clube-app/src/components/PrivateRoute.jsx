import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Componente de loading
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-muted">Carregando...</p>
      </div>
    </div>
  );
}

// Rota protegida - requer autenticação
export function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Rota para tipo específico de usuário
export function RoleRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user?.tipo)) {
    // Redireciona para a página correta baseado no tipo
    const redirectPath = getRedirectPath(user?.tipo);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

// Rota pública (redireciona se já autenticado)
export function PublicRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    const redirectPath = getRedirectPath(user?.tipo);
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

// Helper para determinar rota baseada no tipo de usuário
function getRedirectPath(tipo) {
  switch (tipo) {
    case 'admin':
      return '/admin';
    case 'parceiro':
      return '/parceiro';
    case 'embaixador':
      return '/embaixador';
    case 'cliente':
    default:
      return '/dashboard';
  }
}

export default PrivateRoute;
