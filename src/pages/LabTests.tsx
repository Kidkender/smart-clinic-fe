import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { searchLabTests, createLabTest, updateLabTest, deleteLabTest } from '@/api/lab';
import { resolveError } from '@/utils/errorMessages';
import { labTestCategoryLabel, LAB_TEST_CATEGORIES } from '@/utils/labels';
import { labTestSchema, type LabTestFormValues } from '@/schemas/labTest';
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

interface LabTest {
  ID: number | string;
  Code: string;
  Name: string;
  Category: string;
  Unit?: string;
  RefRangeLow?: number | null;
  RefRangeHigh?: number | null;
  RefRangeText?: string;
  Price: number;
  Active: boolean;
}

type Modal = { mode: 'create' } | { mode: 'edit'; labTest: LabTest };

const EMPTY_FORM: LabTestFormValues = {
  code: '',
  name: '',
  category: 'hematology',
  unit: '',
  refRangeLow: '',
  refRangeHigh: '',
  refRangeText: '',
  price: 0,
  active: true,
};

export default function LabTests() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState<Modal | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();
  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<LabTestFormValues>({
    resolver: zodResolver(labTestSchema),
    defaultValues: EMPTY_FORM,
  });

  const fetchLabTests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchLabTests({
        name: nameQuery.trim() || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        page: 1,
        limit: 100,
      });
      setLabTests(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [nameQuery, categoryFilter]);

  useEffect(() => {
    fetchLabTests();
  }, [fetchLabTests]);

  const openCreate = () => {
    reset(EMPTY_FORM);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (labTest: LabTest) => {
    reset({
      code: labTest.Code,
      name: labTest.Name,
      category: labTest.Category,
      unit: labTest.Unit ?? '',
      refRangeLow: labTest.RefRangeLow != null ? String(labTest.RefRangeLow) : '',
      refRangeHigh: labTest.RefRangeHigh != null ? String(labTest.RefRangeHigh) : '',
      refRangeText: labTest.RefRangeText ?? '',
      price: labTest.Price ?? 0,
      active: labTest.Active,
    });
    setFormError('');
    setModal({ mode: 'edit', labTest });
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
      const payload = {
        name: values.name.trim(),
        category: values.category,
        unit: values.unit.trim(),
        ref_range_low: values.refRangeLow.trim() === '' ? null : Number(values.refRangeLow),
        ref_range_high: values.refRangeHigh.trim() === '' ? null : Number(values.refRangeHigh),
        ref_range_text: values.refRangeText.trim(),
        price: values.price,
      };
      if (modal.mode === 'create') {
        await createLabTest({ code: values.code.trim(), ...payload });
      } else {
        await updateLabTest(modal.labTest.ID, { ...payload, active: values.active });
      }
      await fetchLabTests();
      setModal(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (labTest: LabTest) => {
    if (!(await confirm(`Xóa xét nghiệm "${labTest.Name}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteLabTest(labTest.ID);
      await fetchLabTests();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const formatRefRange = (labTest: LabTest) => {
    if (labTest.RefRangeText) return labTest.RefRangeText;
    if (labTest.RefRangeLow != null && labTest.RefRangeHigh != null) {
      return `${labTest.RefRangeLow} - ${labTest.RefRangeHigh}`;
    }
    if (labTest.RefRangeLow != null) return `≥ ${labTest.RefRangeLow}`;
    if (labTest.RefRangeHigh != null) return `≤ ${labTest.RefRangeHigh}`;
    return '—';
  };

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Danh mục xét nghiệm</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Quản lý danh mục xét nghiệm huyết học, sinh hóa, miễn dịch, vi sinh</p>
        </div>
        <Button
          onClick={openCreate}
          className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
        >
          <Icon icon="fa6-solid:plus" className="text-sm" />
          Thêm xét nghiệm
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          value={nameQuery}
          onChange={e => setNameQuery(e.target.value)}
          placeholder="Tìm theo tên xét nghiệm…"
          className="h-auto min-w-[240px] flex-1 rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-auto w-[200px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nhóm</SelectItem>
            {LAB_TEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{labTestCategoryLabel(c)}</SelectItem>)}
          </SelectContent>
        </Select>
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
        ) : labTests.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:vial" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Chưa có xét nghiệm nào</h3>
            <Button
              onClick={openCreate}
              className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              Tạo xét nghiệm đầu tiên
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Mã</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Tên xét nghiệm</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Nhóm</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Đơn vị</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoảng tham chiếu</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Giá</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labTests.map(t => (
                <TableRow key={t.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-mono text-[#274760]">{t.Code}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{t.Name}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{labTestCategoryLabel(t.Category)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{t.Unit || '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{formatRefRange(t)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{t.Price?.toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge
                      className={
                        t.Active
                          ? 'rounded-full bg-[#198754]/10 px-2.5 py-1 text-xs font-semibold text-[#198754] hover:bg-[#198754]/10'
                          : 'rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10'
                      }
                    >
                      {t.Active ? 'Đang dùng' : 'Ngừng dùng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      title="Sửa"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:pen" className="text-[13px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
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
        <DialogContent className="sm:max-w-[520px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">
              {modal?.mode === 'create' ? 'Thêm xét nghiệm' : 'Sửa xét nghiệm'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mã xét nghiệm *</label>
                <Input
                  {...register('code')}
                  disabled={modal?.mode === 'edit'}
                  placeholder="VD: WBC"
                  aria-invalid={!!errors.code}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.code?.message} />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Nhóm *</label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LAB_TEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{labTestCategoryLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên xét nghiệm *</label>
            <Input
              {...register('name')}
              placeholder="VD: Bạch cầu (WBC)"
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.name?.message} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Đơn vị</label>
                <Input
                  {...register('unit')}
                  placeholder="VD: 10^9/L"
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giá (đ)</label>
                <Input
                  type="number"
                  min="0"
                  {...register('price', { valueAsNumber: true })}
                  aria-invalid={!!errors.price}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.price?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới hạn dưới</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="VD: 4.0"
                  {...register('refRangeLow')}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới hạn trên</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="VD: 10.0"
                  {...register('refRangeHigh')}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoảng tham chiếu (định tính)</label>
            <Input
              {...register('refRangeText')}
              placeholder="VD: Âm tính, dùng cho xét nghiệm không có giá trị số"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {modal?.mode === 'edit' && (
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#274760]">
                <input
                  type="checkbox"
                  {...register('active')}
                  className="size-4"
                />
                Đang sử dụng
              </label>
            )}

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
