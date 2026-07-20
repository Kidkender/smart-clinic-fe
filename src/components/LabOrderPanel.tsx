import { useState, type ChangeEvent } from 'react';
import { Icon } from '@iconify/react';
import {
  getLabOrderDetail,
  attachLabItems,
  collectLabSpecimen,
  receiveLabSpecimen,
  submitLabResults,
  verifyLabResults,
  searchLabTests,
} from '@/api/lab';
import { resolveError } from '@/utils/errorMessages';
import { labSpecimenStatusLabel, labResultFlagLabel } from '@/utils/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface LabTestRef {
  ID: number | string;
  Name: string;
}

interface LabResult {
  ID: number | string;
  LabTestID: number | string;
  LabTest?: LabTestRef;
  Value?: string;
  Unit?: string;
  RefRangeText?: string;
  Flag: string;
  Status: string;
}

interface LabSpecimen {
  ID: number | string;
  SpecimenType: string;
  Status: string;
}

interface LabOrderDetail {
  specimen?: LabSpecimen | null;
  results: LabResult[];
}

interface LabTestOption {
  ID: number | string;
  Name: string;
  Code: string;
}

function includesRole(roles: string[], role: string | null): boolean {
  return role != null && roles.includes(role);
}

function flagBadgeClass(flag: string): string {
  switch (flag) {
    case 'normal':
      return 'rounded-full bg-[#28a745]/10 px-2.5 py-1 text-xs font-semibold text-[#28a745] hover:bg-[#28a745]/10';
    case 'low':
    case 'high':
      return 'rounded-full bg-[#ffc107]/15 px-2.5 py-1 text-xs font-semibold text-[#8a6100] hover:bg-[#ffc107]/15';
    case 'abnormal':
      return 'rounded-full bg-[#dc3545]/10 px-2.5 py-1 text-xs font-semibold text-[#dc3545] hover:bg-[#dc3545]/10';
    default:
      return 'rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10';
  }
}

