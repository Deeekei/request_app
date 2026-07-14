import { apiRequest, buildAuthHeaders } from './client';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

function review(token, path, approve, comment) {
  const query = toQuery({ approve, comment });
  return apiRequest(`${path}${query}`, {
    method: 'POST',
    headers: buildAuthHeaders(token, { json: false }),
  });
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const requestApi = {
  list(token, params) {
    return apiRequest(`/requests${toQuery(params)}`, {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  getById(token, requestId) {
    return apiRequest(`/requests/${requestId}`, {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  create(token, payload) {
    return apiRequest('/requests', {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    });
  },

  update(token, requestId, payload) {
    return apiRequest(`/requests/${requestId}`, {
      method: 'PUT',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    });
  },

  remove(token, requestId) {
    return apiRequest(`/requests/${requestId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  submit(token, requestId) {
    return apiRequest(`/requests/${requestId}/submit`, {
      method: 'POST',
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  addComment(token, requestId, body) {
    return apiRequest(`/requests/${requestId}/comments`, {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ body }),
    });
  },

  history(token, requestId) {
    return apiRequest(`/requests/${requestId}/history`, {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  getMaterialsByObject(token, object) {
    return apiRequest(`/requests/agreement-materials/${encodeURIComponent(object)}`, {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  ptoReview(token, requestId, approve, comment) {
    return review(token, `/requests/${requestId}/pto_check`, approve, comment);
  },

  directorReview(token, requestId, approve, comment) {
    return review(token, `/requests/${requestId}/director_check`, approve, comment);
  },

  customerReview(token, requestId, approve, comment) {
    return review(token, `/requests/${requestId}/customer_check`, approve, comment);
  },

  pending(token, roleKey) {
    const pathMap = {
      pto: '/requests/pto/pending',
      director: '/requests/director/pending/',
      customer: '/requests/customer/pending/',
    };

    return apiRequest(pathMap[roleKey], {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  updatePaymentStatus(token, requestId, paymentStatus) {
    return apiRequest(`/requests/${requestId}/payment-status`, {
      method: 'PATCH',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
  },


  setRealDeliveryDate(token, requestId, deliveryDate) {
    return apiRequest(`/requests/${requestId}/real-delivery-date?delivery_date=${deliveryDate}`, {
      method: 'PATCH',
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  downloadExcel(token, requestId) {
    return fetch(`${API_BASE_URL}/requests/${requestId}/excel`, {
      method: 'GET',
      headers: buildAuthHeaders(token, { json: false }),
    });
  },
  async updateStatus(token, id, status) {
    const response = await fetch(`/api/requests/${id}/status`, { // Убедитесь, что путь (/api/v1/...) совпадает с вашим бэкендом
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Или используйте вашу функцию buildAuthHeaders(token) если она есть
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Не удалось обновить статус заявки');
    }

    return response.json();
  },
  updateMaterialResponsible(token, requestId, materialId, responsible) {
    return apiRequest(`/requests/${requestId}/materials/${materialId}/responsible`, {
      method: 'PATCH',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ responsible }),
    });
  },
};
