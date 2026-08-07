import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import FieldError from '@/components/FieldError';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { stockInSchema, type StockInFormValues } from '@/schemas/inventory';
import { stockIn } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import type { Drug } from './types';

const EMPTY_FORM: StockInFormValues = {
  lot_number: '',
  expiry_date: '',
  quantity: 0,
  supplier: '',
  unit_cost: 0,
  notes: '',
};

interface StockInDialogProps {
  open: boolean;
  drug: Drug | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function StockInDialog({ open, drug, onClose, onSaved }: StockInDialogProps) {
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<StockInFormValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;
    setFormError('');
    reset(EMPTY_FORM);
  }, [open, reset]);

  const closeDialog = () => {
    if (saving) return;
    onClose();
  };

  const handleFormSubmit = handleSubmit(async values => {
    if (!drug) return;
    setFormError('');
    setSaving(true);
    try {
      await stockIn(drug.ID, {
        lot_number: values.lot_number.trim(),
        expiry_date: values.expiry_date,
        quantity: values.quantity,
        supplier: values.supplier.trim(),
        unit_cost: values.unit_cost,
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
            Nhập kho — {drug?.Name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số lô *</label>
              <Input
                {...register('lot_number')}
                placeholder="VD: LOT2026001"
                aria-invalid={!!errors.lot_number}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              <FieldError message={errors.lot_number?.message} />
            </div>
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Hạn sử dụng *</label>
              <Controller
                control={control}
                name="expiry_date"
                render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
              />
              <FieldError message={errors.expiry_date?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số lượng *</label>
              <Input
                type="number"
                min="1"
                {...register('quantity', { valueAsNumber: true })}
                aria-invalid={!!errors.quantity}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              <FieldError message={errors.quantity?.message} />
            </div>
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Đơn giá (đ) *</label>
              <Input
                type="number"
                min="0"
                {...register('unit_cost', { valueAsNumber: true })}
                aria-invalid={!!errors.unit_cost}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              <FieldError message={errors.unit_cost?.message} />
            </div>
          </div>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Nhà cung cấp *</label>
          <Input
            {...register('supplier')}
            placeholder="VD: Công ty Dược phẩm ABC"
            aria-invalid={!!errors.supplier}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
          <FieldError message={errors.supplier?.message} />
          <p className="mt-1.5 text-xs text-[#6c757d]">
            Đơn giá và nhà cung cấp của lần nhập này sẽ trở thành đơn giá bán và nhà cung cấp hiện tại của thuốc.
          </p>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ghi chú</label>
          <Input
            {...register('notes')}
            placeholder="Ghi chú thêm (nếu có)"
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
              {saving ? 'Đang lưu…' : 'Nhập kho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
