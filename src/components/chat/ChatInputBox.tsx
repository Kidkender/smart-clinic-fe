import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ChatInputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function ChatInputBox({ value, onChange, onSend, disabled, compact }: ChatInputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <form
      className={`flex items-end border-t border-[#e8edf2] ${compact ? 'gap-2 px-3 py-2.5' : 'gap-2.5 px-4 py-3'}`}
      onSubmit={e => {
        e.preventDefault();
        onSend();
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập tin nhắn…"
        className={`min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-[#e8edf2] outline-none focus:border-[#307bc4] ${
          compact ? 'max-h-20 px-3 py-2 text-xs' : 'max-h-28 px-3.5 py-2.5 text-sm'
        }`}
      />
      <Button type="submit" size={compact ? 'cta-xs' : 'cta'} disabled={!value.trim() || disabled}>
        Gửi
      </Button>
    </form>
  );
}
