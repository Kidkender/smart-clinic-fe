import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { useConversations } from '@/hooks/useConversations';
import { useChatThread } from '@/hooks/useChatThread';
import StaffPickerDialog, { type StaffEntry } from '@/components/chat/StaffPickerDialog';
import { initials } from '@/components/chat/chatUtils';

export default function ChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { conversations, unreadTotal, refetch } = useConversations();
  const { messages, myId, sending, send } = useChatThread(activeId, refetch);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (location.pathname.startsWith('/chat')) return null;

  const activeConversation = conversations.find(c => c.counterpart_id === activeId);
  const activeName = activeConversation?.counterpart_name ?? pendingName;

  const handleSend = async () => {
    if (!draft.trim()) return;
    await send(draft);
    setDraft('');
  };

  const handlePick = (staff: StaffEntry) => {
    setActiveId(staff.id);
    setPendingName(staff.fullname);
    setPickerOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed right-6 bottom-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#307bc4] text-white shadow-lg hover:bg-[#2a6cad]"
        aria-label="Trò chuyện"
      >
        <Icon icon={open ? 'fa6-solid:xmark' : 'fa6-solid:comment-dots'} className="text-xl" />
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc3545] px-1 text-[11px] font-bold text-white">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-6 bottom-24 z-40 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-[#e8edf2] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#e8edf2] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {activeId && (
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="cursor-pointer text-[#5d7285] hover:text-[#274760]"
                  aria-label="Quay lại"
                >
                  <Icon icon="fa6-solid:chevron-left" className="text-sm" />
                </button>
              )}
              <span className="truncate text-sm font-bold text-[#274760]">
                {activeId ? activeName : 'Trò chuyện'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => navigate(activeId ? `/chat?with=${activeId}` : '/chat')}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#5d7285] hover:bg-[#f4f7fa] hover:text-[#274760]"
                aria-label="Mở rộng"
                title="Mở rộng"
              >
                <Icon icon="fa6-solid:up-right-and-down-left-from-center" className="text-xs" />
              </button>
              {!activeId && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[#5d7285] hover:bg-[#f4f7fa] hover:text-[#274760]"
                  aria-label="Cuộc trò chuyện mới"
                  title="Cuộc trò chuyện mới"
                >
                  <Icon icon="fa6-solid:pen" className="text-xs" />
                </button>
              )}
            </div>
          </div>

          {!activeId ? (
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#6c757d]">Chưa có cuộc trò chuyện nào.</div>
              ) : (
                conversations.map(c => (
                  <button
                    key={c.counterpart_id}
                    type="button"
                    onClick={() => setActiveId(c.counterpart_id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[#f0f4f8] px-4 py-2.5 text-left hover:bg-[#f4f7fa]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#307bc4]/12 text-xs font-semibold text-[#307bc4]">
                      {initials(c.counterpart_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#274760]">{c.counterpart_name}</span>
                        {c.unread_count > 0 && (
                          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#307bc4] px-1 text-[10px] font-bold text-white">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-[#6c757d]">{c.last_message}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
                {messages.map(m => (
                  <div key={m.ID} className={`flex ${m.SenderID === myId ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-xs break-words whitespace-pre-wrap ${m.SenderID === myId ? 'bg-[#307bc4] text-white' : 'bg-[#f4f7fa] text-[#274760]'}`}
                    >
                      {m.Body}
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="flex items-center gap-2 border-t border-[#e8edf2] px-3 py-2.5"
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
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#e8edf2] px-3 text-xs outline-none focus:border-[#307bc4]"
                />
                <Button type="submit" size="cta-xs" disabled={!draft.trim() || sending}>
                  Gửi
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      <StaffPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handlePick} />
    </>
  );
}
