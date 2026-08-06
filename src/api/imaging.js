import client from './client';

export async function searchImagingProcedures(params) {
  const { data } = await client.get('/imaging-procedures', { params });
  return data;
}

export async function getImagingProcedure(id) {
  const { data } = await client.get(`/imaging-procedures/${id}`);
  return data;
}

export async function createImagingProcedure(payload) {
  const { data } = await client.post('/imaging-procedures', payload);
  return data;
}

export async function updateImagingProcedure(id, payload) {
  const { data } = await client.put(`/imaging-procedures/${id}`, payload);
  return data;
}

export async function deleteImagingProcedure(id) {
  const { data } = await client.delete(`/imaging-procedures/${id}`);
  return data;
}

export async function listImagingWorklist(status) {
  const { data } = await client.get('/imaging/worklist', { params: status ? { status } : {} });
  return data;
}

export async function listImagingHistory(params = {}) {
  const { data } = await client.get('/imaging/history', { params: { page: 1, limit: 20, ...params } });
  return data;
}

export async function getImagingOrderDetail(orderId) {
  const { data } = await client.get(`/orders/${orderId}/imaging`);
  return data;
}

export async function scheduleImagingStudy(orderId, payload) {
  const { data } = await client.post(`/orders/${orderId}/imaging/schedule`, payload);
  return data;
}

export async function performImagingStudy(orderId, payload) {
  const { data } = await client.post(`/orders/${orderId}/imaging/perform`, payload);
  return data;
}

export async function submitImagingReport(orderId, payload) {
  const { data } = await client.put(`/orders/${orderId}/imaging/report`, payload);
  return data;
}

export async function verifyImagingReport(orderId) {
  const { data } = await client.post(`/orders/${orderId}/imaging/verify`);
  return data;
}
