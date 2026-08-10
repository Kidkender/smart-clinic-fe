import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listConversations, listMessages, sendMessage, markMessagesRead } from '@/api/chat';
import { listStaffDirectory } from '@/api/staffDirectory';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/hooks/useRealtime';
import { roleLabel } from '@/utils/labels';

interface Conversation {
  counterpart_id: number;
  counterpart_name: string;
  counterpart_role: string;
  last_message: string;
  last_sender_id: number;
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  ID: number;
  SenderID: number;
  RecipientID: number;
  Body: string;
  ReadAt: string | null;
  CreatedAt: string;
}

interface StaffEntry {
  id: number;
  fullname: string;
  role: string;
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function Chat() {
  const { userId } = useAuth();
  const myId = Number(userId);
  const [searchParams, setSearchParams] = useSearchParams();
  const withUserId = searchParams.get('with') ? Number(searchParams.get('with')) : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [staffQuery, setStaffQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(() => {
    listConversations().then(r => setConversations(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchThread = useCallback((withId: number) => {
    listMessages(withId, { limit: 50 }).then(r => {
      setMessages((r.data ?? []).slice().reverse());
    }).catch(() => {});
    markMessagesRead(withId).catch(() => {});
  }, []);

  useEffect(() => {
    if (withUserId) fetchThread(withUserId);
  }, [withUserId, fetchThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useRealtime(envelope => {
    if (envelope.type !== 'chat_message') return;
    const msg = envelope.data as ChatMessage;
    const counterpartId = msg.SenderID === myId ? msg.RecipientID : msg.SenderID;
    if (withUserId === counterpartId) {
      setMessages(list => [...list, msg]);
      if (msg.SenderID === withUserId) markMessagesRead(withUserId).catch(() => {});
    }
    fetchConversations();
  });

  const openPicker = () => {
    setPickerOpen(true);
    if (staff.length === 0) {
      listStaffDirectory().then(r => setStaff((r.data ?? []).filter((s: StaffEntry) => s.id !== myId))).catch(() => {});
    }
  };

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s => s.fullname.toLowerCase().includes(q));
  }, [staff, staffQuery]);

  const selectConversation = (id: number) => {
    setSearchParams({ with: String(id) });
    setPickerOpen(false);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !withUserId || sending) return;
    setSending(true);
    try {
      const result = await sendMessage(withUserId, body);
      setMessages(list => [...list, result.data]);
      setDraft('');
      fetchConversations();
    } catch {
      // Leave the draft in place so the user can retry the send.
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find(c => c.counterpart_id === withUserId);
  const activeName = activeConversation?.counterpart_name
    ?? staff.find(s => s.id === withUserId)?.fullname
    ?? '';

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e8edf2] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8edf2] px-4 py-3.5">
          <h2 className="m-0 text-base font-bold text-[#274760]">Trò chuyện</h2>
          <Button type="button" size="cta-xs" onClick={openPicker}>
            <Icon icon="fa6-solid:pen" className="mr-1 text-xs" />
            Mới
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6c757d]">Chưa có cuộc trò chuyện nào.</div>
          ) : (
            conversations.map(c => (
              <button
                key={c.counterpart_id}
                type="button"
                onClick={() => selectConversation(c.counterpart_id)}
                className={`flex w-full cursor-pointer items-center gap-3 border-b border-[#f0f4f8] px-4 py-3 text-left hover:bg-[#f4f7fa] ${withUserId === c.counterpart_id ? 'bg-[#eef6ff]' : ''}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#307bc4]/12 text-sm font-semibold text-[#307bc4]">
                  {initials(c.counterpart_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[#274760]">{c.counterpart_name}</span>
                    {c.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#307bc4] px-1 text-[11px] font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-[#6c757d]">
                    {c.last_sender_id === myId ? 'Bạn: ' : ''}{c.last_message}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8edf2] bg-white">
        {!withUserId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#6c757d]">
            Chọn một cuộc trò chuyện để bắt đầu.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[#e8edf2] px-5 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#307bc4]/12 text-sm font-semibold text-[#307bc4]">
                {initials(activeName)}
              </div>
              <span className="text-sm font-bold text-[#274760]">{activeName}</span>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              {messages.map(m => (
                <div key={m.ID} className={`flex ${m.SenderID === myId ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${m.SenderID === myId ? 'bg-[#307bc4] text-white' : 'bg-[#f4f7fa] text-[#274760]'}`}
                  >
                    {m.Body}
                    <div className={`mt-0.5 text-[10px] ${m.SenderID === myId ? 'text-white/70' : 'text-[#9aa7b2]'}`}>
                      {new Date(m.CreatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form
              className="flex items-center gap-2.5 border-t border-[#e8edf2] px-4 py-3"
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn…"
                className="h-10 flex-1 rounded-xl border border-[#e8edf2] px-3.5 text-sm outline-none focus:border-[#307bc4]"
              />
              <Button type="submit" size="cta" disabled={!draft.trim() || sending}>
                Gửi
              </Button>
            </form>
          </>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bắt đầu trò chuyện</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={staffQuery}
            onChange={e => setStaffQuery(e.target.value)}
            placeholder="Tìm theo tên…"
            className="h-10 w-full rounded-xl border border-[#e8edf2] px-3.5 text-sm outline-none focus:border-[#307bc4]"
          />
          <div className="max-h-80 overflow-y-auto">
            {filteredStaff.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectConversation(s.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#f4f7fa]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#307bc4]/12 text-xs font-semibold text-[#307bc4]">
                  {initials(s.fullname)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#274760]">{s.fullname}</div>
                  <div className="text-xs text-[#6c757d]">{roleLabel(s.role)}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
