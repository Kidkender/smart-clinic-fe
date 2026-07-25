import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createStockAudit, listStockAudits } from '@/api/inventory';
import { resolveError } from '@/utils/errorMessages';
import { stockAuditStatusLabel, stockAuditStatusBadgeClass } from '@/utils/labels';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StockAudit } from '@/components/inventory/types';
import InventoryTabs from '@/components/inventory/InventoryTabs';

const createAuditSchema = z.object({
  notes: z.string(),
});

type CreateAuditFormValues = z.infer<typeof createAuditSchema>;

export default function StockAudits() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<StockAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, reset,
  } = useForm<CreateAuditFormValues>({
    resolver: zodResolver(createAuditSchema),
    defaultValues: { notes: '' },
  });

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listStockAudits();
      setAudits(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const openCreate = () => {
    reset({ notes: '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      const auditDate = new Date().toISOString().slice(0, 10);
      const result = await createStockAudit({ audit_date: auditDate, notes: values.notes.trim() });
      setModalOpen(false);
      navigate(`/inventory/audits/${result.data.ID}`);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Kiểm kê kho</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Các đợt kiểm kê định kỳ và xử lý chênh lệch tồn kho</p>
        </div>
        <Button onClick={openCreate} size="cta">
          <Icon icon="fa6-solid:plus" className="text-sm" />
          Tạo đợt kiểm kê mới
        </Button>
      </div>

      <InventoryTabs />

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : audits.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Chưa có đợt kiểm kê nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ngày kiểm kê</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ghi chú</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Hoàn tất lúc</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(a => (
                <TableRow key={a.ID} onClick={() => navigate(`/inventory/audits/${a.ID}`)} className="cursor-pointer border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#307bc4]">{new Date(a.AuditDate).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Notes || '—'}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={stockAuditStatusBadgeClass(a.Status)}>{stockAuditStatusLabel(a.Status)}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {a.CompletedAt ? new Date(a.CompletedAt).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="sm:max-w-[460px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Tạo đợt kiểm kê mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate>
            <p className="mt-4 mb-0 text-sm text-[#6c757d]">
              Hệ thống sẽ chụp lại tồn kho hiện tại của toàn bộ danh mục thuốc để đối chiếu khi kiểm đếm.
            </p>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ghi chú</label>
            <Textarea {...register('notes')} placeholder="VD: Kiểm kê định kỳ quý 3/2026" className="min-h-[80px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]" />

            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="cta"
              >
                {saving ? 'Đang tạo…' : 'Tạo đợt kiểm kê'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
