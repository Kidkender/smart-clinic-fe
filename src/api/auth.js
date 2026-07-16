import client from './client';

export async function loginApi(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function registerApi(email, password, fullname) {
  const { data } = await client.post('/auth/register', { email, password, fullname });
  return data;
}
