import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/api/department';
import { resolveError } from '@/utils/errorMessages';
import useConfirm from '@/hooks/useConfirm';
import { departmentSchema, type DepartmentFormValues } from '@/schemas/facility';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface Department {
  ID: number | string;
  Name: string;
  Description?: string;
}

type Modal = { mode: 'create' } | { mode: 'edit'; department: Department };

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', description: '' },
  });

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDepartments();
      setDepartments(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreate = () => {
    reset({ name: '', description: '' });
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (department: Department) => {
    reset({ name: department.Name, description: department.Description ?? '' });
    setFormError('');
    setModal({ mode: 'edit', department });
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
        await createDepartment(values.name.trim(), values.description.trim());
      } else {
        await updateDepartment(modal.department.ID, values.name.trim(), values.description.trim());
      }
      await fetchDepartments();
      setModal(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (department: Department) => {
    if (!(await confirm(`Xóa khoa/phòng "${department.Name}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteDepartment(department.ID);
      await fetchDepartments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Khoa/Phòng</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Quản lý danh mục khoa lâm sàng</p>
        </div>
        <Button
          onClick={openCreate}
          className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
        >
          <Icon icon="fa6-solid:plus" className="text-sm" />
          Thêm khoa/phòng
        </Button>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : departments.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:sitemap" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Chưa có khoa/phòng nào</h3>
            <Button
              onClick={openCreate}
              className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              Tạo khoa/phòng đầu tiên
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Tên</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Mô tả</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(d => (
                <TableRow key={d.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.Name}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{d.Description}</TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      title="Sửa"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:pen" className="text-[13px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
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
        <DialogContent className="sm:max-w-[440px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">
              {modal?.mode === 'create' ? 'Thêm khoa/phòng' : 'Sửa khoa/phòng'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên khoa/phòng *</label>
            <Input
              {...register('name')}
              placeholder="VD: Nội tổng quát"
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.name?.message} />
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mô tả</label>
            <Input
              {...register('description')}
              placeholder="VD: Khám và điều trị các bệnh lý nội khoa tổng quát"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {formError}
              </div>
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
              <Button
                type="submit"
                disabled={saving}
                className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
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
