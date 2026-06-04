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

  const closeMenu = () => setIsMenuOpen(false);

  // === БЕЗОПАСНАЯ И ТОЧНАЯ ПРОВЕРКА РОЛЕЙ ===
  const normalizedRole = normalizeRole(user?.role)?.toLowerCase() || '';
  const rawRole = user?.role ? String(user.role).toUpperCase() : '';

  const isUser = ['пользователь', 'user'].includes(normalizedRole) || rawRole === 'USER';
  const isProcurement = ['снабжение', 'procurement'].includes(normalizedRole) || rawRole === 'PROCUREMENT';
  const isExecutor = ['исполнитель', 'executor'].includes(normalizedRole) || rawRole === 'EXECUTOR';
  const isAdmin = ['администратор', 'admin'].includes(normalizedRole) || rawRole === 'ADMIN';
  const isPto = ['пто', 'pto'].includes(normalizedRole) || rawRole === 'PTO';
  const isDirector = ['директор', 'director'].includes(normalizedRole) || rawRole === 'DIRECTOR';
  const isCustomer = ['заказчик', 'customer'].includes(normalizedRole) || rawRole === 'CUSTOMER';

  const pageTitles = {
    '/requests': isUser ? 'Мои заявки' : 'Все заявки',
    '/requests/new': 'Создать заявку',
    '/profile': 'Профиль',
    '/pto-review': 'На проверке у ПТО',
    '/director-review': 'На проверке у Директора АСБ',
    '/customer-review': 'На проверке у Заказчика',
    '/approved-requests': 'Согласованные заявки',
    '/completed-requests': 'Исполненные заявки',
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
          <SidebarLink to="/requests" onClick={closeMenu}>
            {isUser ? 'Мои заявки' : 'Все заявки'}
          </SidebarLink>

          {/* Скрываем кнопку "Создать заявку" для снабжения */}
          {!isProcurement && (
            <SidebarLink to="/requests/new" onClick={closeMenu}>Создать заявку</SidebarLink>
          )}

          <SidebarLink to="/profile" onClick={closeMenu}>Профиль</SidebarLink>

          {/* === ВЫВОД ВКЛАДОК НА ОСНОВЕ РОЛЕЙ === */}
          {(isPto || isAdmin) && (
            <SidebarLink to="/pto-review" onClick={closeMenu}>На проверке у ПТО</SidebarLink>
          )}

          {(isDirector || isAdmin) && (
            <SidebarLink to="/director-review" onClick={closeMenu}>На проверке у Директора АСБ</SidebarLink>
          )}

          {(isCustomer || isAdmin) && (
            <SidebarLink to="/customer-review" onClick={closeMenu}>На проверке у Заказчика</SidebarLink>
          )}

          {/* Эти вкладки увидят Исполнитель, Снабжение и Администратор */}
          {(isExecutor || isProcurement || isAdmin) && (
            <>
              <SidebarLink to="/approved-requests" onClick={closeMenu}>Согласованные заявки</SidebarLink>
              <SidebarLink to="/completed-requests" onClick={closeMenu}>Исполненные заявки</SidebarLink>
            </>
          )}
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