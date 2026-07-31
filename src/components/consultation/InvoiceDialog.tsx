import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  generateInvoice,
  recordPayment,
  recordRefund,
  initiateGatewayPayment,
} from '@/api/billing';
import { listPayers } from '@/api/payer';
import { getEncounterById, updateEncounterInsurance } from '@/api/encounter';
import useConfirm from '@/hooks/useConfirm';
import { resolveError } from '@/utils/errorMessages';
import { invoiceStatusLabel, paymentMethodLabel } from '@/utils/labels';
import { invoiceStatusBadgeClass } from '@/utils/badgeStyles';
import InvoiceSummary from './invoice/InvoiceSummary';
import InvoicePaymentForm from './invoice/InvoicePaymentForm';
import InvoiceAllocationsSection from './invoice/InvoiceAllocationsSection';
import InvoiceInsuranceSection from './invoice/InvoiceInsuranceSection';
import InvoiceRefundSection from './invoice/InvoiceRefundSection';
import { PAYMENT_METHODS, type Encounter, type Invoice, type Payer, type Payment, type Refund } from './invoice/types';

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

const paymentTotal = (payments: Payment[] | null | undefined) => (payments ?? []).reduce((sum, p) => sum + p.Amount, 0);
const refundTotal = (refunds: Refund[] | null | undefined) => (refunds ?? []).reduce((sum, r) => sum + r.Amount, 0);
const payableAmount = (invoice: Invoice) => invoice.TotalPatientAmount ?? invoice.TotalAmount;

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
  const [refundItemId, setRefundItemId] = useState('whole_invoice');
  const [refunding, setRefunding] = useState(false);

  const [payers, setPayers] = useState<Payer[]>([]);
  const [allocationsBusy, setAllocationsBusy] = useState(false);

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [hasInsuranceInput, setHasInsuranceInput] = useState(false);
  const [coveragePercentInput, setCoveragePercentInput] = useState('');
  const [registeredFacilityCodeInput, setRegisteredFacilityCodeInput] = useState('');
  const [savingInsurance, setSavingInsurance] = useState(false);

  const changeDue = useMemo(() => {
    if (method !== 'cash') return null;
    const received = Number(cashReceived);
    const due = Number(amount);
    if (!cashReceived || !Number.isFinite(received) || !Number.isFinite(due)) return null;
    return received - due;
  }, [method, cashReceived, amount]);

  const paidTotal = useMemo(() => paymentTotal(invoice?.Payments), [invoice]);
  const refundedTotal = useMemo(() => refundTotal(invoice?.Refunds), [invoice]);
  const payableTotal = invoice ? payableAmount(invoice) : 0;
  const remaining = invoice ? Math.max(payableTotal - (paidTotal - refundedTotal), 0) : 0;

  const seedAmount = (data: Invoice) => {
    const paid = paymentTotal(data.Payments);
    const refunded = refundTotal(data.Refunds);
    setAmount(String(Math.max(payableAmount(data) - (paid - refunded), 0)));
  };

  const refreshInvoice = async () => {
    const res = await generateInvoice(encounterId);
    setInvoice(res.data);
    seedAmount(res.data);
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
    setRefundItemId('whole_invoice');
    setShowInsuranceForm(false);
    setLoading(true);
    Promise.all([generateInvoice(encounterId), listPayers(), getEncounterById(encounterId)])
      .then(([invoiceRes, payersRes, encounterRes]) => {
        setInvoice(invoiceRes.data);
        setPayers(payersRes.data ?? []);
        setEncounter(encounterRes.data);
        setHasInsuranceInput(encounterRes.data.HasInsurance);
        setCoveragePercentInput(encounterRes.data.CoveragePercent != null ? String(encounterRes.data.CoveragePercent) : '');
        setRegisteredFacilityCodeInput(encounterRes.data.RegisteredFacilityCode ?? '');
        seedAmount(invoiceRes.data);
      })
      .catch(err => setError(resolveError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const busy = paying || vnpayLoading || refunding || allocationsBusy || savingInsurance;

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
      await recordRefund(invoice.ID, {
        amount: parsed,
        reason: refundReason.trim(),
        invoice_item_id: refundItemId === 'whole_invoice' ? null : Number(refundItemId),
      });
      setShowRefundForm(false);
      setRefundAmount('');
      setRefundReason('');
      setRefundItemId('whole_invoice');
      await refreshInvoice();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setRefunding(false);
    }
  };

  const handleSaveInsurance = async () => {
    let coveragePercent: number | null = null;
    if (coveragePercentInput.trim()) {
      const parsed = Number(coveragePercentInput);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        setError('Mức hưởng BHYT phải là số từ 0 đến 100.');
        return;
      }
      coveragePercent = parsed;
    }
    setError('');
    setSavingInsurance(true);
    try {
      const res = await updateEncounterInsurance(encounterId, {
        hasInsurance: hasInsuranceInput,
        coveragePercent,
        registeredFacilityCode: registeredFacilityCodeInput.trim() || null,
      });
      setEncounter(res.data);
      setShowInsuranceForm(false);
      await refreshInvoice();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSavingInsurance(false);
    }
  };

  const canPay = invoice && invoice.Status !== 'paid' && invoice.Status !== 'cancelled' && remaining > 0;
  const canRefund = !!invoice && paidTotal - refundedTotal > 0;

  return (
    <>
      {ConfirmDialog}
      <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1040px] rounded-[20px] p-8">
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

            <div className="mt-4 grid gap-x-8 lg:grid-cols-2">
              <InvoiceSummary
                invoice={invoice}
                paidTotal={paidTotal}
                refundedTotal={refundedTotal}
                payableTotal={payableTotal}
                remaining={remaining}
              />

              <div>
                {canPay && (
                  <InvoicePaymentForm
                    amount={amount}
                    method={method}
                    onMethodChange={value => { setMethod(value); setCashReceived(''); }}
                    cashReceived={cashReceived}
                    onCashReceivedChange={setCashReceived}
                    changeDue={changeDue}
                    busy={busy}
                    paying={paying}
                    vnpayLoading={vnpayLoading}
                    onSubmit={handleSubmitPayment}
                  />
                )}

                <InvoiceInsuranceSection
                  invoice={invoice}
                  encounter={encounter}
                  showInsuranceForm={showInsuranceForm}
                  onShowInsuranceForm={() => setShowInsuranceForm(true)}
                  onCancel={() => setShowInsuranceForm(false)}
                  onSave={handleSaveInsurance}
                  hasInsuranceInput={hasInsuranceInput}
                  onHasInsuranceInputChange={setHasInsuranceInput}
                  coveragePercentInput={coveragePercentInput}
                  onCoveragePercentInputChange={setCoveragePercentInput}
                  registeredFacilityCodeInput={registeredFacilityCodeInput}
                  onRegisteredFacilityCodeInputChange={setRegisteredFacilityCodeInput}
                  busy={busy}
                  savingInsurance={savingInsurance}
                />

                <InvoiceRefundSection
                  invoice={invoice}
                  canRefund={canRefund}
                  showRefundForm={showRefundForm}
                  onShowRefundForm={() => setShowRefundForm(true)}
                  onCancel={() => setShowRefundForm(false)}
                  onSubmit={handleRecordRefund}
                  refundItemId={refundItemId}
                  onRefundItemIdChange={setRefundItemId}
                  refundAmount={refundAmount}
                  onRefundAmountChange={setRefundAmount}
                  refundReason={refundReason}
                  onRefundReasonChange={setRefundReason}
                  busy={busy}
                  refunding={refunding}
                />
              </div>
            </div>

            <InvoiceAllocationsSection
              invoice={invoice}
              payers={payers}
              refreshInvoice={refreshInvoice}
              onBusyChange={setAllocationsBusy}
            />
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
