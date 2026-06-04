import { useEffect, useState } from 'react';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { PageHeader } from '../components/PageHeader';
import { RequestCard } from '../components/RequestCard';
import { useAuth } from '../context/AuthContext';

// Список объектов для фильтра
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

export function CompletedRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedObject, setSelectedObject] = useState(''); // Состояние для фильтра по объекту
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCompletedRequests() {
      try {
        setIsLoading(true);
        setError('');
        // Отправляем запрос с фильтром по статусу и объекту
        const data = await requestApi.list(token, {
          status: 'исполнено',
          object: selectedObject || undefined // Если объект не выбран, передаем undefined
        });

        if (!cancelled) {
          setRequests(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCompletedRequests();

    return () => {
      cancelled = true;
    };
  }, [token, selectedObject]); // Добавили selectedObject в зависимости

  return (
    <section className="page-section">
      <PageHeader
        title="Исполненные заявки"
        subtitle="Список заявок, которые были успешно завершены и переведены в статус «Исполнено»."
      />

      {/* Панель фильтров */}
      <div className="details-card compact filters-bar">
        <div className="field">
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
        <div className="summary-box">
          <span>Найдено</span>
          <strong>{requests.length}</strong>
        </div>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}

      {isLoading ? (
        <div className="empty-box">Загрузка заявок...</div>
      ) : null}

      {!isLoading && requests.length === 0 ? (
        <div className="empty-box">Нет исполненных заявок по заданным критериям.</div>
      ) : null}

      <div className="stack-list">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}