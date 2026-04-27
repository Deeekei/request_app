import { useEffect, useState } from 'react';
import { Alert } from './Alert';
import {
  isPushSupported,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from '../push/pushService';
import { useAuth } from '../context/AuthContext';

export function PushSettings() {
  const { token, isAuthenticated } = useAuth();

  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      try {
        const support = isPushSupported();
        if (!mounted) return;

        setSupported(support);

        if (!support || !isAuthenticated) return;

        const currentSubscription = await getCurrentSubscription();
        if (!mounted) return;

        setSubscribed(Boolean(currentSubscription));
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Не удалось проверить статус уведомлений');
        }
      }
    }

    loadState();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  async function handleEnable() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await subscribeToPush(token, 'Основное устройство');
      setSubscribed(true);
      setMessage('Push-уведомления успешно включены.');
    } catch (err) {
      setError(err.message || 'Не удалось включить уведомления');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await unsubscribeFromPush(token);
      setSubscribed(false);
      setMessage('Push-уведомления отключены.');
    } catch (err) {
      setError(err.message || 'Не удалось отключить уведомления');
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await sendTestPush(token);
      setMessage(`Тестовое уведомление отправлено. Успешных отправок: ${result.sent}`);
    } catch (err) {
      setError(err.message || 'Не удалось отправить тестовое уведомление');
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!supported) {
    return (
      <div className="details-card compact">
        <h3>Push-уведомления</h3>
        <p>Этот браузер не поддерживает push-уведомления.</p>
      </div>
    );
  }

  return (
    <div className="details-card compact">
      <div className="section-title-row">
        <div>
          <h2>Push-уведомления</h2>
          <p>{subscribed ? 'Уведомления включены для этого браузера.' : 'Уведомления пока выключены.'}</p>
        </div>
      </div>

      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="actions-row" style={{ marginTop: 16 }}>
        {!subscribed ? (
          <button type="button" className="button primary" onClick={handleEnable} disabled={loading}>
            Включить уведомления
          </button>
        ) : (
          <>
            <button type="button" className="button secondary" onClick={handleDisable} disabled={loading}>
              Отключить уведомления
            </button>
            <button type="button" className="button primary" onClick={handleTest} disabled={loading}>
              Отправить тест
            </button>
          </>
        )}
      </div>
    </div>
  );
}
