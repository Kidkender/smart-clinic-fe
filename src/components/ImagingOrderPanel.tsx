import { useState } from 'react';
import { Icon } from '@iconify/react';
import {
  getImagingOrderDetail,
  scheduleImagingStudy,
  performImagingStudy,
  submitImagingReport,
  verifyImagingReport,
  searchImagingProcedures,
} from '@/api/imaging';
import { resolveError } from '@/utils/errorMessages';
import { imagingStudyStatusLabel, imagingReportStatusLabel } from '@/utils/labels';
import { imagingStudyBadgeClass, imagingReportBadgeClass } from '@/utils/badgeStyles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ImagingProcedureOption {
  ID: number | string;
  Code: string;
  Name: string;
}

interface ImagingStudy {
  ID: number | string;
  AccessionNumber: string;
  Status: string;
  DicomStudyUID?: string;
  PacsURL?: string;
  Procedure?: { Name: string; Code: string };
}

interface ImagingReport {
  ID: number | string;
  Findings?: string;
  Impression?: string;
  Status: string;
}

interface ImagingOrderDetail {
  study?: ImagingStudy | null;
  report?: ImagingReport | null;
}

function includesRole(roles: string[], role: string | null): boolean {
  return role != null && roles.includes(role);
}

function safeExternalUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
  } catch {
    return undefined;
  }
  return undefined;
}

