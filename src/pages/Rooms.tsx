import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments } from '@/api/department';
import { listRooms, createRoom, updateRoom, deleteRoom } from '@/api/room';
import { resolveError } from '@/utils/errorMessages';
import { roomTypeLabel, ROOM_TYPES } from '@/utils/labels';
import { toneBadgeClass } from '@/utils/badgeStyles';
import { roomSchema, type RoomFormValues } from '@/schemas/facility';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FieldError from '@/components/FieldError';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Department {
  ID: number | string;
  Name: string;
}

interface Room {
  ID: number | string;
  DepartmentID: number | string;
  Name: string;
  Code: string;
  Type: string;
  Status: string;
}

type Modal = { mode: 'create' } | { mode: 'edit'; room: Room };

const EMPTY_FORM: RoomFormValues = {
  department_id: '',
  name: '',
  code: '',
  type: 'consultation',
  status: 'active',
};

export default function Rooms() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    getDepartments()
      .then(r => setDepartments(r.data ?? []))
      .catch(err => setError(resolveError(err)));
  }, []);

  const fetchRooms = useCallback(async (deptId: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await listRooms(deptId || undefined);
      setRooms(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms(departmentFilter);
  }, [departmentFilter, fetchRooms]);

  const departmentName = (id: number | string) =>
    departments.find(d => String(d.ID) === String(id))?.Name ?? '—';

  const openCreate = () => {
    reset({ ...EMPTY_FORM, department_id: departmentFilter });
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (room: Room) => {
    reset({
      department_id: String(room.DepartmentID),
      name: room.Name,
      code: room.Code,
      type: room.Type as RoomFormValues['type'],
      status: room.Status as RoomFormValues['status'],
    });
    setFormError('');
    setModal({ mode: 'edit', room });
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
  };

  const handleFormSubmit = handleSubmit(async values => {
    if (!modal) return;
    setFormError('');
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createRoom({
          department_id: Number(values.department_id),
          name: values.name.trim(),
          code: values.code.trim(),
          type: values.type,
        });
      } else {
        await updateRoom(modal.room.ID, {
          name: values.name.trim(),
          code: values.code.trim(),
          type: values.type,
          status: values.status,
        });
      }
      await fetchRooms(departmentFilter);
      setModal(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (room: Room) => {
    if (!(await confirm(`Xóa phòng "${room.Name}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteRoom(room.ID);
      await fetchRooms(departmentFilter);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Phòng khám & Phòng điều trị</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Quản lý phòng khám ngoại trú và phòng điều trị trực thuộc từng khoa</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Select value={departmentFilter || 'all'} onValueChange={v => setDepartmentFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-auto max-w-[240px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
              <SelectValue placeholder="Tất cả khoa/phòng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khoa/phòng</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="cta" className="shrink-0">
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Thêm phòng
          </Button>
        </div>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : rooms.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:door-open" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Chưa có phòng nào</h3>
            <Button onClick={openCreate} size="cta">Tạo phòng đầu tiên</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Mã</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Tên phòng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoa/Phòng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Loại phòng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map(room => (
                <TableRow key={room.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-mono text-[#274760]">{room.Code}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">{room.Name}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{departmentName(room.DepartmentID)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{roomTypeLabel(room.Type)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={toneBadgeClass(room.Status === 'active' ? 'success' : 'neutral')}>
                      {room.Status === 'active' ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(room)}
                      title="Sửa"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:pen" className="text-[13px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(room)}
                      title="Xóa"
                      className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                    >
                      <Icon icon="fa6-solid:trash" className="text-[13px]" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!modal} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-[480px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">
              {modal?.mode === 'create' ? 'Thêm phòng' : 'Sửa phòng'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa/Phòng *</label>
            <Controller
              control={control}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={modal?.mode === 'edit'}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="Chọn khoa/phòng" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.department_id?.message} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mã phòng *</label>
                <Input
                  {...register('code')}
                  placeholder="VD: PK-101"
                  aria-invalid={!!errors.code}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.code?.message} />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại phòng *</label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_TYPES.map(t => <SelectItem key={t} value={t}>{roomTypeLabel(t)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên phòng *</label>
            <Input
              {...register('name')}
              placeholder="VD: Phòng khám Nội 1"
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.name?.message} />

            {modal?.mode === 'edit' && (
              <>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Trạng thái</label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Đang sử dụng</SelectItem>
                        <SelectItem value="inactive">Ngừng sử dụng</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </>
            )}

            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving} size="cta">
                {saving ? 'Đang lưu…' : modal?.mode === 'create' ? 'Tạo' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}
