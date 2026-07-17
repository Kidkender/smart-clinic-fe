import client from './client';

export async function createPrescription(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/prescriptions`, payload);
  return data;
}

export async function listPrescriptionsByEncounter(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/prescriptions`);
  return data;
}

export async function updatePrescriptionStatus(encounterId, prescriptionId, status) {
  const { data } = await client.patch(`/encounters/${encounterId}/prescriptions/${prescriptionId}/status`, { status });
  return data;
}
