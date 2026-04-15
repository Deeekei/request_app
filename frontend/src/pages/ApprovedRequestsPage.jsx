import { useEffect, useMemo, useState } from 'react';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { RequestCard } from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';

export function ApprovedRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    requestApi
      .list(token, { status: 'согласовано' })
      .then((data) => {
        if (!cancelled) setRequests(Array.isArray(data) ? data : []);
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
  }, [token]);

  const overdraftCount = useMemo(
    () => requests.filter((request) => Array.isArray(request.materials)
      && request.materials.some((item) => Boolean(item.overdraft ?? item.will_overdraft))).length,
    [requests],
  );

  return (
    <section className="page-section">
      <PageHeader
        title="Согласованные заявки"
        subtitle="Заявки, по которым можно скачать итоговый Excel-файл."
      />

      <div className="details-card compact filters-bar">
        <div className="summary-box">
          <span>Всего согласовано</span>
          <strong>{requests.length}</strong>
        </div>
        <div className="summary-box">
          <span>С перерасходом</span>
          <strong>{overdraftCount}</strong>
        </div>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}
      {isLoading ? <div className="empty-box">Загрузка согласованных заявок...</div> : null}
      {!isLoading && !requests.length ? <div className="empty-box">Согласованных заявок пока нет.</div> : null}

      <div className="stack-list">
        {requests.map((request) => <RequestCard key={request.id} request={request} />)}
      </div>
    </section>
  );
}
