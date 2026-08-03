import client from './client';

export async function createPrescription(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/prescriptions`, payload);
  return data;
}

export async function listPrescriptionsByEncounter(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/prescriptions`);
  return data;
}

export async function getPrescriptionById(encounterId, prescriptionId) {
  const { data } = await client.get(`/encounters/${encounterId}/prescriptions/${prescriptionId}`);
  return data;
}

export async function updatePrescriptionStatus(encounterId, prescriptionId, status, reason) {
  const { data } = await client.patch(`/encounters/${encounterId}/prescriptions/${prescriptionId}/status`, { status, reason });
  return data;
}

export async function confirmPrescriptionReady(encounterId, prescriptionId) {
  const { data } = await client.post(`/encounters/${encounterId}/prescriptions/${prescriptionId}/confirm-ready`);
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

export async function getDispenseQueue() {
  const { data } = await client.get('/pharmacy/dispense-queue');
  return data;
}

export async function callNextDispense() {
  const { data } = await client.post('/pharmacy/dispense-queue/call-next');
  return data;
}

export async function flagPrescriptionItem(encounterId, prescriptionId, itemId, reason) {
  const { data } = await client.post(
    `/encounters/${encounterId}/prescriptions/${prescriptionId}/items/${itemId}/flags`,
    { reason },
  );
  return data;
}

export async function resolvePrescriptionItemFlag(encounterId, prescriptionId, itemId, flagId) {
  const { data } = await client.patch(
    `/encounters/${encounterId}/prescriptions/${prescriptionId}/items/${itemId}/flags/${flagId}/resolve`,
  );
  return data;
}
