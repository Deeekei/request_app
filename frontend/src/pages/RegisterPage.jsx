import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', full_name: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await register(form);
      setSuccess('Пользователь создан. Теперь можно войти в систему.');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__header">
          <span className="brand-badge">АСБ</span>
          <h1>Регистрация</h1>
          <p>Создание новой учётной записи пользователя.</p>
        </div>

        {error ? <Alert type="error">{error}</Alert> : null}
        {success ? <Alert type="success">{success}</Alert> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label>Логин</label>
            <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} required />
          </div>
          <div className="field">
            <label>ФИО</label>
            <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} required />
          </div>
          <div className="field">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
          </div>

          <button className="button primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Создание...' : 'Создать учётную запись'}
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Уже есть учётная запись?</span>
          <Link to="/login">Перейти ко входу</Link>
        </div>
      </div>
    </div>
  );
}
