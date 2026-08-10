import { useCallback, useEffect, useState } from 'react';
import { listMessages, sendMessage, sendMessageWithAttachment, markMessagesRead } from '@/api/chat';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { resolveError } from '@/utils/errorMessages';

export interface ChatMessage {
  ID: number;
  SenderID: number;
  RecipientID: number;
  Body: string;
  ReadAt: string | null;
  CreatedAt: string;
  AttachmentName: string | null;
  AttachmentType: string | null;
  AttachmentSize: number | null;
  AttachmentURL?: string;
}

export function useChatThread(withUserId: number | null, onChange?: () => void) {
  const { userId } = useAuth();
  const myId = Number(userId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const fetchThread = useCallback((id: number) => {
    listMessages(id, { limit: 50 }).then(r => setMessages((r.data ?? []).slice().reverse())).catch(() => {});
    markMessagesRead(id).then(() => onChange?.()).catch(() => {});
  }, [onChange]);

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
      if (msg.SenderID === withUserId) markMessagesRead(withUserId).then(() => onChange?.()).catch(() => {});
    }
  });

  const send = useCallback(async (body: string, file?: File | null) => {
    const trimmed = body.trim();
    if (!withUserId || (!trimmed && !file) || sending) return;
    setSending(true);
    setError('');
    try {
      const result = file
        ? await sendMessageWithAttachment(withUserId, trimmed, file)
        : await sendMessage(withUserId, trimmed);
      setMessages(list => [...list, result.data]);
      onChange?.();
    } catch (err) {
      setError(resolveError(err, 'Không thể gửi tin nhắn. Vui lòng thử lại.'));
    } finally {
      setSending(false);
    }
  }, [withUserId, sending, onChange]);

  return { messages, myId, sending, send, error };
}
