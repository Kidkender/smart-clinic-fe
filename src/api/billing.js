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
