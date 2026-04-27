import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import { PushSettings } from '../components/PushSettings';
import { formatDateTime } from '../utils/formatters';

export function ProfilePage() {
  const { refreshProfile, user } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    refreshProfile().catch((err) => {
      if (isMounted) setError(err.message);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="page-section">
      <PageHeader title="Профиль" subtitle="Информация о текущем пользователе." />
      {error ? <Alert type="error">{error}</Alert> : null}

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

      <PushSettings />
    </section>
  );
}
