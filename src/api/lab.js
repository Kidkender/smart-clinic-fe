import client from './client';

export async function searchLabTests(params) {
  const { data } = await client.get('/lab-tests', { params });
  return data;
}

export async function getLabTest(id) {
  const { data } = await client.get(`/lab-tests/${id}`);
  return data;
}

export async function createLabTest(payload) {
  const { data } = await client.post('/lab-tests', payload);
  return data;
}

export async function updateLabTest(id, payload) {
  const { data } = await client.put(`/lab-tests/${id}`, payload);
  return data;
}

export async function deleteLabTest(id) {
  const { data } = await client.delete(`/lab-tests/${id}`);
  return data;
}

export async function listLabWorklist(status) {
  const { data } = await client.get('/lab/worklist', { params: status ? { status } : {} });
  return data;
}

export async function listLabHistory(params = {}) {
  const { data } = await client.get('/lab/history', { params: { page: 1, limit: 20, ...params } });
  return data;
}

export async function getLabOrderDetail(orderId) {
  const { data } = await client.get(`/orders/${orderId}/lab`);
  return data;
}

export async function attachLabItems(orderId, labTestIds) {
  const { data } = await client.post(`/orders/${orderId}/lab/items`, { lab_test_ids: labTestIds });
  return data;
}

export async function collectLabSpecimen(orderId, payload) {
  const { data } = await client.post(`/orders/${orderId}/lab/collect`, payload);
  return data;
}

export async function receiveLabSpecimen(orderId, payload) {
  const { data } = await client.post(`/orders/${orderId}/lab/receive`, payload);
  return data;
}

export async function submitLabResults(orderId, results) {
  const { data } = await client.put(`/orders/${orderId}/lab/results`, { results });
  return data;
}

export async function verifyLabResults(orderId) {
  const { data } = await client.post(`/orders/${orderId}/lab/verify`);
  return data;
}

export async function listSpecimenTypes() {
  const { data } = await client.get('/specimen-types');
  return data;
}
