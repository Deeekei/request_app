import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { RequestCard } from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';
import { normalizeEnum, normalizeRole } from '../utils/formatters';

const statuses = [
  '',
  'черновик',
  'проверка ПТО',
  'проверка директором АСБ',
  'проверка заказчиком',
  'согласовано',
  'отклонено',
];

export function DashboardPage() {
  const { token, user } = useAuth();
  const normalizedRole = normalizeRole(user?.role);
  const isRegularUser = normalizedRole === 'пользователь';

  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', request_id: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    async function loadRequests() {
      try {
        if (isRegularUser) {
          const data = await requestApi.list(token, {
            status: filters.status || undefined,
            user_id: user?.id,
          });
          if (!cancelled) setRequests(data);
          return;
        }

        if (filters.request_id) {
          const request = await requestApi.getById(token, filters.request_id);
          const matchesStatus = !filters.status || normalizeEnum(request.status).toLowerCase() === filters.status.toLowerCase();
          if (!cancelled) setRequests(matchesStatus ? [request] : []);
          return;
        }

        const data = await requestApi.list(token, {
          status: filters.status || undefined,
        });
        if (!cancelled) setRequests(data);
      } catch (err) {
        if (!cancelled) {
          setRequests([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, [filters.request_id, filters.status, isRegularUser, token, user?.id]);

  const draftCount = useMemo(
    () => requests.filter((item) => String(item.status?.value || item.status).includes('черновик')).length,
    [requests],
  );

  return (
    <section className="page-section">
      <PageHeader
        title={isRegularUser ? 'Мои заявки' : 'Все заявки'}
        subtitle={isRegularUser ? 'Просмотр ваших заявок по статусам.' : 'Просмотр и поиск заявок по статусу и ID заявки.'}
        actions={
          /* Кнопка "Создать заявку" будет скрыта для роли Снабжение */
          normalizedRole !== 'снабжение' ? (
            <Link className="button primary" to="/requests/new">Создать заявку</Link>
          ) : null
        }
      />

      <div className="details-card compact filters-bar">
        <div className="field">
          <label>Статус</label>
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            {statuses.map((status) => (
              <option key={status || 'all'} value={status}>{status || 'Все статусы'}</option>
            ))}
          </select>
        </div>

        {!isRegularUser && (
          <div className="field">
            <label>ID заявки</label>
            <input
              value={filters.request_id}
              onChange={(e) => setFilters((prev) => ({ ...prev, request_id: e.target.value.replace(/[^0-9]/g, '') }))}
              placeholder="Например, 15"
            />
          </div>
        )}

        <div className="summary-box">
          <span>Всего заявок</span>
          <strong>{requests.length}</strong>
        </div>
        <div className="summary-box">
          <span>Черновики</span>
          <strong>{draftCount}</strong>
        </div>
        <div className="summary-box">
          <span>Вход выполнен как</span>
          <strong>{user?.role || '—'}</strong>
        </div>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}
      {isLoading ? <div className="empty-box">Загрузка заявок...</div> : null}
      {!isLoading && !requests.length ? <div className="empty-box">Список заявок пуст.</div> : null}

      <div className="stack-list">
        {requests.map((request) => <RequestCard key={request.id} request={request} />)}
      </div>
    </section>
  );
}