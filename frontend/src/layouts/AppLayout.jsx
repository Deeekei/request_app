import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import { normalizeRole } from '../utils/formatters';

function SidebarLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      onClick={onClick}
      end
    >
      {children}
    </NavLink>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const normalizedRole = normalizeRole(user?.role);
  const closeMenu = () => setIsMenuOpen(false);

  const roleLinks = {
    пто: [<SidebarLink key="pto" to="/pto-review" onClick={closeMenu}>На проверке у ПТО</SidebarLink>],
    директор: [<SidebarLink key="director" to="/director-review" onClick={closeMenu}>На проверке у Директора АСБ</SidebarLink>],
    заказчик: [<SidebarLink key="customer" to="/customer-review" onClick={closeMenu}>На проверке у Заказчика</SidebarLink>],
    исполнитель: [<SidebarLink key="approved" to="/approved-requests" onClick={closeMenu}>Согласованные заявки</SidebarLink>],
    администратор: [
      <SidebarLink key="pto" to="/pto-review" onClick={closeMenu}>На проверке у ПТО</SidebarLink>,
      <SidebarLink key="director" to="/director-review" onClick={closeMenu}>На проверке у Директора АСБ</SidebarLink>,
      <SidebarLink key="customer" to="/customer-review" onClick={closeMenu}>На проверке у Руководителя проекта</SidebarLink>,
      <SidebarLink key="approved" to="/approved-requests" onClick={closeMenu}>Согласованные заявки</SidebarLink>,
    ],
  };

  const pageTitles = {
    '/requests': normalizedRole === 'пользователь' ? 'Мои заявки' : 'Все заявки',
    '/requests/new': 'Создать заявку',
    '/profile': 'Профиль',
    '/pto-review': 'На проверке у ПТО',
    '/director-review': 'На проверке у Директора АСБ',
    '/customer-review': 'На проверке у Заказчика',
    '/approved-requests': 'Согласованные заявки',
  };

  const currentTitle = pageTitles[location.pathname] || 'Система заявок';

  return (
    <div className={`app-shell${isMenuOpen ? ' menu-open' : ''}`}>
      <div className="mobile-topbar">
        <button
          className="burger-button"
          type="button"
          aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <div>
          <strong>{currentTitle}</strong>
          <span>{user?.full_name || user?.username || '—'}</span>
        </div>
      </div>

      {isMenuOpen ? <button className="sidebar-backdrop" type="button" aria-label="Закрыть меню" onClick={closeMenu} /> : null}

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
          <SidebarLink to="/requests" onClick={closeMenu}>{normalizedRole === 'пользователь' ? 'Мои заявки' : 'Все заявки'}</SidebarLink>
          <SidebarLink to="/requests/new" onClick={closeMenu}>Создать заявку</SidebarLink>
          <SidebarLink to="/profile" onClick={closeMenu}>Профиль</SidebarLink>
          {roleLinks[normalizedRole]?.map((link) => link) || null}
        </nav>

        <button
          className="button secondary sidebar-logout"
          type="button"
          onClick={() => {
            closeMenu();
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
