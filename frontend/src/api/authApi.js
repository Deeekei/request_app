import { apiRequest, buildAuthHeaders } from './client';

export const authApi = {
  login(username, password) {
    const body = new URLSearchParams({ username, password });
    return apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  },
  register(payload) {
    return apiRequest('/auth/register', {
      method: 'POST',
      headers: buildAuthHeaders(null),
      body: JSON.stringify(payload),
    });
  },
  me(token) {
    return apiRequest('/auth/me', {
      headers: buildAuthHeaders(token, { json: false }),
    });
  },
  changePassword(token, oldPassword, newPassword) {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
  },
};
