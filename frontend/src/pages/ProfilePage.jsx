import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { PushSettings } from '../components/PushSettings';
import { formatDateTime } from '../utils/formatters';
import { authApi } from '../api/authApi'; // Убедитесь, что этот импорт добавлен

export function ProfilePage() {
  // Достаем token из контекста для отправки запроса смены пароля
  const { refreshProfile, user, token } = useAuth();
  const [error, setError] = useState('');

  // --- Состояния для формы смены пароля ---
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // --- Загрузка профиля при монтировании ---
  useEffect(() => {
    let isMounted = true;
    refreshProfile().catch((err) => {
      if (isMounted) setError(err.message);
    });
    return () => {
      isMounted = false;
    };
  }, [refreshProfile]);

  // --- Обработчик отправки формы смены пароля ---
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Базовая валидация на клиенте
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Новые пароли не совпадают.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать не менее 6 символов.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Отправляем запрос на бэкенд
      await authApi.changePassword(token, passwordForm.oldPassword, passwordForm.newPassword);

      setPasswordSuccess('Пароль успешно изменен.');
      // Очищаем форму после успешной смены
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Не удалось изменить пароль. Проверьте правильность текущего пароля.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <section className="page-section">
      <PageHeader title="Профиль" subtitle="Информация о текущем пользователе и настройки безопасности." />

      {/* Ошибка загрузки профиля */}
      {error ? <Alert type="error">{error}</Alert> : null}

      {/* Карточка с основной информацией */}
      <div className="details-card compact">
        <div className="details-grid">
          <div>
            <span>ФИО</span>
            <strong>{user?.full_name || '—'}</strong>
          </div>
          <div>
            <span>Логин</span>
            <strong>{user?.username || '—'}</strong>
          </div>
          <div>
            <span>Роль</span>
            <strong>{user?.role || '—'}</strong>
          </div>
          <div>
            <span>Создан</span>
            <strong>{formatDateTime(user?.created_at)}</strong>
          </div>
        </div>
      </div>

      {/* Карточка смены пароля */}
      <div className="details-card compact">
        <div className="section-title-row">
          <div>
            <h2>Сменить пароль</h2>
            <p>Убедитесь, что используете надежный пароль.</p>
          </div>
        </div>

        {/* Уведомления формы смены пароля */}
        {passwordError ? <Alert type="error">{passwordError}</Alert> : null}
        {passwordSuccess ? <Alert type="success">{passwordSuccess}</Alert> : null}

        <form className="form-grid" onSubmit={handlePasswordSubmit} style={{ marginTop: '16px' }}>
          <div className="field">
            <label>Текущий пароль</label>
            <input
              type="password"
              required
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
              placeholder="Введите текущий пароль"
              disabled={isChangingPassword}
            />
          </div>
          <div className="field">
            <label>Новый пароль</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="Минимум 6 символов"
              disabled={isChangingPassword}
            />
          </div>
          <div className="field">
            <label>Подтвердите новый пароль</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Повторите новый пароль"
              disabled={isChangingPassword}
            />
          </div>

          <div className="actions-row">
            <button className="button primary" type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? 'Сохранение...' : 'Сменить пароль'}
            </button>
          </div>
        </form>
      </div>

      {/* Настройки Push-уведомлений */}
      <PushSettings />
    </section>
  );
}