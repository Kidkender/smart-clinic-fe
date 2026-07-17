import client from './client';

export async function listWards(departmentId) {
  const { data } = await client.get('/wards', { params: departmentId ? { department_id: departmentId } : {} });
  return data;
}

export async function createWard(payload) {
  const { data } = await client.post('/wards', payload);
  return data;
}

export async function updateWard(id, name) {
  const { data } = await client.put(`/wards/${id}`, { name });
  return data;
}
