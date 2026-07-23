import { useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import {
  createPrescription, updatePrescriptionStatus,
  getPrescriptionLabel, returnPrescriptionItem, resolvePrescriptionItemFlag,
} from '@/api/prescription';
import { searchDrugs, checkDrugInteractions } from '@/api/drug';
import { printPrescriptionLabel } from '@/utils/printLabel';
import { resolveError } from '@/utils/errorMessages';
import { prescriptionStatusLabel, interactionSeverityLabel } from '@/utils/labels';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SectionHeader, SectionBadge, ErrorBox } from './shared';
import type { Prescription, PrescriptionItem, PrescriptionItemFlag, Drug, DrugWarning, DuplicateDrugWarning } from './types';

export default function PrescriptionsSection({
  encounterId,
  prescriptions,
  canCreate,
  canUpdateStatus,
  encounterCompleted,
  onChanged,
}: {
  encounterId: string;
  prescriptions: Prescription[];
  canCreate: boolean;
  canUpdateStatus: boolean;
  encounterCompleted: boolean;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ drug_id: number | string; name: string; dosage: string; quantity: number | string; instructions: string }[]>([]);
  const [drugQuery, setDrugQuery] = useState('');
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [warnings, setWarnings] = useState<DrugWarning[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateDrugWarning[]>([]);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<number | string | null>(null);
  const [originalEditItems, setOriginalEditItems] = useState<string | null>(null);

  const [returningItemId, setReturningItemId] = useState<number | string | null>(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnError, setReturnError] = useState('');
  const [returning, setReturning] = useState(false);

  const [cancelingPrescriptionId, setCancelingPrescriptionId] = useState<number | string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [resolvingFlagId, setResolvingFlagId] = useState<number | null>(null);
  const [flagResolveError, setFlagResolveError] = useState('');
  const [confirm, ConfirmDialog] = useConfirm();

  const handleResolveFlag = async (prescription: Prescription, item: PrescriptionItem, flag: PrescriptionItemFlag) => {
    const ok = await confirm(
      `Xác nhận đã xử lý cảnh báo thiếu thuốc "${item.Drug?.Name ?? `Thuốc #${item.DrugID}`}"? Cảnh báo sẽ được đánh dấu đã giải quyết.`,
      { danger: false, confirmLabel: 'Đã xử lý' },
    );
    if (!ok) return;
    setResolvingFlagId(flag.ID);
    setFlagResolveError('');
    try {
      await resolvePrescriptionItemFlag(encounterId, prescription.ID, item.ID, flag.ID);
      await onChanged();
    } catch (err) {
      setFlagResolveError(resolveError(err));
    } finally {
      setResolvingFlagId(null);
    }
  };

  const handleDrugSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDrugQuery(value);
    if (value.trim().length < 2) {
      setDrugResults([]);
      return;
    }
    try {
      const result = await searchDrugs({ name: value.trim(), page: 1, limit: 10 });
      setDrugResults(result.data ?? []);
    } catch {
      setDrugResults([]);
    }
  };

  const addItem = (drug: Drug) => {
    if (items.some(it => it.drug_id === drug.ID)) return;
    setItems([...items, { drug_id: drug.ID, name: drug.Name, dosage: '', quantity: 1, instructions: '' }]);
    setDrugQuery('');
    setDrugResults([]);
  };

  const snapshotItems = (list: typeof items) =>
    JSON.stringify(
      [...list]
        .map(it => ({ drug_id: it.drug_id, dosage: it.dosage, quantity: Number(it.quantity) || 1, instructions: it.instructions }))
        .sort((a, b) => String(a.drug_id).localeCompare(String(b.drug_id))),
    );

  const removeItem = (drugId: number | string) => setItems(items.filter(it => it.drug_id !== drugId));

  const updateItem = (drugId: number | string, field: 'dosage' | 'quantity' | 'instructions', value: string) => {
    setItems(items.map(it => (it.drug_id === drugId ? { ...it, [field]: value } : it)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setWarnings([]);
    setDuplicateWarnings([]);
    if (items.length === 0) {
      setFormError('Cần thêm ít nhất một loại thuốc.');
      return;
    }
    if (editingPrescriptionId != null && originalEditItems != null && snapshotItems(items) === originalEditItems) {
      setFormError('Bạn chưa thay đổi gì so với đơn gốc — không cần lưu lại.');
      return;
    }
    setSaving(true);
    try {
      if (editingPrescriptionId != null) {
        await updatePrescriptionStatus(encounterId, editingPrescriptionId, 'cancelled', 'Đã thay thế bằng đơn thuốc mới (sửa đơn).');
        // Clear right away: if the create call below fails, a retry must not
        // try to cancel an already-cancelled prescription again.
        setEditingPrescriptionId(null);
        setOriginalEditItems(null);
      }
      const res = await createPrescription(encounterId, {
        items: items.map(it => ({ drug_id: it.drug_id, dosage: it.dosage, quantity: Number(it.quantity) || 1, instructions: it.instructions })),
      });
      const hasWarnings = res.data?.warnings?.length > 0;
      const hasDuplicates = res.data?.duplicate_warnings?.length > 0;
      if (hasWarnings) setWarnings(res.data.warnings);
      if (hasDuplicates) setDuplicateWarnings(res.data.duplicate_warnings);
      if (!hasWarnings && !hasDuplicates) {
        setItems([]);
        setOpen(false);
      }
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setFormError('');
    setWarnings([]);
    setDuplicateWarnings([]);
    const initialItems = (prescription.Items ?? []).map(it => ({
      drug_id: it.DrugID,
      name: it.Drug?.Name ?? `Thuốc #${it.DrugID}`,
      dosage: it.Dosage ?? '',
      quantity: it.Quantity,
      instructions: it.Instructions ?? '',
    }));
    setItems(initialItems);
    setOriginalEditItems(snapshotItems(initialItems));
    setEditingPrescriptionId(prescription.ID);
    setOpen(true);
  };

  const handlePreCheck = async () => {
    if (items.length < 2) return;
    try {
      const res = await checkDrugInteractions(items.map(it => it.drug_id));
      setWarnings(res.data ?? []);
    } catch {
      // best-effort pre-check; server still validates on submit
    }
  };

  const handleDispense = async (prescription: Prescription) => {
    try {
      await updatePrescriptionStatus(encounterId, prescription.ID, 'dispensed');
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  const openCancel = (prescription: Prescription) => {
    setCancelingPrescriptionId(prescription.ID);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancelSubmit = async (prescription: Prescription, e: FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await updatePrescriptionStatus(encounterId, prescription.ID, 'cancelled', cancelReason.trim());
      setCancelingPrescriptionId(null);
      await onChanged();
    } catch (err) {
      setCancelError(resolveError(err));
    } finally {
      setCancelling(false);
    }
  };

  const printableCount = prescriptions.filter(p => p.Status !== 'cancelled' && (p.Items ?? []).length > 0).length;

  const handlePrintLabel = async () => {
    setFormError('');
    try {
      const res = await getPrescriptionLabel(encounterId);
      printPrescriptionLabel(res.data);
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  const openReturn = (item: PrescriptionItem) => {
    setReturningItemId(item.ID);
    setReturnQty(String(item.Quantity));
    setReturnReason('');
    setReturnError('');
  };

  const handleReturnSubmit = async (prescription: Prescription, item: PrescriptionItem, e: FormEvent) => {
    e.preventDefault();
    const qty = Number(returnQty);
    if (!qty || qty < 1 || qty > item.Quantity) {
      setReturnError('Số lượng không hợp lệ.');
      return;
    }
    setReturning(true);
    setReturnError('');
    try {
      await returnPrescriptionItem(encounterId, prescription.ID, item.ID, { quantity: qty, reason: returnReason });
      setReturningItemId(null);
      await onChanged();
    } catch (err) {
      setReturnError(resolveError(err));
    } finally {
      setReturning(false);
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      <SectionHeader
        title="Đơn thuốc"
        canAct={canCreate}
        open={open}
        onToggle={() => {
          setOpen(o => !o);
          setEditingPrescriptionId(null);
          setOriginalEditItems(null);
          setItems([]);
          setWarnings([]);
          setDuplicateWarnings([]);
          setFormError('');
        }}
        actionLabel="Kê đơn mới"
        extra={canUpdateStatus && (
          <Button
            type="button"
            variant="outline"
            disabled={printableCount === 0}
            onClick={handlePrintLabel}
            title={printableCount === 0 ? 'Chưa có đơn thuốc nào để in' : 'In toàn bộ đơn thuốc của lượt khám này'}
            className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-4 py-2.25 text-[13px] font-semibold text-[#307bc4] disabled:opacity-40"
          >
            <Icon icon="fa6-solid:print" className="mr-1.5 text-xs" />In đơn thuốc
          </Button>
        )}
      />
      {formError && !open && <div className="mb-3"><ErrorBox>{formError}</ErrorBox></div>}
      {flagResolveError && <div className="mb-3"><ErrorBox>{flagResolveError}</ErrorBox></div>}
      {prescriptions.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có đơn thuốc nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {prescriptions.map(p => (
            <li key={p.ID} className="flex flex-col items-stretch gap-1 border-b border-[#f0f4f8] py-2.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[#274760]">Đơn #{p.ID} ({(p.Items ?? []).length} thuốc)</div>
                <SectionBadge tone={p.Status === 'cancelled' ? 'danger' : 'default'}>{prescriptionStatusLabel(p.Status)}</SectionBadge>
              </div>
              <ul className="m-0 mt-1.5 list-none p-0 text-[13px] text-[#6c757d]">
                {(p.Items ?? []).map(it => (
                  <li key={it.ID} className="py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span>{it.Drug?.Name ?? `Thuốc #${it.DrugID}`} — SL {it.Quantity} {it.Dosage ? `· ${it.Dosage}` : ''}</span>
                      {canUpdateStatus && p.Status === 'dispensed' && (
                        <button
                          type="button"
                          onClick={() => openReturn(it)}
                          className="shrink-0 cursor-pointer border-none bg-transparent text-xs font-semibold text-[#307bc4]"
                        >
                          Hoàn trả
                        </button>
                      )}
                    </div>
                    {(it.Flags ?? []).filter(f => f.Status === 'pending').map(flag => (
                      <div
                        key={flag.ID}
                        className="mt-1.5 mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e0a800]/30 bg-[#e0a800]/10 px-2.5 py-1.5 text-xs text-[#8a6d00]"
                      >
                        <span>
                          <Icon icon="fa6-solid:bullhorn" className="mr-1.5" />
                          Dược sĩ báo: {flag.Reason}
                        </span>
                        {canCreate && (
                          <button
                            type="button"
                            disabled={resolvingFlagId === flag.ID}
                            onClick={() => handleResolveFlag(p, it, flag)}
                            className="shrink-0 cursor-pointer rounded-full border-none bg-[#e0a800]/20 px-2.5 py-1 text-[11px] font-semibold text-[#8a6d00]"
                          >
                            {resolvingFlagId === flag.ID ? 'Đang xử lý…' : 'Đã xử lý'}
                          </button>
                        )}
                      </div>
                    ))}
                    {returningItemId === it.ID && (
                      <form
                        onSubmit={e => handleReturnSubmit(p, it, e)}
                        noValidate
                        className="mt-1.5 mb-2 flex items-start gap-2 rounded-lg border border-[#f0f4f8] p-2"
                      >
                        <Input
                          type="number"
                          min={1}
                          max={it.Quantity}
                          value={returnQty}
                          onChange={e => setReturnQty(e.target.value)}
                          className="h-auto w-20 rounded-lg border-[#dde2e8] px-2 py-1.5 text-xs text-[#274760]"
                        />
                        <Input
                          placeholder="Lý do hoàn trả"
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value)}
                          className="h-auto flex-1 rounded-lg border-[#dde2e8] px-2 py-1.5 text-xs text-[#274760]"
                        />
                        <Button
                          type="submit"
                          disabled={returning}
                          className="h-auto shrink-0 rounded-lg bg-[#307bc4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                        >
                          Lưu
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setReturningItemId(null)}
                          className="h-auto shrink-0 rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
                        >
                          Hủy
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
              {returningItemId != null && (p.Items ?? []).some(it => it.ID === returningItemId) && returnError && (
                <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-3 py-2 text-xs text-[#dc3545]">
                  {returnError}
                </div>
              )}
              {(canUpdateStatus || canCreate) && p.Status === 'active' && (
                <div className="mt-2 flex flex-col items-start gap-1.5">
                  <div className="flex gap-2">
                    {canCreate && (
                      <Button
                        variant="outline"
                        onClick={() => handleEditPrescription(p)}
                        title="Hủy đơn này và mở lại danh sách thuốc để chỉnh sửa"
                        className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#307bc4]"
                      >
                        Sửa đơn
                      </Button>
                    )}
                    {canUpdateStatus && (
                      <Button
                        variant="outline"
                        disabled={!encounterCompleted}
                        onClick={() => handleDispense(p)}
                        title={encounterCompleted ? undefined : 'Bác sĩ chưa hoàn tất lượt khám này'}
                        className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760] disabled:opacity-40"
                      >
                        Đã cấp phát
                      </Button>
                    )}
                    {canUpdateStatus && (
                      <Button
                        variant="outline"
                        onClick={() => openCancel(p)}
                        className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#dc3545]"
                      >
                        Hủy đơn
                      </Button>
                    )}
                  </div>
                  {canUpdateStatus && !encounterCompleted && (
                    <span className="text-[11px] text-[#6c757d]">Chờ bác sĩ hoàn tất khám trước khi cấp phát.</span>
                  )}
                  {cancelingPrescriptionId === p.ID && (
                    <form
                      onSubmit={e => handleCancelSubmit(p, e)}
                      noValidate
                      className="mt-1 w-full rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/5 p-2.5"
                    >
                      <label className="mb-1 block text-[11px] font-semibold text-[#dc3545]">
                        Lý do hủy đơn thuốc *
                      </label>
                      <Input
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="VD: tương tác thuốc, sai liều, bệnh nhân không lấy thuốc…"
                        className="h-auto rounded-lg border-[#dde2e8] px-2.5 py-1.5 text-xs text-[#274760]"
                      />
                      {cancelError && <p className="mt-1 text-[11px] text-[#dc3545]">{cancelError}</p>}
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="submit"
                          disabled={cancelling}
                          className="h-auto rounded-lg bg-[#dc3545] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#dc3545]/90"
                        >
                          {cancelling ? 'Đang hủy…' : 'Xác nhận hủy'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCancelingPrescriptionId(null)}
                          className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
                        >
                          Đóng
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && canCreate && (
        <form onSubmit={handleSubmit} noValidate className="mt-3.5 border-t border-[#f0f4f8] pt-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tìm thuốc</label>
          <Input
            value={drugQuery}
            onChange={handleDrugSearch}
            placeholder="Nhập tên thuốc…"
            className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
          />
          {drugResults.length > 0 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
              {drugResults.map(d => (
                <div key={d.ID} onClick={() => addItem(d)} className="cursor-pointer px-3.5 py-2.5 text-sm text-[#274760]">
                  {d.Name} <span className="text-[#6c757d]">· còn {d.StockQuantity}</span>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-3">
              {items.map(it => (
                <div key={it.drug_id} className="mb-2 rounded-lg border border-[#f0f4f8] p-2.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-[#274760]">{it.name}</strong>
                    <button
                      type="button"
                      onClick={() => removeItem(it.drug_id)}
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:xmark" className="text-xs" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_80px] gap-2">
                    <Input
                      placeholder="Liều dùng"
                      value={it.dosage}
                      onChange={e => updateItem(it.drug_id, 'dosage', e.target.value)}
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="SL"
                      value={it.quantity}
                      onChange={e => updateItem(it.drug_id, 'quantity', e.target.value)}
                      className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                    />
                  </div>
                  <Input
                    placeholder="Hướng dẫn sử dụng"
                    value={it.instructions}
                    onChange={e => updateItem(it.drug_id, 'instructions', e.target.value)}
                    className="mt-2 h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handlePreCheck}
                className="h-auto rounded-xl border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
              >
                Kiểm tra tương tác thuốc
              </Button>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-[#ffc107]/40 bg-[#ffc107]/12 px-3.5 py-3">
              <div className="mb-1.5 text-[13px] font-bold text-[#8a6100]">
                <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Cảnh báo tương tác thuốc
              </div>
              {warnings.map((w, i) => (
                <div key={i} className="text-[13px] text-[#8a6100]">
                  [{interactionSeverityLabel(w.severity)}] {w.description || `Thuốc #${w.drug_a_id} và #${w.drug_b_id} có tương tác.`}
                </div>
              ))}
              <div className="mt-1.5 text-xs text-[#8a6100]">Cảnh báo không chặn tạo đơn — bác sĩ tự quyết định.</div>
            </div>
          )}

          {duplicateWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-[#ffc107]/40 bg-[#ffc107]/12 px-3.5 py-3">
              <div className="mb-1.5 text-[13px] font-bold text-[#8a6100]">
                <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Trùng thuốc với đơn khác đang hiệu lực
              </div>
              {duplicateWarnings.map((w, i) => (
                <div key={i} className="text-[13px] text-[#8a6100]">
                  {w.drug_name} đã có trong đơn #{w.existing_prescription_id} (đang hiệu lực) của cùng lượt khám này.
                </div>
              ))}
              <div className="mt-1.5 text-xs text-[#8a6100]">
                Đơn thuốc đã được tạo. Nếu đây là toa trùng, hãy hủy đơn thừa để tránh cấp phát thuốc 2 lần.
              </div>
            </div>
          )}

          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
            {saving ? 'Đang lưu…' : editingPrescriptionId != null ? 'Lưu đơn đã sửa' : 'Tạo đơn thuốc'}
          </Button>
        </form>
      )}
      {ConfirmDialog}
    </Card>
  );
}
