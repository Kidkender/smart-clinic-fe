export function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function conversationPreview(lastMessage: string, attachmentName: string | null): string {
  if (lastMessage) return lastMessage;
  if (attachmentName) return `📎 Tệp đính kèm: ${attachmentName}`;
  return '';
}

export function conversationTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
