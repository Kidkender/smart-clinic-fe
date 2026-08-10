import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

// Mirrors the backend allowlist in service/chat.go — kept in sync manually
// since it's a small, rarely-changing set.
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatInputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (file: File | null) => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function ChatInputBox({ value, onChange, onSend, disabled, compact }: ChatInputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!picked) return;
    if (!ALLOWED_ATTACHMENT_TYPES.includes(picked.type)) {
      setFileError('Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh (JPG/PNG/WEBP), PDF, Word, Excel.');
      setFile(null);
      return;
    }
    if (picked.size > MAX_ATTACHMENT_SIZE) {
      setFileError('File vượt quá 25MB, vui lòng chọn file khác.');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(picked);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    if (!value.trim() && !file) return;
    onSend(file);
    setFile(null);
    setFileError('');
  };

  return (
    <form
      className={`border-t border-[#e8edf2] ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      {file && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#f4f7fa] px-2.5 py-1.5 text-xs text-[#274760]">
          <Icon icon="fa6-solid:paperclip" className="shrink-0 text-[#5d7285]" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="shrink-0 text-[#9aa7b2]">{formatFileSize(file.size)}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="shrink-0 cursor-pointer text-[#9aa7b2] hover:text-[#dc3545]"
            aria-label="Bỏ file đính kèm"
          >
            <Icon icon="fa6-solid:xmark" />
          </button>
        </div>
      )}
      {fileError && <div className="mb-2 text-xs text-[#dc3545]">{fileError}</div>}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
          className="hidden"
          onChange={handleFilePick}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5d7285] hover:bg-[#eef2f6] hover:text-[#274760]"
          aria-label="Đính kèm file"
          title="Đính kèm file (tối đa 25MB)"
        >
          <Icon icon="fa6-solid:paperclip" className="text-sm" />
        </button>
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
        <Button type="submit" size={compact ? 'cta-xs' : 'cta'} disabled={(!value.trim() && !file) || disabled}>
          Gửi
        </Button>
      </div>
    </form>
  );
}
