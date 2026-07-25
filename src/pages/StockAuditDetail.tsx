import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import {
  getStockAudit, updateStockAuditItem, finalizeStockAudit,
} from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { stockAuditStatusLabel, stockAuditStatusBadgeClass } from '@/utils/labels';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StockAudit, StockAuditItem } from '@/components/inventory/types';

export default function StockAuditDetail() {
  const { id = '' } = useParams();
  const [audit, setAudit] = useState<StockAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getStockAudit(id);
      setAudit(result.data);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const isDraft = audit?.Status === 'draft';
  const items = audit?.Items ?? [];
  const incompleteCount = items.filter(i => i.CountedQuantity == null).length;

  const handleFinalize = async () => {
    if (!(await confirm(
      'Hoàn tất kiểm kê sẽ cập nhật tồn kho theo số đếm thực tế và không thể hoàn tác. Tiếp tục?',
      { confirmLabel: 'Hoàn tất kiểm kê' },
    ))) return;
    setFinalizing(true);
    setError('');
    try {
      await finalizeStockAudit(id);
      await fetchAudit();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }
  if (error && !audit) {
    return <ErrorAlert>{error}</ErrorAlert>;
  }
  if (!audit) return null;

  return (
    <>
      <Link to="/inventory/audits" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#307bc4] no-underline">
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Danh sách kiểm kê
      </Link>

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-[22px] font-bold text-[#274760]">
              Kiểm kê ngày {new Date(audit.AuditDate).toLocaleDateString('vi-VN')}
            </h1>
            {audit.Notes && <p className="mt-1 mb-0 text-sm text-[#6c757d]">{audit.Notes}</p>}
          </div>
          <div className="flex items-center gap-2.5">
            <Badge className={stockAuditStatusBadgeClass(audit.Status)}>{stockAuditStatusLabel(audit.Status)}</Badge>
            {isDraft && (
              <Button
                onClick={handleFinalize}
                disabled={finalizing || incompleteCount > 0}
                title={incompleteCount > 0 ? 'Cần nhập đủ số đếm thực tế cho tất cả thuốc trước khi hoàn tất' : undefined}
                size="cta"
              >
                <Icon icon="fa6-solid:clipboard-check" className="text-xs" />
                {finalizing ? 'Đang hoàn tất…' : 'Hoàn tất kiểm kê'}
              </Button>
            )}
          </div>
        </div>
        {isDraft && incompleteCount > 0 && (
          <p className="mt-3.5 mb-0 text-[13px] text-[#8a6100]">
            Còn {incompleteCount} thuốc chưa nhập số đếm thực tế.
          </p>
        )}
        {error && (
          <ErrorAlert icon={false} className="mt-3.5">{error}</ErrorAlert>
        )}
      </Card>

      <Card className="mt-5 gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {items.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không có thuốc nào trong đợt kiểm kê này.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thuốc</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Tồn kho hệ thống</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Số đếm thực tế</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Chênh lệch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <AuditItemRow
                  key={item.ID}
                  auditId={id}
                  item={item}
                  editable={isDraft}
                  onSaved={fetchAudit}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {ConfirmDialog}
    </>
  );
}

interface AuditItemRowProps {
  auditId: string;
  item: StockAuditItem;
  editable: boolean;
  onSaved: () => Promise<void>;
}

function AuditItemRow({ auditId, item, editable, onSaved }: AuditItemRowProps) {
  const [counted, setCounted] = useState(item.CountedQuantity != null ? String(item.CountedQuantity) : '');
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    setCounted(item.CountedQuantity != null ? String(item.CountedQuantity) : '');
  }, [item.CountedQuantity]);

  const dirty = counted.trim() !== '' && Number(counted) !== item.CountedQuantity;

  const handleSave = async () => {
    if (counted.trim() === '') return;
    setRowError('');
    setSaving(true);
    try {
      await updateStockAuditItem(auditId, item.ID, { counted_quantity: Number(counted) });
      await onSaved();
    } catch (err) {
      setRowError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow className="border-t border-[#f0f4f8]">
      <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">{item.Drug?.Name ?? `#${item.DrugID}`}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-[#274760]">{item.ExpectedQuantity}</TableCell>
      <TableCell className="px-4 py-3">
        {editable ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              value={counted}
              onChange={e => setCounted(e.target.value)}
              className="h-auto w-24 rounded-lg border-[#dde2e8] px-2.5 py-1.5 text-sm text-[#274760]"
            />
            <Button
              type="button"
              size="cta-xs"
              variant="outline"
              disabled={!dirty || saving}
              onClick={handleSave}
              className="border-[#dde2e8] text-[#274760]"
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            {rowError && <span className="text-xs text-[#dc3545]">{rowError}</span>}
          </div>
        ) : (
          item.CountedQuantity ?? '—'
        )}
      </TableCell>
      <TableCell
        className={
          item.Variance == null
            ? 'px-4 py-3 text-sm text-[#6c757d]'
            : `px-4 py-3 text-sm font-semibold ${item.Variance === 0 ? 'text-[#274760]' : item.Variance > 0 ? 'text-[#198754]' : 'text-[#dc3545]'}`
        }
      >
        {item.Variance == null ? '—' : item.Variance > 0 ? `+${item.Variance}` : item.Variance}
      </TableCell>
    </TableRow>
  );
}
