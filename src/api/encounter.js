import client from './client';

export async function checkIn(payload) {
  const { data } = await client.post('/encounters', payload);
  return data;
}

export async function getTodayQueue(departmentId, sortBy, sortDir) {
  const { data } = await client.get('/encounters/queue', {
    params: {
      ...(departmentId ? { department_id: departmentId } : {}),
      ...(sortBy ? { sort_by: sortBy, sort_dir: sortDir } : {}),
    },
  });
  return data;
}

export async function callNext(departmentId) {
  const { data } = await client.post('/encounters/call-next', null, { params: { department_id: departmentId } });
  return data;
}

export async function getEncounterById(id) {
  const { data } = await client.get(`/encounters/${id}`);
  return data;
}

export async function updateEncounterStatus(id, status) {
  const { data } = await client.patch(`/encounters/${id}/status`, { status });
  return data;
}
