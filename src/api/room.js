import client from './client';

export async function listRooms(departmentId) {
  const { data } = await client.get('/rooms', { params: departmentId ? { department_id: departmentId } : {} });
  return data;
}

export async function createRoom(payload) {
  const { data } = await client.post('/rooms', payload);
  return data;
}

export async function updateRoom(id, payload) {
  const { data } = await client.put(`/rooms/${id}`, payload);
  return data;
}

export async function deleteRoom(id) {
  const { data } = await client.delete(`/rooms/${id}`);
  return data;
}
