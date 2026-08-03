import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listPayers, createPayer, getPayerDebt } from '@/api/payer';
import { resolveError } from '@/utils/errorMessages';
import { payerTypeLabel, invoiceStatusLabel } from '@/utils/labels';
import { invoiceStatusBadgeClass } from '@/utils/badgeStyles';
import { payerSchema, type PayerFormValues } from '@/schemas/payer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import SortableTableHead from '@/components/ui/sortable-table-head';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FieldError from '@/components/FieldError';

const DEBT_PAGE_LIMIT = 10;

interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
  ContactPhone: string;
  ContactEmail: string;
}

interface DebtInvoice {
  invoice_id: number | string;
  invoice_status: string;
  allocated_amount: number;
  remaining: number;
  created_at: string;
}

interface DebtSummary {
  payer_id: number | string;
  outstanding_total: number;
  invoices: DebtInvoice[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function Payers() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);
  const [debt, setDebt] = useState<DebtSummary | null>(null);
  const [debtLoading, setDebtLoading] = useState(false);
  const [debtError, setDebtError] = useState('');
  const [debtPage, setDebtPage] = useState(1);
  const [debtSortBy, setDebtSortBy] = useState('created_at');
  const [debtSortDir, setDebtSortDir] = useState<'asc' | 'desc'>('desc');

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<PayerFormValues>({
    resolver: zodResolver(payerSchema),
    defaultValues: { name: '', type: 'insurance_company', contact_phone: '', contact_email: '' },
  });

  const fetchPayers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listPayers();
      setPayers(res.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayers(); }, [fetchPayers]);

  const handleCreate = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await createPayer({
        name: values.name.trim(),
        type: values.type,
        contact_phone: values.contact_phone.trim(),
        contact_email: values.contact_email.trim(),
      });
      reset({ name: '', type: 'insurance_company', contact_phone: '', contact_email: '' });
      await fetchPayers();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const fetchDebt = useCallback(async (payer: Payer, page: number, sortBy: string, sortDir: 'asc' | 'desc') => {
    setDebtError('');
    setDebtLoading(true);
    try {
      const res = await getPayerDebt(payer.ID, { page, limit: DEBT_PAGE_LIMIT, sort_by: sortBy, sort_dir: sortDir });
      setDebt(res.data);
    } catch (err) {
      setDebtError(resolveError(err));
    } finally {
      setDebtLoading(false);
    }
  }, []);

  const handleViewDebt = (payer: Payer) => {
    setSelectedPayer(payer);
    setDebt(null);
    setDebtPage(1);
    setDebtSortBy('created_at');
    setDebtSortDir('desc');
    fetchDebt(payer, 1, 'created_at', 'desc');
  };

  useEffect(() => {
    if (!selectedPayer) return;
    fetchDebt(selectedPayer, debtPage, debtSortBy, debtSortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtPage, debtSortBy, debtSortDir]);

  const handleDebtSort = (column: string) => {
    if (debtSortBy === column) {
      setDebtSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setDebtSortBy(column);
      setDebtSortDir('asc');
    }
    setDebtPage(1);
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Bên bảo lãnh viện phí</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Quản lý các công ty bảo hiểm bảo lãnh và công nợ chưa thu. Bệnh nhân tự thanh toán không cần khai báo ở đây.
        </p>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="mb-5 rounded-2xl border-[#e8edf2] p-6">
        <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Thêm bên bảo lãnh mới</h2>
        <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-start gap-2.5">
          <div className="min-w-[220px] flex-1">
            <Input
              {...register('name')}
              placeholder="Tên (VD: Bảo Việt, Prudential...)"
              aria-invalid={!!errors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="w-[180px]">
            <Input
              {...register('contact_phone')}
              placeholder="Số điện thoại liên hệ"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
          </div>
          <div className="w-[220px]">
            <Input
              {...register('contact_email')}
              placeholder="Email liên hệ"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
          </div>
          <Button type="submit" disabled={saving} size="cta" className="shrink-0">
            {saving ? 'Đang lưu…' : 'Thêm'}
          </Button>
        </form>
        {formError && <ErrorAlert icon={false} className="mt-2.5">{formError}</ErrorAlert>}
      </Card>

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : payers.length === 0 ? (
        <div className="p-10 text-center text-[#6c757d]">Chưa có bên bảo lãnh nào.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-5">
          {payers.map(payer => (
            <Card key={payer.ID} className="rounded-2xl border-[#e8edf2] p-6">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="m-0 text-[17px] font-bold text-[#274760]">{payer.Name}</h2>
                <span className="text-xs font-semibold text-[#6c757d]">{payerTypeLabel(payer.Type)}</span>
              </div>
              {(payer.ContactPhone || payer.ContactEmail) && (
                <p className="mb-3 text-xs text-[#6c757d]">
                  {[payer.ContactPhone, payer.ContactEmail].filter(Boolean).join(' · ')}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleViewDebt(payer)}
                className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2 text-xs font-semibold text-[#274760]"
              >
                <Icon icon="fa6-solid:file-invoice-dollar" className="mr-1.5 text-[11px]" />Xem công nợ
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPayer} onOpenChange={open => { if (!open) setSelectedPayer(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[20px] p-8 sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Công nợ — {selectedPayer?.Name}</DialogTitle>
          </DialogHeader>

          {debtError && <ErrorAlert icon={false}>{debtError}</ErrorAlert>}

          {debt && (
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#274760]">Tổng công nợ còn lại</span>
              <span className="text-base font-bold text-[#dc3545]">
                {debt.outstanding_total.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}

          {debtLoading ? (
            <p className="text-xs text-[#6c757d]">Đang tải…</p>
          ) : debt && debt.invoices.length === 0 ? (
            <p className="text-xs text-[#6c757d]">Không có hóa đơn nào còn nợ.</p>
          ) : debt ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                    <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Hóa đơn</TableHead>
                    <SortableTableHead label="Ngày tạo" column="created_at" sortBy={debtSortBy} sortDir={debtSortDir} onSort={handleDebtSort} />
                    <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                    <SortableTableHead label="Còn nợ" column="remaining" sortBy={debtSortBy} sortDir={debtSortDir} onSort={handleDebtSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debt.invoices.map(inv => (
                    <TableRow key={inv.invoice_id} className="border-t border-[#f0f4f8]">
                      <TableCell className="px-4 py-3 text-sm text-[#274760]">#{inv.invoice_id}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#274760]">
                        {new Date(inv.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        <span className={invoiceStatusBadgeClass(inv.invoice_status)}>{invoiceStatusLabel(inv.invoice_status)}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-[#274760]">
                        {inv.remaining.toLocaleString('vi-VN')} đ
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={debt.page}
                totalPages={Math.max(debt.total_pages, 1)}
                total={debt.total}
                onPageChange={setDebtPage}
                itemLabel="hóa đơn"
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
