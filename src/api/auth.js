import client from './client';

export async function loginApi(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function registerApi(email, password, fullname) {
  const { data } = await client.post('/auth/register', { email, password, fullname });
  return data;
}

export async function refreshApi(refreshToken) {
  const { data } = await client.post('/auth/refresh', { refresh_token: refreshToken });
  return data;
}

export async function logoutApi(refreshToken) {
  const { data } = await client.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {});
  return data;
}

export async function forgotPasswordApi(email) {
  const { data } = await client.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPasswordApi(token, newPassword) {
  const { data } = await client.post('/auth/reset-password', { token, new_password: newPassword });
  return data;
}

export async function listUsers(status) {
  const { data } = await client.get('/users', { params: status ? { status } : undefined });
  return data;
}

export async function updateUserRole(id, role) {
  const { data } = await client.put(`/users/${id}/role`, { role });
  return data;
}

export async function updateUserStatus(id, status) {
  const { data } = await client.patch(`/users/${id}/status`, { status });
  return data;
}
