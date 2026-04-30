import { apiRequest, buildAuthHeaders } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const attachmentApi = {
  upload(token, requestId, file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest(`/attachments/requests/${requestId}`, {
      method: 'POST',
      headers: buildAuthHeaders(token, { json: false }),
      body: formData,
    });
  },

  list(token, requestId) {
    return apiRequest(`/attachments/requests/${requestId}`, {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },

  async download(token, attachmentId) {
    const response = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/download`, {
      method: 'GET',
      headers: buildAuthHeaders(token, { json: false }),
    });

    if (!response.ok) {
      let detail = 'Не удалось скачать файл.';
      try {
        const payload = await response.json();
        detail = payload?.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    return response;
  },

  remove(token, attachmentId) {
    return apiRequest(`/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token, { json: false }),
    });
  },
};
