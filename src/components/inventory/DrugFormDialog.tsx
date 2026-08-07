import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import FieldError from '@/components/FieldError';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { drugSchema, type DrugFormValues } from '@/schemas/drug';
import { createDrug, updateDrug } from '@/api/drug';
import { resolveError } from '@/utils/errorMessages';
import { useEffect, useState } from 'react';
import type { Drug } from './types';

const DRUG_UNITS = ['Viên', 'Vỉ', 'Hộp', 'Chai', 'Lọ', 'Ống', 'Tuýp', 'Gói', 'Túi', 'ml', 'mg', 'g'];

const EMPTY_FORM: DrugFormValues = {
  name: '',
  active_ingredient: '',
  strength: '',
  unit: '',
  manufacturer: '',
  price: 0,
  min_stock_level: 0,
  covered_by_insurance: false,
};

interface DrugFormDialogProps {
  open: boolean;
  drug: Drug | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function DrugFormDialog({ open, drug, onClose, onSaved }: DrugFormDialogProps) {
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, control, handleSubmit, reset, watch, formState: { errors },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(drugSchema),
    defaultValues: EMPTY_FORM,
  });
  const unitValue = watch('unit');
  const unitOptions = unitValue && !DRUG_UNITS.includes(unitValue) ? [unitValue, ...DRUG_UNITS] : DRUG_UNITS;

  useEffect(() => {
    if (!open) return;
    setFormError('');
    reset(drug ? {
      name: drug.Name,
      active_ingredient: drug.ActiveIngredient ?? '',
      strength: drug.Strength ?? '',
      unit: drug.Unit,
      manufacturer: drug.Manufacturer ?? '',
      price: drug.Price ?? 0,
      min_stock_level: drug.MinStockLevel ?? 0,
      covered_by_insurance: drug.CoveredByInsurance ?? false,
    } : EMPTY_FORM);
  }, [open, drug, reset]);

  const closeDialog = () => {
    if (saving) return;
    onClose();
  };

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        active_ingredient: values.active_ingredient.trim(),
        strength: values.strength.trim(),
        unit: values.unit.trim(),
        manufacturer: values.manufacturer.trim(),
        price: values.price,
        min_stock_level: values.min_stock_level,
        covered_by_insurance: values.covered_by_insurance,
      };
      if (drug) {
        await updateDrug(drug.ID, payload);
      } else {
        await createDrug(payload);
      }
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
      <DialogContent className="sm:max-w-[520px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">
            {drug ? 'Sửa thuốc' : 'Thêm thuốc'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} noValidate>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên thuốc *</label>
          <Input
            {...register('name')}
            placeholder="VD: Paracetamol 500mg"
            aria-invalid={!!errors.name}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
          <FieldError message={errors.name?.message} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Hoạt chất</label>
              <Input
                {...register('active_ingredient')}
                placeholder="VD: Paracetamol"
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Hàm lượng</label>
              <Input
                {...register('strength')}
                placeholder="VD: 500mg"
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Đơn vị *</label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={!!errors.unit} className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                      <SelectValue placeholder="-- Chọn đơn vị --" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.unit?.message} />
            </div>
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Nhà sản xuất</label>
              <Input
                {...register('manufacturer')}
                placeholder="VD: Traphaco"
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Định mức tồn kho tối thiểu</label>
              <Input
                type="number"
                min="0"
                {...register('min_stock_level', { valueAsNumber: true })}
                aria-invalid={!!errors.min_stock_level}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              <FieldError message={errors.min_stock_level?.message} />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#274760]">
            <input type="checkbox" {...register('covered_by_insurance')} className="size-4" />
            Trong danh mục BHYT chi trả
          </label>

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
              {saving ? 'Đang lưu…' : drug ? 'Lưu' : 'Tạo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