export default function LabOrderPanel({
  orderId,
  role,
  onOrderChanged,
}: {
  orderId: number | string;
  role: string | null;
  onOrderChanged: () => Promise<void>;
}) {
  const canAttach = includesRole(['admin', 'doctor'], role);
  const canCollect = includesRole(['admin', 'lab_tech', 'nurse'], role);
  const canProcess = includesRole(['admin', 'lab_tech'], role);

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LabOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [specimenType, setSpecimenType] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [testOptions, setTestOptions] = useState<LabTestOption[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<(number | string)[]>([]);
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLabOrderDetail(orderId);
      setDetail(res.data ?? { results: [] });
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) await loadDetail();
  };

  const refresh = async () => {
    await loadDetail();
    await onOrderChanged();
  };

  const handleTestSearch = async (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTestQuery(value);
    if (value.trim().length < 2) {
      setTestOptions([]);
      return;
    }
    try {
      const res = await searchLabTests({ name: value.trim(), page: 1, limit: 10 });
      setTestOptions(res.data ?? []);
    } catch {
      setTestOptions([]);
    }
  };

  const toggleSelectedTest = (id: number | string) => {
    setSelectedTestIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleAttach = async () => {
    if (selectedTestIds.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await attachLabItems(orderId, selectedTestIds);
      setSelectedTestIds([]);
      setTestQuery('');
      setTestOptions([]);
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCollect = async () => {
    if (!specimenType.trim()) {
      setError('Vui lòng nhập loại bệnh phẩm.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await collectLabSpecimen(orderId, { specimen_type: specimenType.trim() });
      setSpecimenType('');
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReceive = async () => {
    setBusy(true);
    setError('');
    try {
      await receiveLabSpecimen(orderId, {});
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitResults = async () => {
    const results = Object.entries(resultDrafts)
      .filter(([, value]) => value.trim() !== '')
      .map(([labResultId, value]) => ({ lab_result_id: Number(labResultId), value: value.trim() }));
    if (results.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await submitLabResults(orderId, results);
      setResultDrafts({});
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
      await verifyLabResults(orderId);
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canAttach && !canCollect) return null;

  const specimenStatus = detail?.specimen?.Status ?? null;
  const results = detail?.results ?? [];
  const allResulted = results.length > 0 && results.every(r => r.Status === 'resulted' || r.Status === 'verified');

  return (
    <div className="mt-2.5 rounded-xl border border-[#f0f4f8] bg-[#f9fbfd] p-3.5">
      <button
        type="button"
        onClick={toggle}
        className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[13px] font-semibold text-[#307bc4]"
      >
        <Icon icon={expanded ? 'fa6-solid:chevron-up' : 'fa6-solid:vial'} className="text-xs" />
        {expanded ? 'Ẩn quy trình xét nghiệm' : 'Xem quy trình xét nghiệm (LIS)'}
      </button>

      {expanded && (
        <div className="mt-3">
          {loading ? (
            <p className="text-[13px] text-[#6c757d]">Đang tải…</p>
          ) : (
            <>
              {detail?.specimen && (
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-[13px] text-[#6c757d]">Bệnh phẩm: {detail.specimen.SpecimenType}</span>
                  <Badge className="rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4] hover:bg-[#307bc4]/10">
                    {labSpecimenStatusLabel(specimenStatus ?? 'pending_collection')}
                  </Badge>
                </div>
              )}

              {canAttach && specimenStatus !== 'verified' && (
                <div className="mb-3 border-b border-[#e8edf2] pb-3">
                  <div className="mb-1.5 text-[13px] font-semibold text-[#274760]">Chỉ định hạng mục xét nghiệm</div>
                  <Input
                    value={testQuery}
                    onChange={handleTestSearch}
                    placeholder="Tìm xét nghiệm theo tên…"
                    className="h-auto rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
                  />
                  {testOptions.length > 0 && (
                    <div className="mt-1.5 max-h-32 overflow-y-auto rounded-lg border border-[#dde2e8]">
                      {testOptions.map(t => (
                        <label key={t.ID} className="flex cursor-pointer items-center gap-2 px-3.5 py-2 text-sm text-[#274760] hover:bg-[#f4f7fa]">
                          <input
                            type="checkbox"
                            checked={selectedTestIds.includes(t.ID)}
                            onChange={() => toggleSelectedTest(t.ID)}
                            className="size-4"
                          />
                          {t.Name} <span className="text-xs text-[#6c757d]">({t.Code})</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedTestIds.length > 0 && (
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={handleAttach}
                      className="mt-2 h-auto rounded-full bg-[#307bc4] px-4 py-1.75 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                    >
                      Gắn {selectedTestIds.length} xét nghiệm
                    </Button>
                  )}
                </div>
              )}

              {canCollect && (!specimenStatus || specimenStatus === 'pending_collection') && (
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    value={specimenType}
                    onChange={e => setSpecimenType(e.target.value)}
                    placeholder="Loại bệnh phẩm (VD: Máu tĩnh mạch)"
                    className="h-auto min-w-[180px] flex-1 rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
                  />
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={handleCollect}
                    className="h-auto shrink-0 rounded-full bg-[#307bc4] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                  >
                    Lấy mẫu
                  </Button>
                </div>
              )}

              {canProcess && specimenStatus === 'collected' && (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={handleReceive}
                  className="mb-3 h-auto rounded-full bg-[#307bc4] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                >
                  Nhận mẫu
                </Button>
              )}

              {results.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-[#274760]">Kết quả xét nghiệm</div>
                  <ul className="m-0 list-none p-0">
                    {results.map(r => (
                      <li key={r.ID} className="flex flex-wrap items-center gap-2 border-b border-[#f0f4f8] py-2">
                        <span className="min-w-[140px] flex-1 text-sm text-[#274760]">{r.LabTest?.Name ?? `#${r.LabTestID}`}</span>
                        {canProcess && specimenStatus === 'received' && r.Status !== 'verified' ? (
                          <Input
                            value={resultDrafts[String(r.ID)] ?? r.Value ?? ''}
                            onChange={e => setResultDrafts({ ...resultDrafts, [String(r.ID)]: e.target.value })}
                            placeholder="Nhập kết quả…"
                            className="h-auto w-[120px] rounded-lg border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                          />
                        ) : (
                          <span className="w-[120px] text-sm text-[#274760]">{r.Value || '—'}</span>
                        )}
                        <span className="w-16 text-xs text-[#6c757d]">{r.Unit}</span>
                        <span className="w-24 text-xs text-[#6c757d]">{r.RefRangeText}</span>
                        <Badge className={flagBadgeClass(r.Flag)}>{labResultFlagLabel(r.Flag)}</Badge>
                      </li>
                    ))}
                  </ul>

                  {canProcess && specimenStatus === 'received' && (
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={handleSubmitResults}
                        className="h-auto rounded-full bg-[#307bc4] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#307bc4]/90"
                      >
                        Lưu kết quả
                      </Button>
                      {allResulted && (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={handleVerify}
                          className="h-auto rounded-full bg-[#28a745] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#28a745]/90"
                        >
                          Duyệt kết quả
                        </Button>
                      )}
                    </div>
                  )}
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
