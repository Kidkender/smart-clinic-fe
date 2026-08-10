import client from './client';

export async function listNotifications(params) {
  const { data } = await client.get('/notifications', { params });
  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await client.get('/notifications/unread-count');
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await client.patch(`/notifications/${id}/read`);
  return data;
}
