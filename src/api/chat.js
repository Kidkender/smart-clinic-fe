import client from './client';

export async function listConversations() {
  const { data } = await client.get('/chat/conversations');
  return data;
}

export async function listMessages(withUserId, params) {
  const { data } = await client.get('/chat/messages', { params: { ...params, with: withUserId } });
  return data;
}

export async function sendMessage(recipientId, body) {
  const { data } = await client.post('/chat/messages', { recipient_id: recipientId, body });
  return data;
}

export async function markMessagesRead(withUserId) {
  const { data } = await client.patch(`/chat/messages/${withUserId}/read`);
  return data;
}
