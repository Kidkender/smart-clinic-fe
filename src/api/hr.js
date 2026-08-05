import client from './client';

export async function listEmployees(params) {
  const { data } = await client.get('/staff', { params });
  return data;
}

export async function getEmployee(id) {
  const { data } = await client.get(`/staff/${id}`);
  return data;
}

export async function getEmployeeProfile(id) {
  const { data } = await client.get(`/staff/${id}/profile`);
  return data;
}

export async function upsertEmployeeProfile(id, payload) {
  const { data } = await client.put(`/staff/${id}/profile`, payload);
  return data;
}

export async function listStaffShifts(id, params) {
  const { data } = await client.get(`/staff/${id}/shifts`, { params });
  return data;
}

export async function createStaffShift(id, payload) {
  const { data } = await client.post(`/staff/${id}/shifts`, payload);
  return data;
}

export async function deleteStaffShift(id, shiftId) {
  const { data } = await client.delete(`/staff/${id}/shifts/${shiftId}`);
  return data;
}

export async function clockIn(id) {
  const { data } = await client.post(`/staff/${id}/attendance/clock-in`);
  return data;
}

export async function clockOut(id) {
  const { data } = await client.post(`/staff/${id}/attendance/clock-out`);
  return data;
}

export async function listAttendance(id, params) {
  const { data } = await client.get(`/staff/${id}/attendance`, { params });
  return data;
}

export async function createManualAttendance(id, payload) {
  const { data } = await client.post(`/staff/${id}/attendance/manual`, payload);
  return data;
}

export async function updateAttendance(id, attendanceId, payload) {
  const { data } = await client.patch(`/staff/${id}/attendance/${attendanceId}`, payload);
  return data;
}

export async function getAttendanceSummary(params) {
  const { data } = await client.get('/staff/attendance/summary', { params });
  return data;
}
