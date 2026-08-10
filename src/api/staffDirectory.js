import client from './client';

export async function listStaffDirectory() {
  const { data } = await client.get('/staff-directory');
  return data;
}
