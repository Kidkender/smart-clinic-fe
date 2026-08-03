import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { getDispenseQueue, callNextDispense } from '@/api/prescription';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toneBadgeClass } from '@/utils/badgeStyles';
import PharmacyTabs from '@/components/pharmacy/PharmacyTabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DispenseQueueItem {
  prescription_id: number | string;
  encounter_id: number | string;
  patient_name: string;
  patient_mrn: string;
  dispense_queue_number: number;
  ready_at: string;
  dispense_called_at?: string | null;
  payment_settled: boolean;
}

export default function PharmacyDispenseQueue() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DispenseQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDispenseQueue();
      setItems(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const currentlyCalled = items.find(item => item.dispense_called_at);
  // "Đang chờ" only counts patients who already paid — an unpaid one is not
  // eligible to be called next (see CallNextDispense on the backend), so it
  // must not inflate the count that gates the "Gọi tiếp theo" button.
  const waitingCount = items.filter(item => !item.dispense_called_at && item.payment_settled).length;
  const pendingPaymentCount = items.filter(item => !item.dispense_called_at && !item.payment_settled).length;

  const handleCallNext = async () => {
    setCalling(true);
    setError('');
    try {
      const result = await callNextDispense();
      const called: DispenseQueueItem | undefined = result.data;
      if (called) {
        navigate(`/pharmacy/worklist/${called.encounter_id}/${called.prescription_id}`);
        return;
      }
      await fetchQueue();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setCalling(false);
    }
  };

  const openDetail = (item: DispenseQueueItem) => {
    navigate(`/pharmacy/worklist/${item.encounter_id}/${item.prescription_id}`);
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hàng chờ cấp thuốc ngoại trú</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Bệnh nhân đã thanh toán/đủ thuốc, đang chờ được gọi số để nhận thuốc tại quầy.
        </p>
      </div>

      <PharmacyTabs />

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <Card className="rounded-2xl border-[#e8edf2] px-5 py-4.5">
          <div className="text-xs font-bold tracking-wide text-[#6c757d] uppercase">Đang chờ (đã thanh toán)</div>
          <div className="mt-1 text-2xl font-bold text-[#307bc4]">{waitingCount}</div>
        </Card>
        <Card className="rounded-2xl border-[#e8edf2] px-5 py-4.5">
          <div className="text-xs font-bold tracking-wide text-[#6c757d] uppercase">Chờ thanh toán</div>
          <div className="mt-1 text-2xl font-bold text-[#e0a800]">{pendingPaymentCount}</div>
        </Card>
        <Card className="rounded-2xl border-[#e8edf2] px-5 py-4.5">
          <div className="text-xs font-bold tracking-wide text-[#6c757d] uppercase">Đang gọi số</div>
          <div className="mt-1 text-2xl font-bold text-[#198754]">
            {currentlyCalled ? `#${currentlyCalled.dispense_queue_number} — ${currentlyCalled.patient_name}` : '—'}
          </div>
        </Card>
        <Card className="flex-row items-center justify-between rounded-2xl border-[#e8edf2] px-5 py-4.5">
          <div className="text-xs font-bold tracking-wide text-[#6c757d] uppercase">Gọi số tiếp theo</div>
          <Button
            variant="outline"
            onClick={handleCallNext}
            disabled={calling || waitingCount === 0 || !!currentlyCalled}
            title={currentlyCalled ? 'Cần hoàn tất cấp phát cho số đang gọi trước khi gọi số tiếp theo.' : undefined}
            className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
          >
            {calling ? 'Đang gọi…' : 'Gọi tiếp theo'}
          </Button>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:hashtag" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Hàng chờ cấp thuốc trống</h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3">STT</TableHead>
                <TableHead className="h-auto px-4 py-3">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3">Đơn thuốc</TableHead>
                <TableHead className="h-auto px-4 py-3">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow
                  key={item.prescription_id}
                  onClick={() => openDetail(item)}
                  className="cursor-pointer border-t border-[#f0f4f8] hover:bg-[#f4f7fa]"
                >
                  <TableCell className="px-4 py-3 text-sm font-bold text-[#274760]">
                    {item.dispense_queue_number}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {item.patient_name} <span className="text-xs text-[#6c757d]">({item.patient_mrn})</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">Đơn #{item.prescription_id}</TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    {item.dispense_called_at ? (
                      <Badge className={toneBadgeClass('success')}>Đang gọi</Badge>
                    ) : !item.payment_settled ? (
                      <Badge className={toneBadgeClass('warning')}>Chờ thanh toán</Badge>
                    ) : (
                      <Badge className={toneBadgeClass('neutral')}>Đang chờ</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
