import client from './client';

export async function listEmailDeliveryLogs(params) {
  const { data } = await client.get('/email-logs', { params });
  return data;
}

export async function resendEmail(id) {
  const { data } = await client.post(`/email-logs/${id}/resend`);
  return data;
}
