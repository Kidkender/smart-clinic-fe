import client from './client';

export async function stockIn(drugId, payload) {
  const { data } = await client.post(`/inventory/drugs/${drugId}/stock-in`, payload);
  return data;
}

export async function stockOut(drugId, payload) {
  const { data } = await client.post(`/inventory/drugs/${drugId}/stock-out`, payload);
  return data;
}

export async function listBatches(params) {
  const { data } = await client.get('/inventory/batches', { params });
  return data;
}

export async function lowStockAlerts() {
  const { data } = await client.get('/inventory/alerts/low-stock');
  return data;
}

export async function expiringBatches(days) {
  const { data } = await client.get('/inventory/alerts/expiring', { params: { days } });
  return data;
}

export async function listStockTransactions(params) {
  const { data } = await client.get('/inventory/transactions', { params });
  return data;
}

export async function createStockAudit(payload) {
  const { data } = await client.post('/inventory/stock-audits', payload);
  return data;
}

export async function listStockAudits() {
  const { data } = await client.get('/inventory/stock-audits');
  return data;
}

export async function getStockAudit(id) {
  const { data } = await client.get(`/inventory/stock-audits/${id}`);
  return data;
}

export async function updateStockAuditItem(auditId, itemId, payload) {
  const { data } = await client.put(`/inventory/stock-audits/${auditId}/items/${itemId}`, payload);
  return data;
}

export async function finalizeStockAudit(id) {
  const { data } = await client.post(`/inventory/stock-audits/${id}/finalize`);
  return data;
}
