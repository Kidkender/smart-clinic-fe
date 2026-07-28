import client from './client';

export async function searchMedicalSupplies(params) {
  const { data } = await client.get('/medical-supplies', { params });
  return data;
}

export async function createMedicalSupply(payload) {
  const { data } = await client.post('/medical-supplies', payload);
  return data;
}

export async function updateMedicalSupply(id, payload) {
  const { data } = await client.put(`/medical-supplies/${id}`, payload);
  return data;
}

export async function stockInSupply(supplyId, payload) {
  const { data } = await client.post(`/medical-supplies/${supplyId}/stock-in`, payload);
  return data;
}

export async function stockOutSupply(supplyId, payload) {
  const { data } = await client.post(`/medical-supplies/${supplyId}/stock-out`, payload);
  return data;
}

export async function listSupplyBatches(params) {
  const { data } = await client.get('/medical-supplies/batches', { params });
  return data;
}

export async function supplyLowStockAlerts() {
  const { data } = await client.get('/medical-supplies/alerts/low-stock');
  return data;
}

export async function supplyExpiringBatches(days) {
  const { data } = await client.get('/medical-supplies/alerts/expiring', { params: { days } });
  return data;
}

export async function listSupplyStockTransactions(params) {
  const { data } = await client.get('/medical-supplies/transactions', { params });
  return data;
}

export async function recordSupplyUsage(payload) {
  const { data } = await client.post('/medical-supplies/usages', payload);
  return data;
}

export async function listSupplyUsages(params) {
  const { data } = await client.get('/medical-supplies/usages', { params });
  return data;
}

export async function createSupplyStockAudit(payload) {
  const { data } = await client.post('/medical-supplies/stock-audits', payload);
  return data;
}

export async function listSupplyStockAudits(params) {
  const { data } = await client.get('/medical-supplies/stock-audits', { params });
  return data;
}

export async function getSupplyStockAudit(id) {
  const { data } = await client.get(`/medical-supplies/stock-audits/${id}`);
  return data;
}

export async function updateSupplyStockAuditItem(auditId, itemId, payload) {
  const { data } = await client.put(`/medical-supplies/stock-audits/${auditId}/items/${itemId}`, payload);
  return data;
}

export async function finalizeSupplyStockAudit(id) {
  const { data } = await client.post(`/medical-supplies/stock-audits/${id}/finalize`);
  return data;
}
