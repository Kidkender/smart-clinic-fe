import { Icon } from '@iconify/react';
import type { ChatMessage } from '@/hooks/useChatThread';

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  compact?: boolean;
}

export default function ChatMessageBubble({ message, isMine, compact }: ChatMessageBubbleProps) {
  const isImage = message.AttachmentType?.startsWith('image/') ?? false;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl ${compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'} break-words whitespace-pre-wrap ${isMine ? 'bg-[#307bc4] text-white' : 'bg-[#f4f7fa] text-[#274760]'}`}
      >
        {message.AttachmentURL && isImage && (
          <a href={message.AttachmentURL} target="_blank" rel="noopener noreferrer" className="mb-1 block">
            <img
              src={message.AttachmentURL}
              alt={message.AttachmentName ?? 'Ảnh đính kèm'}
              className="max-h-48 w-auto rounded-lg object-cover"
            />
          </a>
        )}
        {message.AttachmentURL && !isImage && (
          <a
            href={message.AttachmentURL}
            target="_blank"
            rel="noopener noreferrer"
            className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 no-underline ${isMine ? 'bg-white/15 text-white' : 'bg-white text-[#274760]'}`}
          >
            <Icon icon="fa6-solid:file" className="shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">{message.AttachmentName}</span>
            {message.AttachmentSize != null && (
              <span className={`shrink-0 text-[10px] ${isMine ? 'text-white/70' : 'text-[#9aa7b2]'}`}>
                {formatFileSize(message.AttachmentSize)}
              </span>
            )}
          </a>
        )}
        {message.Body && <div>{message.Body}</div>}
        <div className={`mt-0.5 text-[9px] ${isMine ? 'text-white/70' : 'text-[#9aa7b2]'}`}>
          {new Date(message.CreatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
