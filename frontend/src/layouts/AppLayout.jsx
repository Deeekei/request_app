import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import { normalizeRole } from '../utils/formatters';

function SidebarLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      end
    >
      {children}
    </NavLink>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const normalizedRole = normalizeRole(user?.role);

  const roleLinks = {
    пто: [<SidebarLink key="pto" to="/pto-review">На проверке у ПТО</SidebarLink>],
    директор: [<SidebarLink key="director" to="/director-review">На проверке у Директора АСБ</SidebarLink>],
    заказчик: [<SidebarLink key="customer" to="/customer-review">На проверке у Заказчика</SidebarLink>],
    исполнитель: [<SidebarLink key="approved" to="/approved-requests">Согласованные заявки</SidebarLink>],
    администратор: [
      <SidebarLink key="pto" to="/pto-review">На проверке у ПТО</SidebarLink>,
      <SidebarLink key="director" to="/director-review">На проверке у Директора АСБ</SidebarLink>,
      <SidebarLink key="customer" to="/customer-review">На проверке у Заказчика</SidebarLink>,
      <SidebarLink key="approved" to="/approved-requests">Согласованные заявки</SidebarLink>,
    ],
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
            <img
                src={logo}
                alt="АСБ"
                style={{
                    width: '109%',
                    maxWidth: '800px',
                    margin: '0 auto',
                    display: 'block',
                    borderRadius: '8px'
                }}
            />
        </div>

        <div className="profile-card">
          <span className="profile-card__label">Пользователь</span>
          <strong>{user?.full_name || user?.username || '—'}</strong>
          <span className="profile-card__sub">Роль: {user?.role || '—'}</span>
        </div>

        <nav className="sidebar-nav">
          <SidebarLink to="/requests">{normalizedRole === 'пользователь' ? 'Мои заявки' : 'Все заявки'}</SidebarLink>
          <SidebarLink to="/requests/new">Создать заявку</SidebarLink>
          <SidebarLink to="/profile">Профиль</SidebarLink>
          {roleLinks[normalizedRole]?.map((link) => link) || null}
        </nav>

        <button
          className="button secondary sidebar-logout"
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Выйти
        </button>
      </aside>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
