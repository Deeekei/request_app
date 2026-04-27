import { apiRequest, buildAuthHeaders } from './client';

export const pushApi = {
  getPublicKey(token) {
    return apiRequest('/push/public-key', {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  listMySubscriptions(token) {
    return apiRequest('/push/me', {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  subscribe(token, subscription, deviceLabel = null) {
    return apiRequest('/push/subscribe', {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        ...subscription,
        device_label: deviceLabel,
      }),
    });
  },

  unsubscribe(token, subscription) {
    return apiRequest('/push/unsubscribe', {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(subscription),
    });
  },

  test(token, payload) {
    return apiRequest('/push/test', {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    });
  },
};
