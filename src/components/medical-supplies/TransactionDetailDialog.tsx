import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supplyStockTransactionTypeLabel, supplyStockTransactionTypeBadgeClass, supplyStockTransactionReferenceLabel } from '@/utils/labels';
import type { SupplyStockTransaction } from './types';

interface TransactionDetailDialogProps {
  transaction: SupplyStockTransaction | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f0f4f8] py-2.5 last:border-b-0">
      <span className="text-sm text-[#6c757d]">{label}</span>
      <span className="text-sm font-semibold text-[#274760]">{value}</span>
    </div>
  );
}

export default function TransactionDetailDialog({ transaction, onClose }: TransactionDetailDialogProps) {
  const t = transaction;
  const batch = t?.Batch;

  return (
    <Dialog open={!!t} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] rounded-[20px] p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#274760]">
            Chi tiết giao dịch — {t?.Supply?.Name ?? `#${t?.SupplyID}`}
          </DialogTitle>
        </DialogHeader>
        {t && (
          <div className="mt-2">
            <DetailRow label="Thời gian" value={new Date(t.CreatedAt).toLocaleString('vi-VN')} />
            <DetailRow
              label="Loại giao dịch"
              value={<Badge className={supplyStockTransactionTypeBadgeClass(t.Type)}>{supplyStockTransactionTypeLabel(t.Type)}</Badge>}
            />
            <DetailRow
              label="Số lượng"
              value={<span className={t.Quantity < 0 ? 'text-[#dc3545]' : 'text-[#198754]'}>{t.Quantity > 0 ? `+${t.Quantity}` : t.Quantity}</span>}
            />
            {batch && (
              <>
                <DetailRow label="Số lô" value={batch.LotNumber} />
                <DetailRow label="Hạn sử dụng" value={batch.ExpiryDate ? new Date(batch.ExpiryDate).toLocaleDateString('vi-VN') : '—'} />
                <DetailRow label="Nhà cung cấp" value={batch.Supplier || '—'} />
                <DetailRow label="Đơn giá lô" value={`${batch.UnitCost?.toLocaleString('vi-VN')} đ`} />
                <DetailRow label="Còn lại trong lô" value={batch.QuantityRemaining} />
              </>
            )}
            <DetailRow label="Ghi chú" value={t.Notes || supplyStockTransactionReferenceLabel(t.Reference) || '—'} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
