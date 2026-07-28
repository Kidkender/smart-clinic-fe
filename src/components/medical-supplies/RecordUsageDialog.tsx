import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { searchMedicalSupplies, recordSupplyUsage } from '@/api/medicalSupply';
import { resolveError } from '@/utils/errorMessages';
import type { MedicalSupply } from './types';

interface UsageItemRow {
  supply_id: number | string;
  name: string;
  quantity: number | string;
  stockQuantity: number;
}

interface RecordUsageDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  /** When opened from within a patient's encounter (e.g. the consultation screen), pass the
   * encounter's own ID and a human-readable label so staff never have to type/guess the ID. */
  fixedEncounterId?: string | number;
  fixedEncounterLabel?: string;
}

export default function RecordUsageDialog({
  open, onClose, onSaved, fixedEncounterId, fixedEncounterLabel,
}: RecordUsageDialogProps) {
  const [encounterId, setEncounterId] = useState('');
  const [context, setContext] = useState('');
  const [items, setItems] = useState<UsageItemRow[]>([]);
  const [supplyQuery, setSupplyQuery] = useState('');
  const [supplyResults, setSupplyResults] = useState<MedicalSupply[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEncounterId(fixedEncounterId != null ? String(fixedEncounterId) : '');
    setContext('');
    setItems([]);
    setSupplyQuery('');
    setSupplyResults([]);
    setFormError('');
  }, [open, fixedEncounterId]);

  const closeDialog = () => {
    if (saving) return;
    onClose();
  };

  const handleSupplySearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSupplyQuery(value);
    if (value.trim().length < 2) {
      setSupplyResults([]);
      return;
    }
    try {
      const result = await searchMedicalSupplies({ name: value.trim(), page: 1, limit: 10 });
      setSupplyResults(result.data ?? []);
    } catch {
      setSupplyResults([]);
    }
  };

  const addItem = (supply: MedicalSupply) => {
    if (items.some(it => it.supply_id === supply.ID)) return;
    setItems([...items, { supply_id: supply.ID, name: supply.Name, quantity: 1, stockQuantity: supply.StockQuantity }]);
    setSupplyQuery('');
    setSupplyResults([]);
  };

  const removeItem = (supplyId: number | string) => setItems(items.filter(it => it.supply_id !== supplyId));

  const updateItemQuantity = (supplyId: number | string, quantity: string) => {
    setItems(items.map(it => (it.supply_id === supplyId ? { ...it, quantity } : it)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!encounterId.trim()) {
      setFormError('Vui lòng nhập mã lượt khám (Encounter ID).');
      return;
    }
    if (items.length === 0) {
      setFormError('Cần thêm ít nhất một loại vật tư.');
      return;
    }
    const overStock = items.find(it => (Number(it.quantity) || 0) > it.stockQuantity);
    if (overStock) {
      setFormError(`Số lượng "${overStock.name}" vượt quá tồn kho hiện có (${overStock.stockQuantity}).`);
      return;
    }
    setSaving(true);
    try {
      await recordSupplyUsage({
        encounter_id: Number(encounterId),
        context: context.trim(),
        items: items.map(it => ({ supply_id: it.supply_id, quantity: Number(it.quantity) || 1 })),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); }}>
      <DialogContent className="sm:max-w-[560px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">Ghi nhận sử dụng vật tư</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          {fixedEncounterId != null ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e8edf2] bg-[#f4f7fa] px-4 py-3 text-sm font-medium text-[#274760]">
              <Icon icon="fa6-solid:notes-medical" className="text-[#307bc4]" />
              {fixedEncounterLabel ?? `Lượt khám #${fixedEncounterId}`}
            </div>
          ) : (
            <div>
              <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mã lượt khám (Encounter ID) *</label>
              <Input
                type="number"
                min="1"
                value={encounterId}
                onChange={e => setEncounterId(e.target.value)}
                placeholder="VD: 123"
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
          )}

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bối cảnh / thủ thuật</label>
          <Input
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="VD: Thủ thuật thay băng"
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Thêm vật tư</label>
          <div className="relative">
            <Input
              value={supplyQuery}
              onChange={handleSupplySearch}
              placeholder="Tìm theo tên vật tư…"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            {supplyResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#e8edf2] bg-white shadow-lg">
                {supplyResults.map(s => (
                  <button
                    key={s.ID}
                    type="button"
                    onClick={() => addItem(s)}
                    className="block w-full cursor-pointer border-none bg-transparent px-4 py-2.5 text-left text-sm text-[#274760] hover:bg-[#f4f7fa]"
                  >
                    {s.Name} <span className="text-[#6c757d]">— còn {s.StockQuantity} {s.Unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {items.map(it => (
                <div key={it.supply_id} className="flex items-center gap-2 rounded-xl border border-[#e8edf2] px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-[#274760]">
                    {it.name}
                    <span className="ml-1.5 font-normal text-[#6c757d]">(còn {it.stockQuantity})</span>
                  </span>
                  <Input
                    type="number"
                    min="1"
                    max={it.stockQuantity}
                    value={it.quantity}
                    onChange={e => updateItemQuantity(it.supply_id, e.target.value)}
                    className="h-auto w-20 rounded-lg border-[#dde2e8] px-2 py-1.5 text-sm text-[#274760]"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.supply_id)}
                    className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                  >
                    <Icon icon="fa6-solid:xmark" className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
            <Button type="submit" disabled={saving} size="cta">
              {saving ? 'Đang lưu…' : 'Ghi nhận'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
