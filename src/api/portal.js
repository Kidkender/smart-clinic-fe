import portalClient from './portalClient';

export async function registerPatient(payload) {
  const { data } = await portalClient.post('/auth/register', payload);
  return data;
}

export async function loginPatient(email, password) {
  const { data } = await portalClient.post('/auth/login', { email, password });
  return data;
}

export async function forgotPasswordPatient(email) {
  const { data } = await portalClient.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPasswordPatient(email, otp, newPassword) {
  const { data } = await portalClient.post('/auth/reset-password', { email, otp, new_password: newPassword });
  return data;
}

export async function changePasswordPatient(oldPassword, newPassword) {
  const { data } = await portalClient.post('/change-password', { old_password: oldPassword, new_password: newPassword });
  return data;
}

export async function getMyProfile() {
  const { data } = await portalClient.get('/me');
  return data;
}

export async function updateMyProfile(payload) {
  const { data } = await portalClient.patch('/me', payload);
  return data;
}

export async function getMyHistory() {
  const { data } = await portalClient.get('/history');
  return data;
}

export async function getMyInvoices() {
  const { data } = await portalClient.get('/invoices');
  return data;
}

export async function listMyAttachments() {
  const { data } = await portalClient.get('/attachments');
  return data;
}

export async function downloadMyAttachment(attachmentId) {
  const { data } = await portalClient.get(`/attachments/${attachmentId}/file`, {
    responseType: 'blob',
  });
  return data;
}

export async function getPortalDepartments() {
  const { data } = await portalClient.get('/departments');
  return data;
}

export async function getPublicDepartments() {
  const { data } = await portalClient.get('/public/departments');
  return data;
}

export async function getPortalDoctors(departmentId) {
  const { data } = await portalClient.get(`/departments/${departmentId}/doctors`);
  return data;
}

export async function getPortalAvailableSlots(doctorId, date) {
  const { data } = await portalClient.get(`/doctors/${doctorId}/available-slots`, { params: { date } });
  return data;
}

export async function listMyAppointments(params = {}) {
  const { data } = await portalClient.get('/appointments', { params: { page: 1, limit: 20, ...params } });
  return data;
}

export async function bookMyAppointment(payload) {
  const { data } = await portalClient.post('/appointments', payload);
  return data;
}

export async function cancelMyAppointment(id) {
  const { data } = await portalClient.patch(`/appointments/${id}/cancel`);
  return data;
}
