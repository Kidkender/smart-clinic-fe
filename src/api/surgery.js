import client from './client';

export async function listOperatingRooms() {
  const { data } = await client.get('/operating-rooms');
  return data;
}

export async function createOperatingRoom(payload) {
  const { data } = await client.post('/operating-rooms', payload);
  return data;
}

export async function updateOperatingRoomStatus(roomId, status) {
  const { data } = await client.patch(`/operating-rooms/${roomId}/status`, { status });
  return data;
}

export async function listSurgeries(params) {
  const { data } = await client.get('/surgeries', { params });
  return data;
}

export async function getSurgery(surgeryId) {
  const { data } = await client.get(`/surgeries/${surgeryId}`);
  return data;
}

export async function createSurgeryOrder(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/surgeries`, payload);
  return data;
}

export async function scheduleSurgery(surgeryId, payload) {
  const { data } = await client.patch(`/surgeries/${surgeryId}/schedule`, payload);
  return data;
}

export async function startSurgery(surgeryId) {
  const { data } = await client.post(`/surgeries/${surgeryId}/start`);
  return data;
}

export async function completeSurgery(surgeryId, payload) {
  const { data } = await client.post(`/surgeries/${surgeryId}/complete`, payload);
  return data;
}

export async function cancelSurgery(surgeryId, reason) {
  const { data } = await client.post(`/surgeries/${surgeryId}/cancel`, { reason });
  return data;
}

export async function searchSurgeryStaff(q) {
  const { data } = await client.get('/surgeries/staff-options', { params: { q } });
  return data;
}
