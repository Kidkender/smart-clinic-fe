import client from './client';

export async function searchPatients(params) {
  const { data } = await client.get('/patients', { params });
  return data;
}

export async function getPatientById(id) {
  const { data } = await client.get(`/patients/${id}`);
  return data;
}

export async function createPatient(payload) {
  const { data } = await client.post('/patients', payload);
  return data;
}

export async function updatePatient(id, payload) {
  const { data } = await client.put(`/patients/${id}`, payload);
  return data;
}

export async function getPatientHistory(id) {
  const { data } = await client.get(`/patients/${id}/history`);
  return data;
}

export async function listContacts(id) {
  const { data } = await client.get(`/patients/${id}/contacts`);
  return data;
}

export async function addContact(id, payload) {
  const { data } = await client.post(`/patients/${id}/contacts`, payload);
  return data;
}

export async function updateContact(id, contactId, payload) {
  const { data } = await client.put(`/patients/${id}/contacts/${contactId}`, payload);
  return data;
}

export async function deleteContact(id, contactId) {
  const { data } = await client.delete(`/patients/${id}/contacts/${contactId}`);
  return data;
}

export async function listAttachments(id) {
  const { data } = await client.get(`/patients/${id}/attachments`);
  return data;
}

export async function uploadAttachment(id, file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await client.post(`/patients/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteAttachment(id, attachmentId) {
  const { data } = await client.delete(`/patients/${id}/attachments/${attachmentId}`);
  return data;
}
