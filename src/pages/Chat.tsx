import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import type { Conversation } from '@/hooks/useConversations';
import { useChatThread } from '@/hooks/useChatThread';
import StaffPickerDialog, { type StaffEntry } from '@/components/chat/StaffPickerDialog';
import ChatInputBox from '@/components/chat/ChatInputBox';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble';
import { initials, conversationPreview, conversationTime } from '@/components/chat/chatUtils';
import { ErrorAlert } from '@/components/ui/alert';

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const withUserId = searchParams.get('with') ? Number(searchParams.get('with')) : null;

  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { conversations, refetchConversations: refetch } = useOutletContext<{
    conversations: Conversation[];
    unreadTotal: number;
    refetchConversations: () => void;
  }>();
  const { messages, myId, sending, send, error } = useChatThread(withUserId, refetch);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const selectConversation = (id: number, name = '') => {
    setSearchParams({ with: String(id) });
    setPendingName(name);
    setPickerOpen(false);
  };

  const handleSend = async (file: File | null) => {
    if (!draft.trim() && !file) return;
    await send(draft, file);
    setDraft('');
  };

  const activeConversation = conversations.find(c => c.counterpart_id === withUserId);
  const activeName = activeConversation?.counterpart_name ?? pendingName;

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-[#e8edf2] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8edf2] px-4 py-3.5">
          <h2 className="m-0 text-base font-bold text-[#274760]">Trò chuyện</h2>
          <Button type="button" size="cta-xs" onClick={() => setPickerOpen(true)}>
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
                  <span className="block truncate text-sm font-semibold text-[#274760]">{c.counterpart_name}</span>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate text-xs text-[#6c757d]">
                      {c.last_sender_id === myId ? 'Bạn: ' : ''}
                      {conversationPreview(c.last_message, c.last_message_attachment_name)}
                    </div>
                    <span className="shrink-0 text-[11px] text-[#9aa7b2]">{conversationTime(c.last_message_at)}</span>
                    {c.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#307bc4] px-1 text-[11px] font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8edf2] bg-white">
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

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              {messages.map(m => (
                <ChatMessageBubble key={m.ID} message={m} isMine={m.SenderID === myId} />
              ))}
            </div>

            {error && (
              <div className="px-5 pt-3">
                <ErrorAlert variant="compact">{error}</ErrorAlert>
              </div>
            )}
            <ChatInputBox value={draft} onChange={setDraft} onSend={handleSend} disabled={sending} />
          </>
        )}
      </div>

      <StaffPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(s: StaffEntry) => selectConversation(s.id, s.fullname)}
      />
    </div>
  );
}
