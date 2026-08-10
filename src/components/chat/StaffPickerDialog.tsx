import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { listStaffDirectory } from '@/api/staffDirectory';
import { useAuth } from '@/context/AuthContext';
import { roleLabel } from '@/utils/labels';
import { initials } from '@/components/chat/chatUtils';

export interface StaffEntry {
  id: number;
  fullname: string;
  role: string;
}

interface StaffPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (staff: StaffEntry) => void;
}

export default function StaffPickerDialog({ open, onOpenChange, onSelect }: StaffPickerDialogProps) {
  const { userId } = useAuth();
  const myId = Number(userId);
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open && staff.length === 0) {
      listStaffDirectory().then(r => setStaff((r.data ?? []).filter((s: StaffEntry) => s.id !== myId))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(s => s.fullname.toLowerCase().includes(q));
  }, [staff, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bắt đầu trò chuyện</DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm theo tên…"
          className="h-10 w-full rounded-xl border border-[#e8edf2] px-3.5 text-sm outline-none focus:border-[#307bc4]"
        />
        <div className="max-h-80 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
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
  );
}