export default function ImagingOrderPanel({
  orderId,
  orderStatus,
  role,
  onOrderChanged,
}: {
  orderId: number | string;
  orderStatus: string;
  role: string | null;
  onOrderChanged: () => Promise<void>;
}) {
  const orderLocked = orderStatus === 'completed' || orderStatus === 'cancelled';
  const canSchedule = includesRole(['admin', 'radiology_tech', 'doctor'], role);
  const canPerform = includesRole(['admin', 'radiology_tech'], role);
  const canReport = includesRole(['admin', 'doctor'], role);

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ImagingOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [procedureOptions, setProcedureOptions] = useState<ImagingProcedureOption[]>([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [dicomStudyUid, setDicomStudyUid] = useState('');
  const [pacsUrl, setPacsUrl] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getImagingOrderDetail(orderId);
      const data: ImagingOrderDetail = res.data ?? {};
      setDetail(data);
      setFindings(data.report?.Findings ?? '');
      setImpression(data.report?.Impression ?? '');
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadProcedureOptions = async () => {
    try {
      const res = await searchImagingProcedures({ active: true, page: 1, limit: 100 });
      setProcedureOptions(res.data ?? []);
    } catch {
      setProcedureOptions([]);
    }
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      await loadDetail();
      if (canSchedule) await loadProcedureOptions();
    }
  };

  const refresh = async () => {
    await loadDetail();
    await onOrderChanged();
  };

  const handleSchedule = async () => {
    if (!selectedProcedureId) return;
    setBusy(true);
    setError('');
    try {
      await scheduleImagingStudy(orderId, { procedure_id: Number(selectedProcedureId) });
      setSelectedProcedureId('');
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePerform = async () => {
    if (!dicomStudyUid.trim() || !pacsUrl.trim()) {
      setError('Vui lòng nhập mã DICOM Study UID và đường dẫn PACS.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await performImagingStudy(orderId, {
        dicom_study_uid: dicomStudyUid.trim(),
        pacs_url: pacsUrl.trim(),
      });
      setDicomStudyUid('');
      setPacsUrl('');
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!findings.trim() || !impression.trim()) {
      setError('Vui lòng nhập đầy đủ mô tả và kết luận.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitImagingReport(orderId, { findings: findings.trim(), impression: impression.trim() });
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    setError('');
    try {
      await verifyImagingReport(orderId);
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canSchedule && !canPerform && !canReport) return null;

  const study = detail?.study ?? null;
  const report = detail?.report ?? null;

  return (
    <div className="mt-2.5 rounded-xl border border-[#f0f4f8] bg-[#f9fbfd] p-3.5">
      <button
        type="button"
        onClick={toggle}
        className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-semibold text-[#307bc4]"
      >
        <Icon icon={expanded ? 'fa6-solid:chevron-up' : 'fa6-solid:x-ray'} className="text-xs" />
        {expanded ? 'Ẩn quy trình chẩn đoán hình ảnh' : 'Xem quy trình chẩn đoán hình ảnh (RIS/PACS)'}
      </button>

      {expanded && (
        <div className="mt-3">
          {loading ? (
            <p className="text-[13px] text-[#6c757d]">Đang tải…</p>
          ) : (
            <>
              {study && (
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-[#6c757d]">
                    {study.Procedure?.Name ?? 'Dịch vụ chẩn đoán hình ảnh'} · Mã lượt chụp: {study.AccessionNumber}
                  </span>
                  <Badge className={imagingStudyBadgeClass(study.Status)}>{imagingStudyStatusLabel(study.Status)}</Badge>
                  {report && <Badge className={imagingReportBadgeClass(report.Status)}>{imagingReportStatusLabel(report.Status)}</Badge>}
                  {safeExternalUrl(study.PacsURL) && (
                    <a
                      href={safeExternalUrl(study.PacsURL)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-[#307bc4] no-underline hover:underline"
                    >
                      Xem ảnh trên PACS
                    </a>
                  )}
                </div>
              )}

              {orderLocked && (
                <p className="mb-2.5 text-[13px] text-[#6c757d]">
                  Chỉ định đã {orderStatus === 'completed' ? 'hoàn tất' : 'hủy'}, không thể chỉnh sửa quy trình chẩn đoán hình ảnh.
                </p>
              )}

              {!study && canSchedule && !orderLocked && (
                <div className="mb-3 border-b border-[#e8edf2] pb-3">
                  <div className="mb-1.5 text-[13px] font-semibold text-[#274760]">Lên lịch chụp</div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
                      <SelectTrigger className="h-auto min-w-[200px] flex-1 rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                        <SelectValue placeholder="Chọn dịch vụ CĐHA…" />
                      </SelectTrigger>
                      <SelectContent>
                        {procedureOptions.map(p => (
                          <SelectItem key={p.ID} value={String(p.ID)}>{p.Name} ({p.Code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      disabled={busy || !selectedProcedureId}
                      onClick={handleSchedule}
                      className="h-auto shrink-0 rounded-lg bg-[#307bc4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
                    >
                      Lên lịch
                    </Button>
                  </div>
                </div>
              )}

              {study?.Status === 'scheduled' && canPerform && !orderLocked && (
                <div className="mb-3 border-b border-[#e8edf2] pb-3">
                  <div className="mb-1.5 text-[13px] font-semibold text-[#274760]">Ghi nhận đã chụp & đẩy ảnh lên PACS</div>
                  <div className="flex flex-col gap-2">
                    <Input
                      value={dicomStudyUid}
                      onChange={e => setDicomStudyUid(e.target.value)}
                      placeholder="DICOM Study UID"
                      className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
                    />
                    <Input
                      value={pacsUrl}
                      onChange={e => setPacsUrl(e.target.value)}
                      placeholder="Đường dẫn xem ảnh trên PACS (URL)"
                      className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
                    />
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={handlePerform}
                      className="h-auto self-start rounded-lg bg-[#307bc4] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                    >
                      Xác nhận đã chụp
                    </Button>
                  </div>
                </div>
              )}

              {study?.Status === 'completed' && report?.Status !== 'verified' && canReport && !orderLocked && (
                <div className="mb-3 border-b border-[#e8edf2] pb-3">
                  <div className="mb-1.5 text-[13px] font-semibold text-[#274760]">Báo cáo kết quả</div>
                  <Textarea
                    value={findings}
                    onChange={e => setFindings(e.target.value)}
                    placeholder="Mô tả hình ảnh (Findings)…"
                    className="mb-2 rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
                  />
                  <Textarea
                    value={impression}
                    onChange={e => setImpression(e.target.value)}
                    placeholder="Kết luận (Impression)…"
                    className="mb-2 rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={handleSubmitReport}
                      className="h-auto rounded-lg bg-[#307bc4] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                    >
                      Lưu báo cáo
                    </Button>
                    {report?.Status === 'reported' && (
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={handleVerify}
                        className="h-auto rounded-lg bg-[#28a745] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#28a745]/90"
                      >
                        Duyệt báo cáo
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {report?.Status === 'verified' && (
                <div className="text-sm text-[#274760]">
                  <div className="mb-1"><span className="font-semibold">Mô tả:</span> {report.Findings}</div>
                  <div><span className="font-semibold">Kết luận:</span> {report.Impression}</div>
                </div>
              )}

              {error && (
                <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-3.5 py-2.5 text-[13px] text-[#dc3545]">
                  <Icon icon="fa6-solid:circle-exclamation" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
