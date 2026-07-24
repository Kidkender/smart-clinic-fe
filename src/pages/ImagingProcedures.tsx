import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { searchImagingProcedures, createImagingProcedure, updateImagingProcedure, deleteImagingProcedure } from '@/api/imaging';
import { resolveError } from '@/utils/errorMessages';
import { imagingModalityLabel, IMAGING_MODALITIES } from '@/utils/labels';
import { toneBadgeClass } from '@/utils/badgeStyles';
import { imagingProcedureSchema, type ImagingProcedureFormValues } from '@/schemas/imagingProcedure';
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

interface ImagingProcedure {
  ID: number | string;
  Code: string;
  Name: string;
  Modality: string;
  BodyPart?: string;
  Price: number;
  Active: boolean;
}

type Modal = { mode: 'create' } | { mode: 'edit'; procedure: ImagingProcedure };

const EMPTY_FORM: ImagingProcedureFormValues = {
  code: '',
  name: '',
  modality: 'xray',
  bodyPart: '',
  price: 0,
  active: true,
};

export default function ImagingProcedures() {
  const [procedures, setProcedures] = useState<ImagingProcedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [modal, setModal] = useState<Modal | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();
  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<ImagingProcedureFormValues>({
    resolver: zodResolver(imagingProcedureSchema),
    defaultValues: EMPTY_FORM,
  });

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchImagingProcedures({
        name: nameQuery.trim() || undefined,
        modality: modalityFilter === 'all' ? undefined : modalityFilter,
        page: 1,
        limit: 100,
      });
      setProcedures(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [nameQuery, modalityFilter]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const openCreate = () => {
    reset(EMPTY_FORM);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (procedure: ImagingProcedure) => {
    reset({
      code: procedure.Code,
      name: procedure.Name,
      modality: procedure.Modality,
      bodyPart: procedure.BodyPart ?? '',
      price: procedure.Price ?? 0,
      active: procedure.Active,
    });
    setFormError('');
    setModal({ mode: 'edit', procedure });
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
        modality: values.modality,
        body_part: values.bodyPart.trim(),
        price: values.price,
      };
      if (modal.mode === 'create') {
        await createImagingProcedure({ code: values.code.trim(), ...payload });
      } else {
        await updateImagingProcedure(modal.procedure.ID, { ...payload, active: values.active });
      }
      await fetchProcedures();
      setModal(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleDelete = async (procedure: ImagingProcedure) => {
    if (!(await confirm(`Xóa dịch vụ "${procedure.Name}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteImagingProcedure(procedure.ID);
      await fetchProcedures();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Danh mục chẩn đoán hình ảnh</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Quản lý danh mục dịch vụ X-quang, CT, MRI, siêu âm, nội soi</p>
        </div>
        <Button
          onClick={openCreate}
          size="cta"
        >
          <Icon icon="fa6-solid:plus" className="text-sm" />
          Thêm dịch vụ
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          value={nameQuery}
          onChange={e => setNameQuery(e.target.value)}
          placeholder="Tìm theo tên dịch vụ…"
          className="h-auto min-w-[240px] flex-1 rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
        />
        <Select value={modalityFilter} onValueChange={setModalityFilter}>
          <SelectTrigger className="h-auto w-[200px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kỹ thuật</SelectItem>
            {IMAGING_MODALITIES.map(m => <SelectItem key={m} value={m}>{imagingModalityLabel(m)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : procedures.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:x-ray" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Chưa có dịch vụ chẩn đoán hình ảnh nào</h3>
            <Button
              onClick={openCreate}
              size="cta"
            >
              Tạo dịch vụ đầu tiên
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Mã</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Tên dịch vụ</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Kỹ thuật</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Vùng chụp</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Giá</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procedures.map(p => (
                <TableRow key={p.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-mono text-[#274760]">{p.Code}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.Name}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{imagingModalityLabel(p.Modality)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.BodyPart || '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.Price?.toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={toneBadgeClass(p.Active ? 'success' : 'neutral')}>
                      {p.Active ? 'Đang dùng' : 'Ngừng dùng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      title="Sửa"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:pen" className="text-[13px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
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
              {modal?.mode === 'create' ? 'Thêm dịch vụ CĐHA' : 'Sửa dịch vụ CĐHA'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mã dịch vụ *</label>
                <Input
                  {...register('code')}
                  disabled={modal?.mode === 'edit'}
                  placeholder="VD: XQ-NGUC"
                  aria-invalid={!!errors.code}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.code?.message} />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Kỹ thuật *</label>
                <Controller
                  control={control}
                  name="modality"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGING_MODALITIES.map(m => <SelectItem key={m} value={m}>{imagingModalityLabel(m)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên dịch vụ *</label>
            <Input
              {...register('name')}
              placeholder="VD: X-quang ngực thẳng"
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.name?.message} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Vùng chụp</label>
                <Input
                  {...register('bodyPart')}
                  placeholder="VD: Ngực, Bụng, Sọ não…"
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
              <Button
                type="submit"
                disabled={saving}
                size="cta"
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
