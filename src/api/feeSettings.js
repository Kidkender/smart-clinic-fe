import client from './client';

export async function listFeeSettings() {
  const { data } = await client.get('/fee-settings');
  return data;
}

export async function updateFeeSetting(key, amount) {
  const { data } = await client.put(`/fee-settings/${key}`, { amount });
  return data;
}
