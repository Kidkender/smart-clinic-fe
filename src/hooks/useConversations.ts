import { useCallback, useEffect, useState } from 'react';
import { listConversations } from '@/api/chat';
import { useRealtime } from '@/hooks/useRealtime';

export interface Conversation {
  counterpart_id: number;
  counterpart_name: string;
  counterpart_role: string;
  last_message: string;
  last_sender_id: number;
  last_message_at: string;
  unread_count: number;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refetch = useCallback(() => {
    listConversations().then(r => setConversations(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useRealtime(envelope => {
    if (envelope.type === 'chat_message') refetch();
  });

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return { conversations, unreadTotal, refetch };
}
