import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { stockOutSchema, type StockOutFormValues } from '@/schemas/inventory';
import { stockOut, listBatches } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import type { Drug, DrugBatch } from './types';

const STOCK_OUT_TYPES = [
  { value: 'transfer_out', label: 'Chuyển kho ra' },
  { value: 'adjustment', label: 'Điều chỉnh kiểm kê' },
];

const EMPTY_FORM: StockOutFormValues = {
  batch_id: '',
  quantity: 0,
  type: 'transfer_out',
  notes: '',
};

interface StockOutDialogProps {
  open: boolean;
  drug: Drug | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function StockOutDialog({ open, drug, onClose, onSaved }: StockOutDialogProps) {
  const [batches, setBatches] = useState<DrugBatch[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<StockOutFormValues>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open || !drug) return;
    setFormError('');
    reset(EMPTY_FORM);
    listBatches({ drug_id: drug.ID, page: 1, limit: 100 })
      .then(result => setBatches((result.data ?? []).filter((b: DrugBatch) => b.QuantityRemaining > 0)))
      .catch(() => setBatches([]));
  }, [open, drug, reset]);

  const closeDialog = () => {
    if (saving) return;
    onClose();
  };

  const handleFormSubmit = handleSubmit(async values => {
    if (!drug) return;
    setFormError('');
    setSaving(true);
    try {
      await stockOut(drug.ID, {
        batch_id: values.batch_id ? Number(values.batch_id) : undefined,
        quantity: values.quantity,
        type: values.type,
        notes: values.notes.trim(),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); }}>
      <DialogContent className="sm:max-w-[480px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">
            Xuất kho — {drug?.Name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} noValidate>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Lô xuất</label>
          <Controller
            control={control}
            name="batch_id"
            render={({ field }) => (
              <Select value={field.value || 'auto'} onValueChange={v => field.onChange(v === 'auto' ? '' : v)}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue placeholder="-- Tự động chọn lô cận hạn trước (FEFO) --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Tự động chọn lô cận hạn trước (FEFO)</SelectItem>
                  {batches.map(b => (
                    <SelectItem key={b.ID} value={String(b.ID)}>
                      Lô {b.LotNumber} — HSD {new Date(b.ExpiryDate).toLocaleDateString('vi-VN')} — còn {b.QuantityRemaining}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại xuất kho *</label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_OUT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số lượng *</label>
          <Input
            type="number"
            min="1"
            max={drug?.StockQuantity}
            {...register('quantity', { valueAsNumber: true })}
            aria-invalid={!!errors.quantity}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
          <FieldError message={errors.quantity?.message} />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ghi chú</label>
          <Input
            {...register('notes')}
            placeholder="VD: Lý do xuất/điều chỉnh kho"
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />

          {formError && (
            <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
          )}

          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
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
              {saving ? 'Đang lưu…' : 'Xuất kho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
