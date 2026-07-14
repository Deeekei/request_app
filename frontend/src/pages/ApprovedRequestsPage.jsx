import { useEffect, useState, useMemo } from 'react';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { RequestCard } from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';

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
  { value: 'ППТ квартала по ул. Менделеева', label: 'ППТ квартала по ул. Менделеева' },
  { value: 'Комплекс МКД в с. Молочное', label: 'Комплекс МКД в с. Молочное' },
  { value: 'Апартаменты в г. Евпатория', label: 'Апартаменты в г. Евпатория' },
  { value: 'КРТ Д.Атаевка', label: 'КРТ Д.Атаевка' },
  { value: 'КРТ п. Базилевка', label: 'КРТ п. Базилевка' },
];

export function ApprovedRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedObject, setSelectedObject] = useState('');

  // ИЗМЕНЕНО: Теперь по умолчанию стоит сортировка 'default' (Сначала новые)
  const [sortOrder, setSortOrder] = useState('default');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        setIsLoading(true);
        setError('');

        const data = await requestApi.list(token, {
          status: 'согласовано',
          object: selectedObject || undefined
        });
        if (!cancelled) setRequests(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRequests();
    return () => {
      cancelled = true;
    };
  }, [token, selectedObject]);

  const sortedRequests = useMemo(() => {
    const arr = [...requests];

    if (sortOrder === 'date_asc') {
      return arr.sort((a, b) => {
        if (!a.real_delivery_date) return 1;
        if (!b.real_delivery_date) return -1;
        return new Date(a.real_delivery_date) - new Date(b.real_delivery_date);
      });
    }

    if (sortOrder === 'date_desc') {
      return arr.sort((a, b) => {
        if (!a.real_delivery_date) return 1;
        if (!b.real_delivery_date) return -1;
        return new Date(b.real_delivery_date) - new Date(a.real_delivery_date);
      });
    }

    // По умолчанию возвращаем массив так, как его отдал бэкенд (обычно сортировка по ID убыванию)
    return arr;
  }, [requests, sortOrder]);

  return (
    <section className="page-section">
      <PageHeader
        title="Согласованные заявки"
        subtitle="Заявки, которые прошли все этапы проверки и готовы к исполнению."
      />

      <div className="details-card compact filters-bar" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="field" style={{ flex: '1', minWidth: '200px' }}>
          <label>Объект</label>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value)}
          >
            {objectOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: '1', minWidth: '200px' }}>
          <label>Сортировка</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            {/* ИЗМЕНЕНО: Перенесли "Сначала новые" на самый верх */}
            <option value="default">Сначала новые</option>
            <option value="date_asc">По дате поставки (возрастание)</option>
            <option value="date_desc">По дате поставки (убывание)</option>
          </select>
        </div>

        <div className="summary-box" style={{ marginBottom: '4px' }}>
          <span>Найдено: </span>
          <strong>{requests.length}</strong>
        </div>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}
      {isLoading ? <div className="empty-box">Загрузка заявок...</div> : null}
      {!isLoading && !requests.length ? <div className="empty-box">Нет согласованных заявок по заданным критериям.</div> : null}

      <div className="stack-list">
        {sortedRequests.map((request) => <RequestCard key={request.id} request={request} />)}
      </div>
    </section>
  );
}