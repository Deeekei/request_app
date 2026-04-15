import { useEffect, useState } from 'react';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { RequestCard } from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';

export function PendingPage({ title, subtitle, roleKey }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    requestApi.pending(token, roleKey)
      .then((data) => {
        if (cancelled) return;
        setItems(data.requests || []);
        setCount(data.count || 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roleKey, token]);

  return (
    <section className="page-section">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="details-card compact">
        <div className="summary-box big">
          <span>Заявок на проверке</span>
          <strong>{count}</strong>
        </div>
      </div>
      {error ? <Alert type="error">{error}</Alert> : null}
      {isLoading ? <div className="empty-box">Загрузка заявок...</div> : null}
      {!isLoading && !items.length ? <div className="empty-box">Нет заявок для проверки.</div> : null}
      <div className="stack-list">
        {items.map((request) => <RequestCard key={request.id} request={request} />)}
      </div>
    </section>
  );
}
