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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateInvoice, recordPayment } from '@/api/billing';
import { resolveError } from '@/utils/errorMessages';
import { invoiceStatusLabel, invoiceItemCategoryLabel, paymentMethodLabel } from '@/utils/labels';
import { toneBadgeClass } from '@/utils/badgeStyles';

interface InvoiceItem {
  ID: number | string;
  Category: string;
  Description: string;
  UnitPrice: number;
  Quantity: number;
  Amount: number;
}

interface Invoice {
  ID: number | string;
  Status: 'unpaid' | 'paid' | 'cancelled';
  TotalAmount: number;
  Items: InvoiceItem[] | null;
}

const PAYMENT_METHODS = ['cash', 'transfer', 'qr'] as const;

interface InvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  encounterId: string;
}

export default function InvoiceDialog({ open, onClose, encounterId }: InvoiceDialogProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('cash');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setInvoice(null);
    setMethod('cash');
    setLoading(true);
    generateInvoice(encounterId)
      .then(res => setInvoice(res.data))
      .catch(err => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [open, encounterId]);

  const closeDialog = () => {
    if (paying) return;
    onClose();
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setError('');
    setPaying(true);
    try {
      await recordPayment(invoice.ID, { amount: invoice.TotalAmount, method });
      const refreshed = await generateInvoice(encounterId);
      setInvoice(refreshed.data);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); }}>
      <DialogContent className="sm:max-w-[560px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">Hóa đơn viện phí</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-[#6c757d]">Đang tải…</div>
        ) : invoice ? (
          <>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[#6c757d]">Lượt khám #{encounterId}</span>
              <span className={toneBadgeClass(invoice.Status === 'paid' ? 'success' : invoice.Status === 'cancelled' ? 'neutral' : 'warning')}>
                {invoiceStatusLabel(invoice.Status)}
              </span>
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

            <div className="mt-4 flex items-center justify-between border-t border-[#e8edf2] pt-3.5">
              <span className="text-sm font-bold text-[#274760]">Tổng cộng</span>
              <span className="text-lg font-bold text-[#274760]">{invoice.TotalAmount.toLocaleString('vi-VN')} đ</span>
            </div>

            {invoice.Status === 'unpaid' && (
              <form onSubmit={handleRecordPayment} noValidate className="mt-4 flex items-end gap-2.5 border-t border-[#e8edf2] pt-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Phương thức thanh toán</label>
                  <Select value={method} onValueChange={value => setMethod(value as typeof method)}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{paymentMethodLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={paying} size="cta" className="shrink-0">
                  {paying ? 'Đang ghi nhận…' : 'Ghi nhận thanh toán'}
                </Button>
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
            disabled={paying}
            className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
          >
            <Icon icon="fa6-solid:xmark" className="mr-1.5 text-xs" />Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
