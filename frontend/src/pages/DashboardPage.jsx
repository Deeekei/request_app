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

// Добавляем список объектов для фильтра
const objectOptions = [
  { value: '', label: 'Все объекты' },
  { value: 'ЖК "Аурика"', label: 'ЖК "Аурика"' },
  { value: 'ЖК "Аурум"', label: 'ЖК "Аурум"' },
  { value: 'ЖК "Максимус"', label: 'ЖК "Максимус"' },
  { value: 'Административно-деловой центр', label: 'Административно-деловой центр' },
  { value: 'Жилой дом в г. Лермонтов', label: 'Жилой дом в г. Лермонтов' },
  { value: 'Комплекс производственных зданий в д. Карпово', label: 'Комплекс производственных зданий в д. Карпово' },
  { value: 'Фитнесс-центр с бассейном в ЖК Старый Центр', label: 'Фитнесс-центр с бассейном в ЖК Старый Центр' },
  { value: 'Туристический центр по ул. Менделеева', label: 'Туристический центр по ул. Менделеева' },
  { value: 'Вертолетный центр (Хелипорт)', label: 'Вертолетный центр (Хелипорт)' },
  { value: 'МБУ ДО СШОР №33', label: 'МБУ ДО СШОР №33' },
  { value: 'Объект культурного наследия по ул. М. Карима, 3', label: 'Объект культурного наследия по ул. М. Карима, 3' },
  { value: 'Приют человека', label: 'Приют человека' },
  { value: 'ЖК "Свобода"', label: 'ЖК "Свобода"' },
  { value: 'ЖК "Старый центр"', label: 'ЖК "Старый центр"' },
  { value: 'Комплекс МКД с.Михайловка', label: 'Комплекс МКД с.Михайловка' },
  { value: 'ППТ квартала по ул. Менделеева ', label: 'ППТ квартала по ул. Менделеева' },
  { value: 'Комплекс МКД в с. Молочное', label: 'Комплекс МКД в с. Молочное' },
  { value: 'Апартаменты в г. Евпатория', label: 'Апартаменты в г. Евпатория' },
  { value: 'КРТ Д.Атаевка', label: 'КРТ Д.Атаевка' },
  { value: 'КРТ п. Базилевка,', label: 'КРТ п. Базилевка' },
];

export function DashboardPage() {
  const { token, user } = useAuth();
  const normalizedRole = normalizeRole(user?.role);

  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ status: '', request_id: '', object: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    async function loadRequests() {
      try {
        // Поиск по конкретному ID
        if (filters.request_id) {
          const request = await requestApi.getById(token, filters.request_id);
          const matchesStatus = !filters.status || normalizeEnum(request.status).toLowerCase() === filters.status.toLowerCase();
          const matchesObject = !filters.object || normalizeEnum(request.object) === filters.object;
          if (!cancelled) setRequests(matchesStatus && matchesObject ? [request] : []);
          return;
        }

        // Общий список (теперь без ограничений по user_id)
        const data = await requestApi.list(token, {
          status: filters.status || undefined,
          object: filters.object || undefined,
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
  }, [filters.request_id, filters.status, filters.object, token]);

  const draftCount = useMemo(
    () => requests.filter((item) => String(item.status?.value || item.status).includes('черновик')).length,
    [requests],
  );

  return (
    <section className="page-section">
      <PageHeader
        title="Все заявки"
        subtitle="Просмотр и поиск заявок по статусу, объекту и ID."
        actions={
          normalizedRole !== 'снабжение' ? (
            <Link className="button primary" to="/requests/new">Создать заявку</Link>
          ) : null
        }
      />

      <div className="details-card compact filters-bar">
        {/* Фильтр по статусу */}
        <div className="field">
          <label>Статус</label>
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            {statuses.map((status) => (
              <option key={status || 'all'} value={status}>{status || 'Все статусы'}</option>
            ))}
          </select>
        </div>

        {/* Фильтр по объекту */}
        <div className="field">
          <label>Объект</label>
          <select value={filters.object} onChange={(e) => setFilters((prev) => ({ ...prev, object: e.target.value }))}>
            {objectOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Поиск по ID (теперь доступен всем) */}
        <div className="field">
          <label>ID заявки</label>
          <input
            value={filters.request_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, request_id: e.target.value.replace(/[^0-9]/g, '') }))}
            placeholder="Например, 15"
          />
        </div>

        <div className="summary-box">
          <span>Всего</span>
          <strong>{requests.length}</strong>
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