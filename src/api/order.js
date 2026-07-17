import client from './client';

export async function createOrder(encounterId, payload) {
  const { data } = await client.post(`/encounters/${encounterId}/orders`, payload);
  return data;
}

export async function listOrdersByEncounter(encounterId) {
  const { data } = await client.get(`/encounters/${encounterId}/orders`);
  return data;
}

export async function updateOrderStatus(encounterId, orderId, payload) {
  const { data } = await client.patch(`/encounters/${encounterId}/orders/${orderId}/status`, payload);
  return data;
}
