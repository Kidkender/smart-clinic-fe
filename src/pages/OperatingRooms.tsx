import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listOperatingRooms, createOperatingRoom, updateOperatingRoomStatus } from '@/api/surgery';
import { getDepartments } from '@/api/department';
import { resolveError } from '@/utils/errorMessages';
import { operatingRoomStatusBadgeClass } from '@/utils/badgeStyles';

interface Department {
  ID: number | string;
  Name: string;
}

interface OperatingRoom {
  ID: number | string;
  Name: string;
  DepartmentID: number | string | null;
  Department: Department | null;
  Status: string;
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Sẵn sàng',
  in_use: 'Đang sử dụng',
  cleaning: 'Đang vệ sinh',
  maintenance: 'Bảo trì',
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL);

export default function OperatingRooms() {
  const [rooms, setRooms] = useState<OperatingRoom[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listOperatingRooms();
      setRooms(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    getDepartments().then(res => setDepartments(res.data ?? [])).catch(() => setDepartments([]));
  }, [fetchRooms]);

  const openCreate = () => {
    setName('');
    setDepartmentId('');
    setFormError('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên phòng mổ.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await createOperatingRoom({
        name: name.trim(),
        department_id: departmentId ? Number(departmentId) : undefined,
      });
      await fetchRooms();
      setCreateOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (room: OperatingRoom, status: string) => {
    try {
      await updateOperatingRoomStatus(room.ID, status);
      await fetchRooms();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Phòng mổ</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Quản lý danh mục phòng mổ và trạng thái sử dụng</p>
        </div>
        <Button onClick={openCreate} size="cta">
          <Icon icon="fa6-solid:plus" className="text-sm" />
          Thêm phòng mổ
        </Button>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : rooms.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:door-closed" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Chưa có phòng mổ nào</h3>
            <Button onClick={openCreate} size="cta">Tạo phòng mổ đầu tiên</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Tên phòng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoa/Phòng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Đổi trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map(room => (
                <TableRow key={room.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">{room.Name}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{room.Department?.Name ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={operatingRoomStatusBadgeClass(room.Status)}>
                      {STATUS_LABEL[room.Status] ?? room.Status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Select value={room.Status} onValueChange={value => handleStatusChange(room, value)}>
                      <SelectTrigger className="h-auto w-[160px] rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(status => (
                          <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={open => { if (!saving && !open) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-[440px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Thêm phòng mổ</DialogTitle>
          </DialogHeader>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên phòng mổ *</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="VD: Phòng mổ 1"
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa/Phòng phụ trách</label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
              <SelectValue placeholder="Không bắt buộc" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {formError && <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>}

          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
              className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              Hủy
            </Button>
            <Button type="button" onClick={handleCreate} disabled={saving} size="cta">
              {saving ? 'Đang lưu…' : 'Tạo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
