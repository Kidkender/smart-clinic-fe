import client from './client';

export async function getAvailableSlots(doctorId, date) {
  const { data } = await client.get(`/doctors/${doctorId}/available-slots`, { params: { date } });
  return data;
}

export async function listDoctorSchedules(doctorId) {
  const { data } = await client.get(`/doctors/${doctorId}/schedules`);
  return data;
}

export async function createDoctorSchedule(doctorId, payload) {
  const { data } = await client.post(`/doctors/${doctorId}/schedules`, payload);
  return data;
}

export async function deleteDoctorSchedule(doctorId, scheduleId) {
  const { data } = await client.delete(`/doctors/${doctorId}/schedules/${scheduleId}`);
  return data;
}
