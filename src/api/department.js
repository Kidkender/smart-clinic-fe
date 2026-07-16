import client from './client';

export async function getDepartments() {
  const { data } = await client.get('/departments');
  return data;
}

export async function createDepartment(name, description) {
  const { data } = await client.post('/departments', { name, description });
  return data;
}

export async function updateDepartment(id, name, description) {
  const { data } = await client.put(`/departments/${id}`, { name, description });
  return data;
}

export async function deleteDepartment(id) {
  const { data } = await client.delete(`/departments/${id}`);
  return data;
}

export async function getDoctorsByDepartment(departmentId) {
  const { data } = await client.get(`/departments/${departmentId}/doctors`);
  return data;
}
