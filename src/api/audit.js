import client from './client';

export async function listAuditLogs(params) {
  const { data } = await client.get('/audit-logs', { params });
  return data;
}
