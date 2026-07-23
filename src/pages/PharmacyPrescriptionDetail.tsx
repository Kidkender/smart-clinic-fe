import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getPrescriptionById, updatePrescriptionStatus, getPrescriptionLabel, flagPrescriptionItem,
} from '@/api/prescription';
import { printPrescriptionLabel } from '@/utils/printLabel';
import { resolveError } from '@/utils/errorMessages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import useConfirm from '@/hooks/useConfirm';

interface PendingFlag {
  id: number;
  reason: string;
  status: string;
  created_at: string;
}

interface PrescriptionDetailItem {
  item_id: number;
  drug_id: number;
  drug_name: string;
  strength?: string;
  unit?: string;
  dosage?: string;
  instructions?: string;
  requested: number;
  available: number;
  shortage: number;
  sufficient: boolean;
  pending_flag?: PendingFlag;
}

interface PrescriptionDetail {
  prescription_id: number;
  encounter_id: number;
  status: 'active' | 'dispensed' | 'cancelled';
  created_at: string;
  patient_name: string;
  patient_mrn: string;
  doctor_name: string;
  items: PrescriptionDetailItem[];
  has_shortage: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Đang chờ cấp phát',
  dispensed: 'Đã cấp phát',
  cancelled: 'Đã hủy',
};

