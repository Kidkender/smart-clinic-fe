import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { listNotifications, getUnreadNotificationCount, markNotificationRead } from '@/api/notification';
import { useRealtime } from '@/hooks/useRealtime';

interface Notification {
  ID: number;
  Type: string;
  Title: string;
  Body: string;
  ReadAt: string | null;
  CreatedAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(() => {
    getUnreadNotificationCount().then(r => setUnreadCount(r.data?.count ?? 0)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const fetchList = useCallback(() => {
    listNotifications({ limit: 10 }).then(r => setNotifications(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useRealtime(envelope => {
    if (envelope.type !== 'notification') return;
    setUnreadCount(c => c + 1);
    setOpen(current => {
      if (current) fetchList();
      return current;
    });
  });

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(list => list.map(n => (n.ID === id ? { ...n, ReadAt: new Date().toISOString() } : n)));
      refreshUnreadCount();
    } catch {
      // Silently retry on next open — not worth a toast for a read-receipt.
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#5d7285] hover:bg-[#eef2f6] hover:text-[#274760]"
          aria-label="Thông báo"
        >
          <Icon icon="fa6-solid:bell" className="text-base" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc3545] px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-[#e8edf2] px-4 py-3 text-sm font-semibold text-[#274760]">Thông báo</div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-[#6c757d]">Chưa có thông báo nào.</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.ID}
                type="button"
                onClick={() => !n.ReadAt && handleMarkRead(n.ID)}
                className={`block w-full cursor-pointer border-b border-[#f0f4f8] px-4 py-3 text-left last:border-0 hover:bg-[#f4f7fa] ${n.ReadAt ? '' : 'bg-[#eef6ff]'}`}
              >
                <div className="text-sm font-medium text-[#274760]">{n.Title}</div>
                {n.Body && <div className="mt-0.5 text-xs text-[#6c757d]">{n.Body}</div>}
                <div className="mt-1 text-[11px] text-[#9aa7b2]">{new Date(n.CreatedAt).toLocaleString('vi-VN')}</div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
