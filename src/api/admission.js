import client from './client';

export async function admitPatient(payload) {
  const { data } = await client.post('/admissions', payload);
  return data;
}

export async function admitFromEncounter(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/admit`, payload);
  return data;
}

export async function listAdmissions(params) {
  const { data } = await client.get('/admissions', { params });
  return data;
}

export async function getAdmissionById(id) {
  const { data } = await client.get(`/admissions/${id}`);
  return data;
}

export async function transferAdmission(id, payload) {
  const { data } = await client.put(`/admissions/${id}/transfer`, payload);
  return data;
}

export async function listAdmissionTransfers(id) {
  const { data } = await client.get(`/admissions/${id}/transfers`);
  return data;
}

export async function dischargeAdmission(id, dischargeSummary) {
  const { data } = await client.post(`/admissions/${id}/discharge`, { discharge_summary: dischargeSummary });
  return data;
}

export async function listProgressNotes(admissionId) {
  const { data } = await client.get(`/admissions/${admissionId}/progress-notes`);
  return data;
}

export async function addProgressNote(admissionId, payload) {
  const { data } = await client.post(`/admissions/${admissionId}/progress-notes`, payload);
  return data;
}

export async function listNursingLogs(admissionId) {
  const { data } = await client.get(`/admissions/${admissionId}/nursing-logs`);
  return data;
}

export async function addNursingLog(admissionId, payload) {
  const { data } = await client.post(`/admissions/${admissionId}/nursing-logs`, payload);
  return data;
}

export async function listAdmissionVitals(admissionId) {
  const { data } = await client.get(`/admissions/${admissionId}/vitals`);
  return data;
}

export async function recordAdmissionVital(admissionId, payload) {
  const { data } = await client.post(`/admissions/${admissionId}/vitals`, payload);
  return data;
}
