import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateInvoice,
  recordPayment,
  recordRefund,
  assignPayer,
  initiateGatewayPayment,
} from '@/api/billing';
import { listPayers } from '@/api/payer';
import useConfirm from '@/hooks/useConfirm';
import { resolveError } from '@/utils/errorMessages';
import { invoiceStatusLabel, invoiceItemCategoryLabel, paymentMethodLabel, payerTypeLabel } from '@/utils/labels';
import { invoiceStatusBadgeClass } from '@/utils/badgeStyles';

interface InvoiceItem {
  ID: number | string;
  Category: string;
  Description: string;
  UnitPrice: number;
  Quantity: number;
  Amount: number;
}

interface Payment {
  ID: number | string;
  Amount: number;
  Method: string;
  PaidAt: string;
}

interface Refund {
  ID: number | string;
  Amount: number;
  Reason: string;
  RefundedAt: string;
}

interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
}

interface Invoice {
  ID: number | string;
  Status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  TotalAmount: number;
  PayerID: number | string | null;
  Payer: Payer | null;
  Items: InvoiceItem[] | null;
  Payments: Payment[] | null;
  Refunds: Refund[] | null;
}

const PAYMENT_METHODS = ['cash', 'transfer', 'qr', 'vnpay'] as const;
// Only cash and VNPay are wired up end-to-end right now; transfer/qr stay in
// the type union (backend + history rendering still need them) but are
// hidden from the picker until those flows are actually implemented.
const SELECTABLE_PAYMENT_METHODS = ['cash', 'vnpay'] as const satisfies readonly (typeof PAYMENT_METHODS)[number][];

interface InvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  /** Set when the dialog is reopened right after returning from a redirect-based
   * gateway (VNPay): briefly polls for the IPN-settled status instead of relying
   * on a single fetch, in case the browser's round trip to the gateway and back
   * outraced the server-to-server IPN callback. */
  pollForSettlement?: boolean;
}

