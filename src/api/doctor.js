import client from './client';

export async function listDoctors(params) {
  const { data } = await client.get('/doctors', { params });
  return data;
}

export async function getDoctor(id) {
  const { data } = await client.get(`/doctors/${id}`);
  return data;
}

export async function upsertDoctorProfile(id, payload) {
  const { data } = await client.put(`/doctors/${id}/profile`, payload);
  return data;
}

export async function listDoctorShifts(id, params) {
  const { data } = await client.get(`/doctors/${id}/shifts`, { params });
  return data;
}

export async function createDoctorShift(id, payload) {
  const { data } = await client.post(`/doctors/${id}/shifts`, payload);
  return data;
}

export async function deleteDoctorShift(id, shiftId) {
  const { data } = await client.delete(`/doctors/${id}/shifts/${shiftId}`);
  return data;
}

export async function listDoctorLeaves(id, params) {
  const { data } = await client.get(`/doctors/${id}/leaves`, { params });
  return data;
}

export async function createDoctorLeave(id, payload) {
  const { data } = await client.post(`/doctors/${id}/leaves`, payload);
  return data;
}

export async function reviewDoctorLeave(leaveId, status) {
  const { data } = await client.patch(`/doctors/leaves/${leaveId}/review`, { status });
  return data;
}

export async function getDoctorPerformance(id, params) {
  const { data } = await client.get(`/doctors/${id}/performance`, { params });
  return data;
}
