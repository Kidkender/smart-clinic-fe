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
import { medicalSupplySchema, type MedicalSupplyFormValues } from '@/schemas/medicalSupply';
import { createMedicalSupply, updateMedicalSupply } from '@/api/medicalSupply';
import { resolveError } from '@/utils/errorMessages';
import type { MedicalSupply } from './types';
import { UNIT_OPTIONS, CATEGORY_OPTIONS } from './constants';

const OTHER_UNIT_VALUE = '__other__';
const OTHER_CATEGORY_VALUE = '__other__';

const EMPTY_FORM: MedicalSupplyFormValues = {
  name: '',
  category: '',
  unit: '',
  manufacturer: '',
  unit_cost: 0,
  min_stock_level: 0,
};

interface MedicalSupplyFormDialogProps {
  open: boolean;
  supply: MedicalSupply | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function MedicalSupplyFormDialog({ open, supply, onClose, onSaved }: MedicalSupplyFormDialogProps) {
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [unitMode, setUnitMode] = useState<'preset' | 'other'>('preset');
  const [categoryMode, setCategoryMode] = useState<'preset' | 'other'>('preset');
  const {
    register, control, handleSubmit, reset, formState: { errors },
  } = useForm<MedicalSupplyFormValues>({
    resolver: zodResolver(medicalSupplySchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;
    setFormError('');
    const unitValue = supply?.Unit ?? '';
    setUnitMode(unitValue && !UNIT_OPTIONS.includes(unitValue) ? 'other' : 'preset');
    const categoryValue = supply?.Category ?? '';
    setCategoryMode(categoryValue && !CATEGORY_OPTIONS.includes(categoryValue) ? 'other' : 'preset');
    reset(supply ? {
      name: supply.Name,
      category: supply.Category ?? '',
      unit: supply.Unit,
      manufacturer: supply.Manufacturer ?? '',
      unit_cost: supply.UnitCost ?? 0,
      min_stock_level: supply.MinStockLevel ?? 0,
    } : EMPTY_FORM);
  }, [open, supply, reset]);

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
        category: values.category.trim(),
        unit: values.unit.trim(),
        manufacturer: values.manufacturer.trim(),
        unit_cost: values.unit_cost,
        min_stock_level: values.min_stock_level,
      };
      if (supply) {
        await updateMedicalSupply(supply.ID, payload);
      } else {
        await createMedicalSupply(payload);
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
            {supply ? 'Sửa vật tư' : 'Thêm vật tư'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} noValidate>
          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tên vật tư *</label>
          <Input
            {...register('name')}
            placeholder="VD: Găng tay y tế"
            aria-invalid={!!errors.name}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
          <FieldError message={errors.name?.message} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Danh mục</label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <>
                    <Select
                      value={categoryMode === 'other' ? OTHER_CATEGORY_VALUE : field.value || undefined}
                      onValueChange={v => {
                        if (v === OTHER_CATEGORY_VALUE) {
                          setCategoryMode('other');
                          field.onChange('');
                        } else {
                          setCategoryMode('preset');
                          field.onChange(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        <SelectItem value={OTHER_CATEGORY_VALUE}>Khác…</SelectItem>
                      </SelectContent>
                    </Select>
                    {categoryMode === 'other' && (
                      <Input
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        placeholder="Nhập danh mục khác"
                        className="mt-2 h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                      />
                    )}
                  </>
                )}
              />
            </div>
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Đơn vị *</label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <>
                    <Select
                      value={unitMode === 'other' ? OTHER_UNIT_VALUE : field.value || undefined}
                      onValueChange={v => {
                        if (v === OTHER_UNIT_VALUE) {
                          setUnitMode('other');
                          field.onChange('');
                        } else {
                          setUnitMode('preset');
                          field.onChange(v);
                        }
                      }}
                    >
                      <SelectTrigger
                        aria-invalid={!!errors.unit}
                        className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                      >
                        <SelectValue placeholder="Chọn đơn vị" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        <SelectItem value={OTHER_UNIT_VALUE}>Khác…</SelectItem>
                      </SelectContent>
                    </Select>
                    {unitMode === 'other' && (
                      <Input
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        placeholder="Nhập đơn vị khác"
                        aria-invalid={!!errors.unit}
                        className="mt-2 h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                      />
                    )}
                  </>
                )}
              />
              <FieldError message={errors.unit?.message} />
            </div>
          </div>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Nhà sản xuất</label>
          <Input
            {...register('manufacturer')}
            placeholder="VD: Công ty Vật tư Y tế ABC"
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Đơn giá (đ)</label>
              <Input
                type="number"
                min="0"
                {...register('unit_cost', { valueAsNumber: true })}
                aria-invalid={!!errors.unit_cost}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
              <FieldError message={errors.unit_cost?.message} />
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
              {saving ? 'Đang lưu…' : supply ? 'Lưu' : 'Tạo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
