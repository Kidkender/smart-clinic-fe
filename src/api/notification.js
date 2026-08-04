import client from './client';

export async function listNotificationLogs(params) {
  const { data } = await client.get('/notifications/logs', { params });
  return data;
}

export async function resendNotification(id) {
  const { data } = await client.post(`/notifications/logs/${id}/resend`);
  return data;
}
