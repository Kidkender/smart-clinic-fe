import client from './client';

export async function generateInvoice(encounterId) {
  const { data } = await client.post(`/encounters/${encounterId}/invoice`);
  return data;
}

export async function getInvoice(invoiceId) {
  const { data } = await client.get(`/invoices/${invoiceId}`);
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

export async function assignPayer(invoiceId, payerId) {
  const { data } = await client.put(`/invoices/${invoiceId}/payer`, { payer_id: payerId });
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
