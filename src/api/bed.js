import client from './client';

export async function listBeds(params) {
  const { data } = await client.get('/beds', { params });
  return data;
}

export async function createBed(payload) {
  const { data } = await client.post('/beds', payload);
  return data;
}

export async function updateBedStatus(id, status) {
  const { data } = await client.patch(`/beds/${id}/status`, { status });
  return data;
}
