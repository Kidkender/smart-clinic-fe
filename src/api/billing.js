import client from './client';

export async function generateInvoice(encounterId) {
  const { data } = await client.post(`/encounters/${encounterId}/invoice`);
  return data;
}

export async function getInvoice(invoiceId) {
  const { data } = await client.get(`/invoices/${invoiceId}`);
  return data;
}

export async function listInvoices(params) {
  const { data } = await client.get('/invoices', { params });
  return data;
}

export async function recordPayment(invoiceId, payload) {
  const { data } = await client.post(`/invoices/${invoiceId}/payments`, payload);
  return data;
}

export async function recordRefund(invoiceId, payload) {
  const { data } = await client.post(`/invoices/${invoiceId}/refunds`, payload);
  return data;
}

export async function splitInvoice(invoiceId, allocations) {
  const { data } = await client.post(`/invoices/${invoiceId}/allocations`, { allocations });
  return data;
}

export async function listAllocations(invoiceId) {
  const { data } = await client.get(`/invoices/${invoiceId}/allocations`);
  return data;
}

export async function updateAllocationStatus(invoiceId, allocationId, payload) {
  const { data } = await client.patch(`/invoices/${invoiceId}/allocations/${allocationId}`, payload);
  return data;
}

export async function recordAllocationPayment(invoiceId, allocationId, payload) {
  const { data } = await client.post(`/invoices/${invoiceId}/allocations/${allocationId}/payments`, payload);
  return data;
}

export async function submitClaim(invoiceId, allocationId, payload) {
  const { data } = await client.post(`/invoices/${invoiceId}/allocations/${allocationId}/claim`, payload);
  return data;
}

export async function recordClaimResponse(invoiceId, allocationId, payload) {
  const { data } = await client.patch(`/invoices/${invoiceId}/allocations/${allocationId}/claim`, payload);
  return data;
}

export async function initiateGatewayPayment(invoiceId, gateway) {
  const { data } = await client.post(`/invoices/${invoiceId}/payments/${gateway}`);
  return data;
}

export async function getGatewayReturn(gateway, search) {
  const { data } = await client.get(`/payments/${gateway}/return${search}`);
  return data;
}
