import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrder, updateOrderStatus } from '@/api/order';
import { searchLabTests, getLabOrderDetail } from '@/api/lab';
import { searchImagingProcedures } from '@/api/imaging';
import useConfirm from '@/hooks/useConfirm';
import { resolveError } from '@/utils/errorMessages';
import { orderTypeLabel, orderStatusLabel, labResultFlagLabel, labResultFlagBadgeClass, labSpecimenStatusLabel } from '@/utils/labels';
import { orderSchema, type OrderFormValues } from '@/schemas/consultation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LabOrderPanel from '@/components/LabOrderPanel';
import ImagingOrderPanel from '@/components/ImagingOrderPanel';
import { SectionHeader, SectionBadge, ErrorBox, ORDER_TYPES, IMAGING_ORDER_TYPES } from './shared';
import type { Order } from './types';

const ORDER_STATUS_NEXT: Record<string, string[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

interface LabTestOption {
  ID: number | string;
  Name: string;
}

interface ImagingProcedureOption {
  ID: number | string;
  Name: string;
}

interface ParsedLabResultToken {
  name: string;
  value: string;
  unit: string;
  flag: string;
}

// Mirrors the exact "Name: Value Unit [flag]; ..." shape buildLabResultSummary
// produces server-side (internal/service/lab.go) so completed lab orders can
// render each result as a colored flag chip instead of one long plain-text
// line. Returns null on any mismatch so the caller can fall back to plain text
// rather than show a mangled parse.
function parseLabResultSummary(summary: string): ParsedLabResultToken[] | null {
  const tokens: ParsedLabResultToken[] = [];
  for (const part of summary.split('; ')) {
    const match = /^(.+): (\S+) (\S+) \[(\w+)\]$/.exec(part);
    if (!match) return null;
    const [, name, value, unit, flag] = match;
    tokens.push({ name, value, unit, flag });
  }
  return tokens;
}

export default function OrdersSection({
  encounterId,
  orders,
  canCreate,
  canUpdateStatus,
  role,
  onChanged,
}: {
  encounterId: string;
  orders: Order[];
  canCreate: boolean;
  canUpdateStatus: boolean;
  role: string | null;
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});
  const [resultErrors, setResultErrors] = useState<Record<string, string>>({});
  const [labTestOptions, setLabTestOptions] = useState<LabTestOption[]>([]);
  const [imagingProcedureOptions, setImagingProcedureOptions] = useState<ImagingProcedureOption[]>([]);
  const {
    register, control, watch, setValue, handleSubmit, reset, formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { type: 'lab', name: '' },
  });
  const orderType = watch('type');
  const [confirm, ConfirmDialog] = useConfirm();

  useEffect(() => {
    if (!open || orderType !== 'lab') return;
    searchLabTests({ page: 1, limit: 200 })
      .then(result => setLabTestOptions(result.data ?? []))
      .catch(() => setLabTestOptions([]));
  }, [open, orderType]);

  useEffect(() => {
    if (!open || !IMAGING_ORDER_TYPES.includes(orderType)) return;
    searchImagingProcedures({ modality: orderType === 'imaging' ? undefined : orderType, page: 1, limit: 200 })
      .then(result => setImagingProcedureOptions(result.data ?? []))
      .catch(() => setImagingProcedureOptions([]));
  }, [open, orderType]);

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    const ok = await confirm(
      `Tạo chỉ định "${values.name}" (${orderTypeLabel(values.type)})?`,
      { title: 'Tạo chỉ định', danger: false, confirmLabel: 'Tạo chỉ định' },
    );
    if (!ok) return;
    setSaving(true);
    try {
      await createOrder(encounterId, values);
      reset({ type: 'lab', name: '' });
      setOpen(false);
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const handleStatusChange = async (order: Order, status: string) => {
    if (status === 'in_progress') {
      const ok = await confirm(
        `Chuyển chỉ định "${order.Name}" sang đang thực hiện?`,
        { title: 'Đang thực hiện', danger: false, confirmLabel: 'Xác nhận' },
      );
      if (!ok) return;
    }
    if (status === 'cancelled') {
      const ok = await confirm(
        `Hủy chỉ định "${order.Name}"? Hành động này không thể hoàn tác.`,
        { title: 'Hủy chỉ định', confirmLabel: 'Hủy chỉ định' },
      );
      if (!ok) return;
    }
    if (status === 'completed') {
      if (!(resultDrafts[order.ID] ?? '').trim()) {
        setResultErrors({ ...resultErrors, [order.ID]: 'Kết quả xét nghiệm không được rỗng.' });
        return;
      }

      // A lab order can be force-completed here even mid-way through the
      // separate LIS workflow (LabOrderPanel). The backend cascades the
      // specimen to "cancelled" in that case (internal/service/order.go),
      // so warn the user their in-progress LIS results will be discarded
      // rather than silently completing over them.
      let confirmMessage = `Hoàn tất chỉ định "${order.Name}" với kết quả đã nhập?`;
      let danger = false;
      if (order.Type === 'lab') {
        try {
          const detail = await getLabOrderDetail(order.ID);
          const specimenStatus = detail.data?.specimen?.Status;
          if (specimenStatus && specimenStatus !== 'verified' && specimenStatus !== 'cancelled') {
            confirmMessage = `Bạn đã bắt đầu quy trình LIS cho chỉ định "${order.Name}" (đang ở bước "${labSpecimenStatusLabel(specimenStatus)}"). Hoàn tất theo cách này sẽ HỦY quy trình LIS và xóa bỏ mọi kết quả xét nghiệm đã nhập dở (chưa duyệt). Tiếp tục?`;
            danger = true;
          }
        } catch {
          // Detail fetch failing shouldn't block the quick-complete path — fall back to the generic message.
        }
      }

      const ok = await confirm(
        confirmMessage,
        { title: 'Hoàn tất chỉ định', danger, confirmLabel: 'Hoàn tất' },
      );
      if (!ok) return;
    }
    setFormError('');
    setResultErrors({ ...resultErrors, [order.ID]: '' });
    try {
      await updateOrderStatus(encounterId, order.ID, {
        status,
        result_summary: status === 'completed' ? (resultDrafts[order.ID] ?? '') : undefined,
      });
      await onChanged();
    } catch (err) {
      setFormError(resolveError(err));
    }
  };

  return (
    <Card className="rounded-2xl border-[#e8edf2] p-6">
      {ConfirmDialog}
      <SectionHeader title="Chỉ định CLS" canAct={canCreate} open={open} onToggle={() => setOpen(o => !o)} actionLabel="Thêm chỉ định" />
      {open && canCreate && (
        <form onSubmit={handleFormSubmit} noValidate className="mb-3.5 border-b border-[#f0f4f8] pb-3.5">
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Loại chỉ định *</label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={value => {
                  field.onChange(value);
                  setValue('name', '');
                }}
              >
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{orderTypeLabel(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <label className="mt-2.5 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tên dịch vụ *</label>
          {orderType === 'lab' ? (
            <>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={labTestOptions.length === 0}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                      <SelectValue placeholder={labTestOptions.length === 0 ? 'Chưa có xét nghiệm nào trong danh mục' : 'Chọn xét nghiệm…'} />
                    </SelectTrigger>
                    <SelectContent>
                      {labTestOptions.map(t => (
                        <SelectItem key={t.ID} value={t.Name}>{t.Name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {labTestOptions.length === 0 && (
                <p className="mt-1.5 text-[13px] text-[#dc3545]">
                  Danh mục xét nghiệm đang trống. Vào "Danh mục xét nghiệm" để thêm trước khi chỉ định.
                </p>
              )}
            </>
          ) : IMAGING_ORDER_TYPES.includes(orderType) ? (
            <>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={imagingProcedureOptions.length === 0}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                      <SelectValue placeholder={imagingProcedureOptions.length === 0 ? 'Chưa có dịch vụ nào trong danh mục' : 'Chọn dịch vụ chẩn đoán hình ảnh…'} />
                    </SelectTrigger>
                    <SelectContent>
                      {imagingProcedureOptions.map(p => (
                        <SelectItem key={p.ID} value={p.Name}>{p.Name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {imagingProcedureOptions.length === 0 && (
                <p className="mt-1.5 text-[13px] text-[#dc3545]">
                  Danh mục chẩn đoán hình ảnh đang trống cho loại kỹ thuật này. Vào "Danh mục CĐHA" để thêm trước khi chỉ định.
                </p>
              )}
            </>
          ) : (
            <Input
              {...register('name')}
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
            />
          )}
          <FieldError message={errors.name?.message} />
          {formError && <div className="mt-2.5"><ErrorBox>{formError}</ErrorBox></div>}
          <Button type="submit" disabled={saving} size="cta" className="mt-3">
            {saving ? 'Đang lưu…' : 'Tạo chỉ định'}
          </Button>
        </form>
      )}
      {orders.length === 0 ? (
        <p className="text-sm text-[#6c757d]">Chưa có chỉ định nào.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {orders.map(o => (
            <li key={o.ID} className="flex flex-col items-stretch gap-2.5 border-b border-[#f0f4f8] py-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">{o.Name} ({orderTypeLabel(o.Type)})</div>
                  <div className="text-xs text-[#6c757d]">{o.Price?.toLocaleString('vi-VN')} đ</div>
                </div>
                <SectionBadge>{orderStatusLabel(o.Status)}</SectionBadge>
              </div>
              {canUpdateStatus && ORDER_STATUS_NEXT[o.Status] && (
                <div className="mt-2 flex flex-wrap items-start gap-2">
                  {ORDER_STATUS_NEXT[o.Status].includes('completed') && (
                    <div className="min-w-[140px] flex-1">
                      <Input
                        placeholder="Kết quả…"
                        value={resultDrafts[o.ID] ?? ''}
                        onChange={e => {
                          setResultDrafts({ ...resultDrafts, [o.ID]: e.target.value });
                          if (resultErrors[o.ID]) setResultErrors({ ...resultErrors, [o.ID]: '' });
                        }}
                        aria-invalid={!!resultErrors[o.ID]}
                        className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                      />
                      <FieldError message={resultErrors[o.ID]} />
                    </div>
                  )}
                  {ORDER_STATUS_NEXT[o.Status].map(next => (
                    <Button
                      key={next}
                      variant="outline"
                      onClick={() => handleStatusChange(o, next)}
                      className="h-auto rounded-lg border-[#dde2e8] px-3 py-2.25 text-xs font-semibold text-[#274760]"
                    >
                      {orderStatusLabel(next)}
                    </Button>
                  ))}
                </div>
              )}
              {(() => {
                if (!o.ResultSummary) return null;
                const tokens = o.Type === 'lab' ? parseLabResultSummary(o.ResultSummary) : null;
                if (!tokens) {
                  return <div className="mt-1.5 text-[13px] text-[#6c757d]">Kết quả: {o.ResultSummary}</div>;
                }
                return (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] text-[#6c757d]">Kết quả:</span>
                    {tokens.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e8edf2] bg-white px-2.5 py-1 text-xs text-[#274760]"
                      >
                        {r.name}: {r.value} {r.unit}
                        <Badge className={labResultFlagBadgeClass(r.flag)}>{labResultFlagLabel(r.flag)}</Badge>
                      </span>
                    ))}
                  </div>
                );
              })()}
              {o.Type === 'lab' && <LabOrderPanel orderId={o.ID} orderName={o.Name} orderStatus={o.Status} role={role} onOrderChanged={onChanged} />}
              {o.Type !== 'lab' && <ImagingOrderPanel orderId={o.ID} orderStatus={o.Status} role={role} onOrderChanged={onChanged} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
