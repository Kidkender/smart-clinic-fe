import client from './client';

export async function createPrescription(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/prescriptions`, payload);
  return data;
}

export async function listPrescriptionsByEncounter(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/prescriptions`);
  return data;
}

export async function updatePrescriptionStatus(encounterId, prescriptionId, status, reason) {
  const { data } = await client.patch(`/encounters/${encounterId}/prescriptions/${prescriptionId}/status`, { status, reason });
  return data;
}

export async function getPrescriptionLabel(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/prescriptions/label`);
  return data;
}

export async function returnPrescriptionItem(encounterId, prescriptionId, itemId, payload) {
  const { data } = await client.post(
    `/encounters/${encounterId}/prescriptions/${prescriptionId}/items/${itemId}/returns`,
    payload,
  );
  return data;
}

export async function listPrescriptionWorklist() {
  const { data } = await client.get('/pharmacy/worklist');
  return data;
}
