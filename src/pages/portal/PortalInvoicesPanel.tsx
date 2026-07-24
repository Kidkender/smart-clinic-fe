import { invoiceStatusLabel } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { portalAppointmentStatusBadgeClass } from '@/utils/badgeStyles';
import { Card } from '@/components/ui/card';
import type { Invoice } from './types';

export default function PortalInvoicesPanel({
  invoices,
  loading,
}: {
  invoices: Invoice[] | null;
  loading: boolean;
}) {
  return (
    <div className="mt-5">
      <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Hóa đơn của tôi</h2>
      {loading ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
      ) : !invoices || invoices.length === 0 ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Chưa có hóa đơn nào.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map(inv => (
            <Card key={inv.ID} className="rounded-2xl border-[#d1fae5] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <div className="font-bold text-[#134e48]">
                    {inv.TotalAmount?.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="mt-1 text-[13px] text-[#6c757d]">
                    {new Date(inv.CreatedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <span className={cn('inline-block', portalAppointmentStatusBadgeClass(inv.Status === 'paid' ? 'booked' : inv.Status === 'unpaid' ? 'no_show' : 'cancelled'))}>
                  {invoiceStatusLabel(inv.Status)}
                </span>
              </div>
              {(inv.Items ?? []).length > 0 && (
                <ul className="m-0 mt-2.5 pl-4.5">
                  {inv.Items!.map(item => (
                    <li key={item.ID} className="text-[13px] text-[#6c757d]">
                      {item.Description} — {item.Amount?.toLocaleString('vi-VN')} đ
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
