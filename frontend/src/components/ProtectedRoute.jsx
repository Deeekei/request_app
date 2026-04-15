import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../utils/formatters';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <div className="center-shell"><div className="loader-card">Загрузка...</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function RoleRoute({ allowedRole, allowedRoles, children }) {
  const { user } = useAuth();
  const roles = (Array.isArray(allowedRoles) && allowedRoles.length
    ? allowedRoles
    : allowedRole
      ? [allowedRole]
      : []).map((role) => normalizeRole(role));
  const userRole = normalizeRole(user?.role);

  if (!roles.includes(userRole) && userRole !== 'администратор') {
    return <Navigate to="/requests" replace />;
  }

  return children;
}
