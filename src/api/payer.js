import client from './client';

export async function listPayers() {
  const { data } = await client.get('/payers');
  return data;
}

export async function getPayer(payerId) {
  const { data } = await client.get(`/payers/${payerId}`);
  return data;
}

export async function createPayer(payload) {
  const { data } = await client.post('/payers', payload);
  return data;
}

export async function updatePayer(payerId, payload) {
  const { data } = await client.put(`/payers/${payerId}`, payload);
  return data;
}

export async function getPayerDebt(payerId, params) {
  const { data } = await client.get(`/payers/${payerId}/debt`, { params });
  return data;
}
