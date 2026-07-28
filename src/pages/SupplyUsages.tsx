import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listSupplyUsages } from '@/api/medicalSupply';
import { resolveError } from '@/utils/errorMessages';
import { useAuth } from '@/context/AuthContext';
import MedicalSupplyTabs from '@/components/medical-supplies/MedicalSupplyTabs';
import RecordUsageDialog from '@/components/medical-supplies/RecordUsageDialog';
import type { SupplyUsage } from '@/components/medical-supplies/types';

const USAGE_RECORDER_ROLES = ['admin', 'doctor', 'nurse', 'pharmacist'];
const PAGE_LIMIT = 20;

export default function SupplyUsages() {
  const { role } = useAuth();
  const canRecord = role != null && USAGE_RECORDER_ROLES.includes(role);

  const [usages, setUsages] = useState<SupplyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [encounterFilter, setEncounterFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listSupplyUsages({
        encounter_id: encounterFilter.trim() ? Number(encounterFilter.trim()) : undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setUsages(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterFilter, page]);

  useEffect(() => {
    fetchUsages();
  }, [fetchUsages]);

  useEffect(() => {
    setPage(1);
  }, [encounterFilter]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Sử dụng vật tư cho bệnh nhân</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Ghi nhận vật tư tiêu hao trong các thủ thuật/lượt khám</p>
        </div>
        {canRecord && (
          <Button onClick={() => setDialogOpen(true)} size="cta">
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Ghi nhận sử dụng
          </Button>
        )}
      </div>

      <MedicalSupplyTabs />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative max-w-[280px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#adb5bd]" />
          <Input
            type="number"
            min="1"
            value={encounterFilter}
            onChange={e => setEncounterFilter(e.target.value)}
            placeholder="Lọc theo mã lượt khám…"
            className="h-auto rounded-xl border-[#dde2e8] py-3 pr-4 pl-10 text-[15px] text-[#274760]"
          />
        </div>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : usages.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Chưa có bản ghi sử dụng vật tư nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Thời gian</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Lượt khám</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bối cảnh</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Vật tư đã dùng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usages.map(u => (
                <TableRow key={u.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{new Date(u.CreatedAt).toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-semibold">
                    <Link to={`/encounters/${u.EncounterID}`} className="text-[#307bc4] hover:underline">
                      #{u.EncounterID}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{u.Context || '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {(u.Items ?? []).map(it => `${it.Supply?.Name ?? `#${it.SupplyID}`} × ${it.Quantity}`).join(', ') || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="bản ghi" />
      )}

      <RecordUsageDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchUsages}
      />
    </>
  );
}