export default function InvoiceDialog({ open, onClose, encounterId, pollForSettlement }: InvoiceDialogProps) {
  const [confirm, ConfirmDialog] = useConfirm();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [paying, setPaying] = useState(false);
  const [vnpayLoading, setVnpayLoading] = useState(false);

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const [payers, setPayers] = useState<Payer[]>([]);
  const [assigningPayer, setAssigningPayer] = useState(false);

  const changeDue = useMemo(() => {
    if (method !== 'cash') return null;
    const received = Number(cashReceived);
    const due = Number(amount);
    if (!cashReceived || !Number.isFinite(received) || !Number.isFinite(due)) return null;
    return received - due;
  }, [method, cashReceived, amount]);

  const paidTotal = useMemo(() => (invoice?.Payments ?? []).reduce((sum, p) => sum + p.Amount, 0), [invoice]);
  const refundedTotal = useMemo(() => (invoice?.Refunds ?? []).reduce((sum, r) => sum + r.Amount, 0), [invoice]);
  const remaining = invoice ? Math.max(invoice.TotalAmount - (paidTotal - refundedTotal), 0) : 0;

  const refreshInvoice = async () => {
    const res = await generateInvoice(encounterId);
    setInvoice(res.data);
    setAmount(String(Math.max(res.data.TotalAmount - ((res.data.Payments ?? []).reduce((s: number, p: Payment) => s + p.Amount, 0) - (res.data.Refunds ?? []).reduce((s: number, r: Refund) => s + r.Amount, 0)), 0)));
    return res.data as Invoice;
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    setInvoice(null);
    setMethod('cash');
    setCashReceived('');
    setShowRefundForm(false);
    setRefundAmount('');
    setRefundReason('');
    setLoading(true);
    Promise.all([generateInvoice(encounterId), listPayers()])
      .then(([invoiceRes, payersRes]) => {
        setInvoice(invoiceRes.data);
        setPayers(payersRes.data ?? []);
        const paid = (invoiceRes.data.Payments ?? []).reduce((s: number, p: Payment) => s + p.Amount, 0);
        const refunded = (invoiceRes.data.Refunds ?? []).reduce((s: number, r: Refund) => s + r.Amount, 0);
        setAmount(String(Math.max(invoiceRes.data.TotalAmount - (paid - refunded), 0)));
      })
      .catch(err => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [open, encounterId]);

  useEffect(() => {
    if (!open || !pollForSettlement) return;
    let cancelled = false;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const fresh = await refreshInvoice();
        if (cancelled) return;
        if (fresh.Status === 'paid' || attempts >= 5) {
          clearInterval(interval);
        }
      } catch {
        if (!cancelled) clearInterval(interval);
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pollForSettlement, encounterId]);

  const busy = paying || vnpayLoading || refunding || assigningPayer;

  const closeDialog = () => {
    if (busy) return;
    onClose();
  };

  const handleSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Số tiền thanh toán không hợp lệ.');
      return;
    }
    if (method === 'cash') {
      if (!cashReceived.trim()) {
        setError('Vui lòng nhập số tiền khách đưa.');
        return;
      }
      const received = Number(cashReceived);
      if (!Number.isFinite(received) || received < parsed) {
        setError('Số tiền khách đưa phải lớn hơn hoặc bằng số tiền cần thu.');
        return;
      }
    }
    setError('');

    const confirmMessage = method === 'vnpay'
      ? `Xác nhận chuyển hướng thanh toán ${parsed.toLocaleString('vi-VN')} đ qua VNPay?`
      : `Xác nhận ghi nhận thanh toán ${parsed.toLocaleString('vi-VN')} đ bằng ${paymentMethodLabel(method).toLowerCase()}?`;
    if (!(await confirm(confirmMessage, { confirmLabel: 'Xác nhận', danger: false }))) {
      return;
    }

    if (method === 'vnpay') {
      setVnpayLoading(true);
      try {
        const res = await initiateGatewayPayment(invoice.ID, 'vnpay');
        sessionStorage.setItem('vnpay_return_context', JSON.stringify({ encounterId }));
        window.location.href = res.data.payment_url;
      } catch (err) {
        setError(resolveError(err));
        setVnpayLoading(false);
      }
      return;
    }

    setPaying(true);
    try {
      await recordPayment(invoice.ID, { amount: parsed, method });
      setCashReceived('');
      await refreshInvoice();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setPaying(false);
    }
  };

  const handleRecordRefund = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    const parsed = Number(refundAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Số tiền hoàn không hợp lệ.');
      return;
    }
    if (!refundReason.trim()) {
      setError('Vui lòng nhập lý do hoàn tiền.');
      return;
    }
    setError('');
    if (!(await confirm(`Xác nhận hoàn ${parsed.toLocaleString('vi-VN')} đ cho lý do "${refundReason.trim()}"?`, { confirmLabel: 'Xác nhận hoàn tiền' }))) {
      return;
    }
    setRefunding(true);
    try {
      await recordRefund(invoice.ID, { amount: parsed, reason: refundReason.trim() });
      setShowRefundForm(false);
      setRefundAmount('');
      setRefundReason('');
      await refreshInvoice();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setRefunding(false);
    }
  };

  const handleAssignPayer = async (value: string) => {
    if (!invoice) return;
    const payerName = value === 'none' ? 'Bệnh nhân tự thanh toán' : (payers.find(p => String(p.ID) === value)?.Name ?? value);
    if (!(await confirm(`Xác nhận đổi người/đơn vị chi trả thành "${payerName}"?`, { confirmLabel: 'Xác nhận', danger: false }))) {
      return;
    }
    setError('');
    setAssigningPayer(true);
    try {
      await assignPayer(invoice.ID, value === 'none' ? null : Number(value));
      await refreshInvoice();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setAssigningPayer(false);
    }
  };

  const canPay = invoice && invoice.Status !== 'paid' && invoice.Status !== 'cancelled' && remaining > 0;
  const canRefund = invoice && paidTotal - refundedTotal > 0;

  return (
    <>
      {ConfirmDialog}
      <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">Hóa đơn viện phí</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-[#6c757d]">Đang tải…</div>
        ) : invoice ? (
          <>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[#6c757d]">Lượt khám #{encounterId}</span>
              <span className={invoiceStatusBadgeClass(invoice.Status)}>
                {invoiceStatusLabel(invoice.Status)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-[#274760]">Người/đơn vị chi trả</label>
              <Select
                value={invoice.PayerID ? String(invoice.PayerID) : 'none'}
                onValueChange={handleAssignPayer}
                disabled={busy || invoice.Status === 'paid'}
              >
                <SelectTrigger className="h-auto max-w-[280px] rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bệnh nhân tự thanh toán</SelectItem>
                  {payers.map(p => (
                    <SelectItem key={p.ID} value={String(p.ID)}>
                      {p.Name} · {payerTypeLabel(p.Type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {(invoice.Items ?? []).map(item => (
                <div key={item.ID} className="flex items-center justify-between gap-2 rounded-xl border border-[#e8edf2] px-3.5 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-[#274760]">{item.Description}</div>
                    <div className="text-xs text-[#6c757d]">
                      {invoiceItemCategoryLabel(item.Category)} · {item.Quantity} x {item.UnitPrice.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#274760]">
                    {item.Amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-1.5 border-t border-[#e8edf2] pt-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#274760]">Tổng cộng</span>
                <span className="text-lg font-bold text-[#274760]">{invoice.TotalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              {paidTotal > 0 && (
                <div className="flex items-center justify-between text-sm text-[#28a745]">
                  <span>Đã thu</span>
                  <span>{paidTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {refundedTotal > 0 && (
                <div className="flex items-center justify-between text-sm text-[#dc3545]">
                  <span>Đã hoàn</span>
                  <span>-{refundedTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {remaining > 0 && invoice.Status !== 'cancelled' && invoice.Status !== 'paid' && (
                <div className="flex items-center justify-between text-sm font-semibold text-[#274760]">
                  <span>Còn phải thu</span>
                  <span>{remaining.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
            </div>

            {(invoice.Payments?.length ?? 0) > 0 && (
              <div className="mt-4 border-t border-[#e8edf2] pt-3.5">
                <h3 className="mb-2 text-sm font-bold text-[#274760]">Lịch sử thanh toán</h3>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {invoice.Payments!.map(p => (
                    <li key={p.ID} className="flex items-center justify-between text-xs text-[#6c757d]">
                      <span>{paymentMethodLabel(p.Method)} · {new Date(p.PaidAt).toLocaleString('vi-VN')}</span>
                      <span className="font-semibold text-[#274760]">{p.Amount.toLocaleString('vi-VN')} đ</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(invoice.Refunds?.length ?? 0) > 0 && (
              <div className="mt-3 border-t border-[#e8edf2] pt-3.5">
                <h3 className="mb-2 text-sm font-bold text-[#274760]">Lịch sử hoàn tiền</h3>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {invoice.Refunds!.map(r => (
                    <li key={r.ID} className="flex items-center justify-between text-xs text-[#6c757d]">
                      <span>{r.Reason} · {new Date(r.RefundedAt).toLocaleString('vi-VN')}</span>
                      <span className="font-semibold text-[#dc3545]">-{r.Amount.toLocaleString('vi-VN')} đ</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canPay && (
              <form onSubmit={handleSubmitPayment} noValidate className="mt-4 flex flex-col gap-2.5 border-t border-[#e8edf2] pt-4">
                <div className="flex items-end gap-2.5">
                  <div className="w-[160px]">
                    <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tiền</label>
                    <Input
                      type="number"
                      readOnly
                      value={amount}
                      className="h-auto rounded-xl border-[#dde2e8] bg-[#f4f7fa] px-4 py-3 text-[15px] text-[#274760]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Phương thức</label>
                    <Select value={method} onValueChange={value => { setMethod(value as typeof method); setCashReceived(''); }}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SELECTABLE_PAYMENT_METHODS.map(m => (
                          <SelectItem key={m} value={m}>{paymentMethodLabel(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={busy} size="cta" className="shrink-0">
                    {method === 'vnpay'
                      ? (vnpayLoading ? 'Đang chuyển hướng…' : 'Thanh toán qua VNPay')
                      : (paying ? 'Đang ghi nhận…' : 'Ghi nhận')}
                  </Button>
                </div>

                {method === 'cash' && (
                  <div className="flex items-end gap-2.5">
                    <div className="w-[160px]">
                      <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Tiền khách đưa <span className="text-[#dc3545]">*</span></label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        placeholder="VD: 500000"
                        className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                      />
                    </div>
                    {changeDue !== null && (
                      <div className="flex-1 rounded-xl bg-[#f4f7fa] px-4 py-3 text-sm">
                        {changeDue >= 0 ? (
                          <span className="text-[#274760]">
                            Tiền thừa trả lại khách: <span className="font-bold">{changeDue.toLocaleString('vi-VN')} đ</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-[#dc3545]">
                            Còn thiếu {Math.abs(changeDue).toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}

            {canRefund && !showRefundForm && (
              <div className="mt-4 border-t border-[#e8edf2] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setShowRefundForm(true)}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.5 text-sm font-semibold text-[#dc3545]"
                >
                  <Icon icon="fa6-solid:rotate-left" className="mr-1.5 text-xs" />Hoàn tiền
                </Button>
              </div>
            )}

            {canRefund && showRefundForm && (
              <form onSubmit={handleRecordRefund} noValidate className="mt-4 flex flex-col gap-2.5 border-t border-[#e8edf2] pt-4">
                <div className="flex items-end gap-2.5">
                  <div className="w-[160px]">
                    <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tiền hoàn</label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Lý do</label>
                    <Input
                      value={refundReason}
                      onChange={e => setRefundReason(e.target.value)}
                      placeholder="VD: Hủy dịch vụ, trả thuốc dư"
                      className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setShowRefundForm(false)}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.5 text-sm font-medium text-[#274760]"
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={busy} size="cta">
                    {refunding ? 'Đang hoàn…' : 'Xác nhận hoàn tiền'}
                  </Button>
                </div>
              </form>
            )}
          </>
        ) : null}

        {error && <ErrorAlert icon={false} className="mt-4">{error}</ErrorAlert>}

        <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={busy}
            className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
          >
            <Icon icon="fa6-solid:xmark" className="mr-1.5 text-xs" />Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
