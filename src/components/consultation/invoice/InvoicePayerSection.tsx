import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { payerTypeLabel } from '@/utils/labels';
import type { Invoice, Payer } from './types';

interface InvoicePayerSectionProps {
  invoice: Invoice;
  payers: Payer[];
  showPayerForm: boolean;
  onShowPayerForm: () => void;
  onAssignPayer: (value: string) => void;
  busy: boolean;
}

export default function InvoicePayerSection({ invoice, payers, showPayerForm, onShowPayerForm, onAssignPayer, busy }: InvoicePayerSectionProps) {
  if (invoice.Status === 'cancelled') return null;

  return (
    <div className="mt-4 border-t border-[#e8edf2] pt-4">
      {!showPayerForm ? (
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-[#6c757d]">
            <span className="font-semibold text-[#274760]">Người chịu thanh toán: </span>
            {invoice.PayerID && invoice.Payer ? (
              <>
                {invoice.Payer.Name} · {payerTypeLabel(invoice.Payer.Type)}
              </>
            ) : (
              'Bệnh nhân'
            )}
          </div>
          {invoice.Status !== 'paid' && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onShowPayerForm}
              className="h-auto shrink-0 rounded-xl border-[#dde2e8] px-3 py-1.5 text-xs font-semibold text-[#274760]"
            >
              {invoice.PayerID ? 'Thay đổi' : 'Bảo lãnh – gán bên chịu trách nhiệm'}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold text-[#274760]">Người chịu thanh toán</label>
          <Select
            value={invoice.PayerID ? String(invoice.PayerID) : 'none'}
            onValueChange={onAssignPayer}
            disabled={busy}
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
      )}
    </div>
  );
}