export default function PharmacyPrescriptionDetail() {
  const { encounterId, prescriptionId } = useParams<{ encounterId: string; prescriptionId: string }>();
  const navigate = useNavigate();
  const [confirm, ConfirmDialog] = useConfirm();
  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [flaggingItem, setFlaggingItem] = useState<PrescriptionDetailItem | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagError, setFlagError] = useState('');
  const [flagging, setFlagging] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!encounterId || !prescriptionId) return;
    setLoading(true);
    setError('');
    try {
      const result = await getPrescriptionById(encounterId, prescriptionId);
      setDetail(result.data ?? null);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterId, prescriptionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDispense = async () => {
    if (!encounterId || !prescriptionId || !detail || detail.has_shortage) return;
    const ok = await confirm(`Xác nhận cấp phát đơn thuốc cho "${detail.patient_name}"?`, {
      title: 'Cấp phát đơn thuốc',
      confirmLabel: 'Cấp phát',
    });
    if (!ok) return;
    setActing(true);
    setError('');
    try {
      await updatePrescriptionStatus(encounterId, prescriptionId, 'dispensed');
      await fetchDetail();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setActing(false);
    }
  };

  const handleCancelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Vui lòng nhập lý do hủy đơn.');
      return;
    }
    if (!encounterId || !prescriptionId) return;
    const ok = await confirm(`Hủy đơn thuốc này với lý do: "${cancelReason.trim()}"?`, {
      title: 'Hủy đơn thuốc',
      danger: true,
      confirmLabel: 'Xác nhận hủy',
    });
    if (!ok) return;
    setActing(true);
    setCancelError('');
    try {
      await updatePrescriptionStatus(encounterId, prescriptionId, 'cancelled', cancelReason.trim());
      setCancelling(false);
      await fetchDetail();
    } catch (err) {
      setCancelError(resolveError(err));
    } finally {
      setActing(false);
    }
  };

  const openFlag = (item: PrescriptionDetailItem) => {
    setFlaggingItem(item);
    setFlagReason(`Thiếu ${item.shortage} ${item.unit ?? 'đơn vị'}, cần đổi thuốc tương đương hoặc điều chỉnh đơn.`);
    setFlagError('');
  };

  const handleFlagSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!flagReason.trim()) {
      setFlagError('Vui lòng nhập nội dung báo cho bác sĩ.');
      return;
    }
    if (!encounterId || !prescriptionId || !flaggingItem) return;
    setFlagging(true);
    setFlagError('');
    try {
      await flagPrescriptionItem(encounterId, prescriptionId, flaggingItem.item_id, flagReason.trim());
      setFlaggingItem(null);
      await fetchDetail();
    } catch (err) {
      setFlagError(resolveError(err));
    } finally {
      setFlagging(false);
    }
  };

  const handlePrint = async () => {
    if (!encounterId) return;
    setError('');
    try {
      const res = await getPrescriptionLabel(encounterId);
      printPrescriptionLabel(res.data);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }

  if (error && !detail) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
        <Icon icon="fa6-solid:circle-exclamation" />
        {error}
      </div>
    );
  }

  if (!detail) return null;

  const isActive = detail.status === 'active';

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/pharmacy/worklist')}
        className="mb-4 flex items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-medium text-[#307bc4] hover:underline"
      >
        <Icon icon="fa6-solid:chevron-left" className="text-[11px]" />Quay lại danh sách
      </button>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[24px] font-bold text-[#274760]">
            {detail.patient_name} <span className="text-sm font-normal text-[#6c757d]">({detail.patient_mrn})</span>
          </h1>
          <p className="mt-1 mb-0 text-[14px] text-[#6c757d]">
            Đơn #{detail.prescription_id} · {new Date(detail.created_at).toLocaleString('vi-VN')} · {STATUS_LABEL[detail.status] ?? detail.status}
          </p>
        </div>
        <div
          title="Hệ thống chưa hỗ trợ liên hệ trực tiếp — vui lòng gọi điện hoặc nhắn tin ngoài hệ thống"
          className="flex items-center gap-1.5 rounded-full border border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#274760]"
        >
          <Icon icon="fa6-solid:user-doctor" className="text-[11px] text-[#307bc4]" />
          Bác sĩ kê đơn{detail.doctor_name ? `: ${detail.doctor_name}` : ' chưa xác định'}
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      {detail.has_shortage && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:triangle-exclamation" />
          Có thuốc không đủ tồn kho. Liên hệ bác sĩ nếu cần thay đổi đơn thuốc trước khi cấp phát.
        </div>
      )}

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thuốc</TableHead>
              <TableHead>Liều dùng</TableHead>
              <TableHead className="text-right">Cần</TableHead>
              <TableHead className="text-right">Tồn</TableHead>
              <TableHead className="text-right">Thiếu</TableHead>
              <TableHead>Báo bác sĩ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.items.map(item => (
              <TableRow key={item.item_id}>
                <TableCell>
                  <span className="font-semibold text-[#274760]">{item.drug_name}</span>
                  {item.strength ? ` ${item.strength}` : ''}
                  {!item.sufficient && (
                    <Icon icon="fa6-solid:circle-exclamation" className="ml-1.5 inline text-[#dc3545]" />
                  )}
                </TableCell>
                <TableCell className="text-[#6c757d]">
                  {item.dosage}
                  {item.instructions ? ` · ${item.instructions}` : ''}
                </TableCell>
                <TableCell className="text-right">{item.requested}</TableCell>
                <TableCell className="text-right">{item.available}</TableCell>
                <TableCell className={`text-right font-semibold ${item.sufficient ? 'text-[#2e7d32]' : 'text-[#dc3545]'}`}>
                  {item.sufficient ? '—' : item.shortage}
                </TableCell>
                <TableCell>
                  {item.sufficient ? (
                    '—'
                  ) : item.pending_flag ? (
                    <span
                      title={item.pending_flag.reason}
                      className="flex items-center gap-1 text-xs font-medium text-[#e0a800]"
                    >
                      <Icon icon="fa6-solid:clock" className="text-[10px]" />
                      Đã báo lúc {new Date(item.pending_flag.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openFlag(item)}
                      className="h-auto rounded-lg border-[#dde2e8] px-3 py-1 text-[11px] font-semibold text-[#307bc4]"
                    >
                      <Icon icon="fa6-solid:bullhorn" className="mr-1 text-[10px]" />Báo bác sĩ
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {flaggingItem && (
          <form
            onSubmit={handleFlagSubmit}
            noValidate
            className="mt-4 rounded-lg border border-[#307bc4]/30 bg-[#307bc4]/5 p-3"
          >
            <label className="mb-1 block text-[11px] font-semibold text-[#307bc4]">
              Nội dung báo bác sĩ về "{flaggingItem.drug_name}" *
            </label>
            <Input
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
              placeholder="VD: thiếu 2 viên, đề nghị đổi thuốc tương đương…"
              className="h-auto rounded-lg border-[#dde2e8] px-2.5 py-1.5 text-xs text-[#274760]"
            />
            {flagError && <p className="mt-1 text-[11px] text-[#dc3545]">{flagError}</p>}
            <div className="mt-2 flex gap-2">
              <Button
                type="submit"
                disabled={flagging}
                className="h-auto rounded-lg bg-[#307bc4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {flagging ? 'Đang gửi…' : 'Gửi báo cáo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFlaggingItem(null)}
                className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
              >
                Đóng
              </Button>
            </div>
          </form>
        )}

        {isActive && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0f4f8] pt-5">
            <Button
              disabled={acting || detail.has_shortage}
              onClick={handleDispense}
              title={detail.has_shortage ? 'Không thể cấp phát vì còn thuốc chưa đủ tồn kho — báo bác sĩ hoặc chờ nhập kho.' : undefined}
              className="h-auto rounded-lg bg-[#307bc4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#307bc4]/90 disabled:opacity-40"
            >
              <Icon icon="fa6-solid:check" className="mr-1.5 text-[11px]" />Cấp phát
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-auto rounded-lg border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#307bc4]"
            >
              <Icon icon="fa6-solid:print" className="mr-1.5 text-[11px]" />In đơn thuốc
            </Button>
            <Button
              variant="outline"
              disabled={acting}
              onClick={() => { setCancelling(true); setCancelReason(''); setCancelError(''); }}
              className="h-auto rounded-lg border-[#dde2e8] px-4 py-2 text-xs font-semibold text-[#dc3545]"
            >
              <Icon icon="fa6-solid:xmark" className="mr-1.5 text-[11px]" />Hủy đơn
            </Button>
          </div>
        )}

        {cancelling && (
          <form
            onSubmit={handleCancelSubmit}
            noValidate
            className="mt-4 rounded-lg border border-[#dc3545]/30 bg-[#dc3545]/5 p-3"
          >
            <label className="mb-1 block text-[11px] font-semibold text-[#dc3545]">
              Lý do hủy đơn thuốc *
            </label>
            {detail.has_shortage && (
              <button
                type="button"
                onClick={() => setCancelReason('Thiếu thuốc — bệnh nhân tự mua ngoài theo toa')}
                className="mb-1.5 cursor-pointer rounded-full border border-[#dc3545]/30 bg-[#dc3545]/8 px-2.5 py-1 text-[11px] font-semibold text-[#dc3545]"
              >
                <Icon icon="fa6-solid:bolt" className="mr-1 text-[10px]" />
                Dùng lý do: Thiếu thuốc — BN tự mua ngoài
              </button>
            )}
            <Input
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="VD: tương tác thuốc, sai liều, bệnh nhân không lấy thuốc…"
              className="h-auto rounded-lg border-[#dde2e8] px-2.5 py-1.5 text-xs text-[#274760]"
            />
            {cancelError && <p className="mt-1 text-[11px] text-[#dc3545]">{cancelError}</p>}
            <div className="mt-2 flex gap-2">
              <Button
                type="submit"
                disabled={acting}
                className="h-auto rounded-lg bg-[#dc3545] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#dc3545]/90"
              >
                {acting ? 'Đang hủy…' : 'Xác nhận hủy'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelling(false)}
                className="h-auto rounded-lg border-[#dde2e8] px-3 py-1.5 text-xs font-medium text-[#274760]"
              >
                Đóng
              </Button>
            </div>
          </form>
        )}
      </Card>

      {ConfirmDialog}
    </>
  );
}
