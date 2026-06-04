import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { RequestFormPage } from './pages/RequestFormPage';
import { RequestDetailsPage } from './pages/RequestDetailsPage';
import { PendingPage } from './pages/PendingPage';
import { ApprovedRequestsPage } from './pages/ApprovedRequestsPage';
import { CompletedRequestsPage } from './pages/CompletedRequestsPage'; // <-- ДОБАВЛЕН ИМПОРТ НОВОЙ СТРАНИЦЫ
import { normalizeRole } from './utils/formatters';

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(user?.role);

  if (role === 'пто') return <Navigate to="/pto-review" replace />;
  if (role === 'директор') return <Navigate to="/director-review" replace />;
  if (role === 'заказчик') return <Navigate to="/customer-review" replace />;

  // Автоматический редирект для снабжения на согласованные заявки
  if (role === 'снабжение') return <Navigate to="/approved-requests" replace />;

  return <Navigate to="/requests" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/requests" element={<DashboardPage />} />
        <Route path="/requests/new" element={<RequestFormPage mode="create" />} />
        <Route path="/requests/:requestId" element={<RequestDetailsPage />} />
        <Route path="/requests/:requestId/edit" element={<RequestFormPage mode="edit" />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route
          path="/approved-requests"
          element={
            <RoleRoute allowedRoles={['исполнитель', 'администратор', 'снабжение']}>
              <ApprovedRequestsPage />
            </RoleRoute>
          }
        />

        {/* <-- ИСПОЛЬЗУЕМ НАШ НОВЫЙ ФАЙЛ ЗДЕСЬ --> */}
        <Route
          path="/completed-requests"
          element={
            <RoleRoute allowedRoles={['исполнитель', 'администратор', 'снабжение']}>
              <CompletedRequestsPage />
            </RoleRoute>
          }
        />

        <Route
          path="/pto-review"
          element={
            <RoleRoute allowedRole="ПТО">
              <PendingPage
                title="На проверке у ПТО"
                subtitle="Заявки, ожидающие проверки ПТО."
                roleKey="pto"
              />
            </RoleRoute>
          }
        />
        <Route
          path="/director-review"
          element={
            <RoleRoute allowedRole="директор">
              <PendingPage
                title="На проверке у Директора АСБ"
                subtitle="Заявки, ожидающие решения Директора АСБ."
                roleKey="director"
              />
            </RoleRoute>
          }
        />
        <Route
          path="/customer-review"
          element={
            <RoleRoute allowedRole="заказчик">
              <PendingPage
                title="На проверке у Руководителя проекта"
                subtitle="Заявки, ожидающие решения заказчика."
                roleKey="customer"
              />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}