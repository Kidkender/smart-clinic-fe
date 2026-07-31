import { useEffect, useState, type FormEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { splitInvoice, submitClaim, recordClaimResponse, recordAllocationPayment } from '@/api/billing';
import { listEligibilityChecks } from '@/api/encounter';
import useConfirm from '@/hooks/useConfirm';
import { resolveError } from '@/utils/errorMessages';
import { allocationStatusLabel, claimStatusLabel, payerTypeLabel, paymentMethodLabel } from '@/utils/labels';
import { allocationStatusBadgeClass, claimStatusBadgeClass } from '@/utils/badgeStyles';
import { SELECTABLE_PAYMENT_METHODS, type Invoice, type InvoicePayerAllocation, type Payer } from './types';

interface InvoiceAllocationsSectionProps {
  invoice: Invoice;
  payers: Payer[];
  encounterId: string;
  refreshInvoice: () => Promise<Invoice>;
  onBusyChange: (busy: boolean) => void;
}

interface EligibilityCheck {
  ID: number;
  Result: 'eligible' | 'ineligible' | 'unknown';
  Policy: { PayerID: number } | null;
}

interface SplitRow {
  payerId: string;
  amount: string;
}

const emptySplitRow = (): SplitRow => ({ payerId: '', amount: '' });

const allocationPayerLabel = (allocation: InvoicePayerAllocation) => {
  if (!allocation.Payer) return 'Bệnh nhân';
  return `${allocation.Payer.Name} · ${payerTypeLabel(allocation.Payer.Type)}`;
};

// BHYT's "approved" status is set the instant the Coverage Engine computes
// it — no one at BHXH has actually reviewed anything yet, unlike an
// insurance_company allocation where "approved" really does mean the
// insurer approved a claim. Same status value, different real-world
// meaning, so the label needs to say which one this is.
const allocationRowStatusLabel = (allocation: InvoicePayerAllocation) => {
  if (allocation.Payer?.Type === 'government' && allocation.Status === 'approved') return 'Đã tính';
  return allocationStatusLabel(allocation.Status);
};

export default function InvoiceAllocationsSection({ invoice, payers, encounterId, refreshInvoice, onBusyChange }: InvoiceAllocationsSectionProps) {
  const [confirm, ConfirmDialog] = useConfirm();
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const [eligibilityChecks, setEligibilityChecks] = useState<EligibilityCheck[]>([]);

  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([emptySplitRow()]);
  const [splitting, setSplitting] = useState(false);

  const [claimAllocation, setClaimAllocation] = useState<InvoicePayerAllocation | null>(null);
  const [policyNumber, setPolicyNumber] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const [claimResponseAllocation, setClaimResponseAllocation] = useState<InvoicePayerAllocation | null>(null);
  const [claimResponseStatus, setClaimResponseStatus] = useState<'approved' | 'rejected'>('approved');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [claimResponseNote, setClaimResponseNote] = useState('');
  const [respondingClaim, setRespondingClaim] = useState(false);

  const [paymentAllocation, setPaymentAllocation] = useState<InvoicePayerAllocation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<(typeof SELECTABLE_PAYMENT_METHODS)[number]>('cash');
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    onBusyChange(actionBusy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionBusy]);

  useEffect(() => {
    listEligibilityChecks(encounterId)
      .then(r => setEligibilityChecks(r.data ?? []))
      .catch(() => setEligibilityChecks([]));
  }, [encounterId]);

  if (invoice.Status === 'cancelled') return null;

  const allocations = invoice.Allocations ?? [];
  const thirdPartyAllocations = allocations.filter(a => a.Payer && a.Payer.Type !== 'government');

  // Most recent check wins (API already orders by checked_at desc) — this is
  // what check-in declared as eligible, used only to pre-fill the first
  // split row so billing doesn't re-ask for a payer reception already
  // validated. Staff can still change/remove it; nothing here is binding.
  const declaredEligiblePayer = eligibilityChecks
    .find(c => c.Result === 'eligible' && c.Policy)
    ?.Policy?.PayerID;

  const splitTotal = splitRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const patientRemainder = Math.max(invoice.TotalAmount - splitTotal, 0);

  const openSplitDialog = () => {
    if (thirdPartyAllocations.length > 0) {
      setSplitRows(thirdPartyAllocations.map(a => ({ payerId: String(a.PayerID), amount: String(a.AllocatedAmount) })));
    } else if (declaredEligiblePayer != null && payers.some(p => String(p.ID) === String(declaredEligiblePayer))) {
      setSplitRows([{ payerId: String(declaredEligiblePayer), amount: '' }]);
    } else {
      setSplitRows([emptySplitRow()]);
    }
    setShowSplitDialog(true);
  };

  const closeSplitDialog = () => {
    if (splitting) return;
    setShowSplitDialog(false);
    setSplitRows([emptySplitRow()]);
  };

  const handleAddSplitRow = () => setSplitRows(rows => [...rows, emptySplitRow()]);
  const handleRemoveSplitRow = (index: number) => setSplitRows(rows => rows.filter((_, i) => i !== index));
  const handleSplitRowChange = (index: number, field: keyof SplitRow, value: string) => {
    setSplitRows(rows => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmitSplit = async (e: FormEvent) => {
    e.preventDefault();
    if (splitRows.some(row => !row.payerId || !row.amount)) {
      setError('Vui lòng chọn payer và nhập số tiền cho tất cả các dòng.');
      return;
    }
    if (splitRows.some(row => !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0)) {
      setError('Số tiền phân bổ phải là số dương.');
      return;
    }
    setError('');
    if (!(await confirm(`Xác nhận chia hóa đơn thành ${splitRows.length} payer, bệnh nhân còn lại ${patientRemainder.toLocaleString('vi-VN')} đ?`, { confirmLabel: 'Xác nhận', danger: false }))) {
      return;
    }
    setSplitting(true);
    setActionBusy(true);
    try {
      await splitInvoice(invoice.ID, splitRows.map((row, index) => ({
        payer_id: Number(row.payerId),
        sequence: index + 1,
        allocated_amount: Number(row.amount),
        note: '',
      })));
      await refreshInvoice();
      closeSplitDialog();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSplitting(false);
      setActionBusy(false);
    }
  };

  const closeClaimDialog = () => {
    if (submittingClaim) return;
    setClaimAllocation(null);
    setPolicyNumber('');
  };

  const handleSubmitClaim = async (e: FormEvent) => {
    e.preventDefault();
    if (!claimAllocation) return;
    if (!policyNumber.trim()) {
      setError('Vui lòng nhập số thẻ bảo hiểm.');
      return;
    }
    setError('');
    if (!(await confirm(`Xác nhận gửi claim cho "${allocationPayerLabel(claimAllocation)}"?`, { confirmLabel: 'Xác nhận', danger: false }))) {
      return;
    }
    setSubmittingClaim(true);
    setActionBusy(true);
    try {
      await submitClaim(invoice.ID, claimAllocation.ID, { policy_number: policyNumber.trim() });
      await refreshInvoice();
      closeClaimDialog();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSubmittingClaim(false);
      setActionBusy(false);
    }
  };

  const closeClaimResponseDialog = () => {
    if (respondingClaim) return;
    setClaimResponseAllocation(null);
    setClaimResponseStatus('approved');
    setApprovedAmount('');
    setReferenceNumber('');
    setClaimResponseNote('');
  };

  const handleSubmitClaimResponse = async (e: FormEvent) => {
    e.preventDefault();
    if (!claimResponseAllocation?.Claim) return;
    let parsedApprovedAmount: number | null = null;
    if (claimResponseStatus === 'approved') {
      parsedApprovedAmount = Number(approvedAmount);
      if (!Number.isFinite(parsedApprovedAmount) || parsedApprovedAmount < 0) {
        setError('Số tiền duyệt không hợp lệ.');
        return;
      }
      if (parsedApprovedAmount > claimResponseAllocation.Claim.SubmittedAmount) {
        setError('Số tiền duyệt không được vượt quá số tiền đã gửi claim.');
        return;
      }
    }
    setError('');
    if (!(await confirm('Xác nhận ghi nhận kết quả duyệt claim?', { confirmLabel: 'Xác nhận', danger: false }))) {
      return;
    }
    setRespondingClaim(true);
    setActionBusy(true);
    try {
      await recordClaimResponse(invoice.ID, claimResponseAllocation.ID, {
        status: claimResponseStatus,
        approved_amount: parsedApprovedAmount,
        reference_number: referenceNumber.trim(),
        note: claimResponseNote.trim(),
      });
      await refreshInvoice();
      closeClaimResponseDialog();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setRespondingClaim(false);
      setActionBusy(false);
    }
  };

  const closePaymentDialog = () => {
    if (recordingPayment) return;
    setPaymentAllocation(null);
    setPaymentAmount('');
    setPaymentMethod('cash');
  };

  const handleSubmitAllocationPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentAllocation) return;
    const parsed = Number(paymentAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Số tiền thanh toán không hợp lệ.');
      return;
    }
    setError('');
    if (!(await confirm(`Xác nhận ghi nhận thanh toán ${parsed.toLocaleString('vi-VN')} đ cho "${allocationPayerLabel(paymentAllocation)}"?`, { confirmLabel: 'Xác nhận', danger: false }))) {
      return;
    }
    setRecordingPayment(true);
    setActionBusy(true);
    try {
      await recordAllocationPayment(invoice.ID, paymentAllocation.ID, { amount: parsed, method: paymentMethod });
      await refreshInvoice();
      closePaymentDialog();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setRecordingPayment(false);
      setActionBusy(false);
    }
  };

  return (
    <div className="mt-4 border-t border-[#e8edf2] pt-4">
      {ConfirmDialog}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#274760]">Phân bổ chi trả</span>
        {invoice.Status !== 'paid' && (
          <Button
            type="button"
            variant="outline"
            disabled={actionBusy}
            onClick={openSplitDialog}
            className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
          >
            {thirdPartyAllocations.length > 0 ? 'Sửa phân bổ' : 'Phân bổ thanh toán'}
          </Button>
        )}
      </div>

      {allocations.length === 0 ? (
        // GenerateInvoice always runs the coverage/allocation pipeline before
        // the dialog shows data, and it always seeds a default patient
        // allocation unless there's an unresolved private-insurance signal
        // (an eligible EncounterEligibilityCheck with no SplitInvoice yet) —
        // so an empty list here can only mean "chưa phân bổ", never self-pay.
        <ErrorAlert variant="compact" className="mt-2.5">
          Hóa đơn chưa được phân bổ — cần bấm "Phân bổ thanh toán" trước khi thu tiền.
        </ErrorAlert>
      ) : (
        <Table className="mt-2.5">
          <TableHeader>
            <TableRow>
              <TableHead>Payer</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map(allocation => (
              <TableRow key={allocation.ID}>
                <TableCell className="text-[13px] font-medium text-[#274760]">
                  {allocation.Payer ? allocation.Payer.Name : 'Bệnh nhân'}
                </TableCell>
                <TableCell className="text-[13px] text-[#6c757d]">
                  {allocation.Payer ? payerTypeLabel(allocation.Payer.Type) : 'Bệnh nhân'}
                </TableCell>
                <TableCell className="text-[13px] text-[#274760]">
                  {allocation.AllocatedAmount.toLocaleString('vi-VN')} đ
                </TableCell>
                <TableCell>
                  <span className={allocationStatusBadgeClass(allocation.Status)}>{allocationRowStatusLabel(allocation)}</span>
                </TableCell>
                <TableCell>
                  {allocation.Claim ? (
                    <span className={claimStatusBadgeClass(allocation.Claim.Status)}>{claimStatusLabel(allocation.Claim.Status)}</span>
                  ) : (
                    <span className="text-xs text-[#6c757d]">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {allocation.Payer?.Type === 'insurance_company' && !allocation.Claim && (
                      <Button
                        type="button"
                        variant="outline"
                        size="cta-xs"
                        disabled={actionBusy}
                        onClick={() => setClaimAllocation(allocation)}
                      >
                        Gửi claim
                      </Button>
                    )}
                    {allocation.Claim?.Status === 'pending' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="cta-xs"
                        disabled={actionBusy}
                        onClick={() => setClaimResponseAllocation(allocation)}
                      >
                        Ghi nhận kết quả duyệt
                      </Button>
                    )}
                    {allocation.Payer && allocation.Payer.Type !== 'government' && allocation.Status !== 'settled' && (allocation.Status === 'approved' || allocation.Status === 'pending') && (
                      <Button
                        type="button"
                        size="cta-xs"
                        disabled={actionBusy}
                        onClick={() => {
                          setPaymentAllocation(allocation);
                          setPaymentAmount(String(allocation.AllocatedAmount));
                        }}
                      >
                        Ghi nhận thanh toán
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-[13px] font-bold text-[#274760]">Tổng</TableCell>
              <TableCell className="text-[13px] font-bold text-[#274760]">
                {allocations.reduce((sum, a) => sum + a.AllocatedAmount, 0).toLocaleString('vi-VN')} đ
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {error && <ErrorAlert icon={false} className="mt-2.5">{error}</ErrorAlert>}

      <Dialog open={showSplitDialog} onOpenChange={o => { if (!o) closeSplitDialog(); }}>
        <DialogContent className="sm:max-w-[560px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#274760]">
              {thirdPartyAllocations.length > 0 ? 'Sửa phân bổ' : 'Phân bổ thanh toán'}
            </DialogTitle>
          </DialogHeader>
          {thirdPartyAllocations.length === 0 && declaredEligiblePayer != null && (
            <p className="m-0 -mt-2 text-xs text-[#6c757d]">
              Đã tự điền công ty bảo hiểm bệnh nhân khai báo lúc check-in — nhập số tiền và chỉnh lại nếu cần.
            </p>
          )}
          <form onSubmit={handleSubmitSplit} noValidate className="flex flex-col gap-2.5">
            {splitRows.map((row, index) => (
              <div key={index} className="flex items-end gap-2.5">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Payer</label>
                  <Select value={row.payerId} onValueChange={value => handleSplitRowChange(index, 'payerId', value)}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                      <SelectValue placeholder="Chọn payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {payers.map(p => (
                        <SelectItem key={p.ID} value={String(p.ID)}>
                          {p.Name} · {payerTypeLabel(p.Type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[160px]">
                  <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tiền</label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={row.amount}
                    onChange={e => handleSplitRowChange(index, 'amount', e.target.value)}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                  />
                </div>
                {splitRows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveSplitRow(index)}
                  >
                    <Icon icon="fa6-solid:xmark" className="text-xs" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="cta-sm" onClick={handleAddSplitRow} className="self-start">
              <Icon icon="fa6-solid:plus" className="mr-1.5 text-xs" />Thêm payer
            </Button>
            <div className="mt-1 flex items-center justify-between rounded-xl bg-[#f4f7fa] px-4 py-3 text-sm font-semibold text-[#274760]">
              <span>Bệnh nhân còn lại</span>
              <span>{patientRemainder.toLocaleString('vi-VN')} đ</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={splitting} onClick={closeSplitDialog}>Hủy</Button>
              <Button type="submit" disabled={splitting} size="cta">{splitting ? 'Đang chia…' : 'Xác nhận'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!claimAllocation} onOpenChange={o => { if (!o) closeClaimDialog(); }}>
        <DialogContent className="sm:max-w-[440px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#274760]">Gửi claim bảo hiểm</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitClaim} noValidate className="flex flex-col gap-2.5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số thẻ bảo hiểm</label>
              <Input
                value={policyNumber}
                onChange={e => setPolicyNumber(e.target.value)}
                placeholder="VD: DN4010112345678"
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={submittingClaim} onClick={closeClaimDialog}>Hủy</Button>
              <Button type="submit" disabled={submittingClaim} size="cta">{submittingClaim ? 'Đang gửi…' : 'Gửi claim'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!claimResponseAllocation} onOpenChange={o => { if (!o) closeClaimResponseDialog(); }}>
        <DialogContent className="sm:max-w-[480px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#274760]">Ghi nhận kết quả duyệt claim</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitClaimResponse} noValidate className="flex flex-col gap-2.5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Kết quả</label>
              <Select value={claimResponseStatus} onValueChange={value => setClaimResponseStatus(value as 'approved' | 'rejected')}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {claimResponseStatus === 'approved' && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tiền duyệt</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={approvedAmount}
                  onChange={e => setApprovedAmount(e.target.value)}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tham chiếu</label>
              <Input
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Ghi chú</label>
              <Input
                value={claimResponseNote}
                onChange={e => setClaimResponseNote(e.target.value)}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={respondingClaim} onClick={closeClaimResponseDialog}>Hủy</Button>
              <Button type="submit" disabled={respondingClaim} size="cta">{respondingClaim ? 'Đang ghi nhận…' : 'Xác nhận'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentAllocation} onOpenChange={o => { if (!o) closePaymentDialog(); }}>
        <DialogContent className="sm:max-w-[440px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#274760]">Ghi nhận thanh toán</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAllocationPayment} noValidate className="flex flex-col gap-2.5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Số tiền</label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Phương thức</label>
              <Select value={paymentMethod} onValueChange={value => setPaymentMethod(value as (typeof SELECTABLE_PAYMENT_METHODS)[number])}>
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
            <DialogFooter>
              <Button type="button" variant="outline" disabled={recordingPayment} onClick={closePaymentDialog}>Hủy</Button>
              <Button type="submit" disabled={recordingPayment} size="cta">{recordingPayment ? 'Đang ghi nhận…' : 'Xác nhận'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
