import { useCallback, useEffect, useState } from 'react';
import { listMessages, sendMessage, markMessagesRead } from '@/api/chat';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';

export interface ChatMessage {
  ID: number;
  SenderID: number;
  RecipientID: number;
  Body: string;
  ReadAt: string | null;
  CreatedAt: string;
}

export function useChatThread(withUserId: number | null, onChange?: () => void) {
  const { userId } = useAuth();
  const myId = Number(userId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const fetchThread = useCallback((id: number) => {
    listMessages(id, { limit: 50 }).then(r => setMessages((r.data ?? []).slice().reverse())).catch(() => {});
    markMessagesRead(id).catch(() => {});
  }, []);

  useEffect(() => {
    if (withUserId) fetchThread(withUserId);
    else setMessages([]);
  }, [withUserId, fetchThread]);

  useRealtime(envelope => {
    if (envelope.type !== 'chat_message') return;
    const msg = envelope.data as ChatMessage;
    const counterpartId = msg.SenderID === myId ? msg.RecipientID : msg.SenderID;
    if (withUserId === counterpartId) {
      setMessages(list => [...list, msg]);
      if (msg.SenderID === withUserId) markMessagesRead(withUserId).catch(() => {});
    }
  });

  const send = useCallback(async (body: string) => {
    const trimmed = body.trim();
    if (!withUserId || !trimmed || sending) return;
    setSending(true);
    try {
      const result = await sendMessage(withUserId, trimmed);
      setMessages(list => [...list, result.data]);
      onChange?.();
    } finally {
      setSending(false);
    }
  }, [withUserId, sending, onChange]);

  return { messages, myId, sending, send };
}
