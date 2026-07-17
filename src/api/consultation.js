import client from './client';

export async function recordVitalSign(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/vitals`, payload);
  return data;
}

export async function listVitalSigns(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/vitals`);
  return data;
}

export async function addDiagnosis(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/diagnoses`, payload);
  return data;
}

export async function listDiagnoses(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/diagnoses`);
  return data;
}

export async function updateClinicalNotes(encounterId, clinicalNotes) {
  const { data } = await client.patch(`/encounters/${encounterId}/notes`, { clinical_notes: clinicalNotes });
  return data;
}
