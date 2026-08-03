import client from './client';

export async function searchAppointments(params) {
  const { data } = await client.get('/appointments', { params });
  return data;
}

export async function createAppointment(payload) {
  const { data } = await client.post('/appointments', payload);
  return data;
}

export async function cancelAppointment(id) {
  const { data } = await client.patch(`/appointments/${id}/cancel`);
  return data;
}

export async function markNoShow(id) {
  const { data } = await client.patch(`/appointments/${id}/no-show`);
  return data;
}

export async function checkInAppointment(id, { type, hasInsurance, coveragePercent, registeredFacilityCode, syncToPatientProfile } = {}) {
  const payload = {
    ...(type ? { type } : {}),
    has_insurance: !!hasInsurance,
    coverage_percent: coveragePercent ?? null,
    registered_facility_code: registeredFacilityCode ?? null,
    sync_to_patient_profile: !!syncToPatientProfile,
  };
  const { data } = await client.post(`/appointments/${id}/check-in`, payload);
  return data;
}
