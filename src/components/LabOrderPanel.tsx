import { useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import {
  getLabOrderDetail,
  attachLabItems,
  collectLabSpecimen,
  receiveLabSpecimen,
  submitLabResults,
  verifyLabResults,
  searchLabTests,
  listSpecimenTypes,
} from '@/api/lab';
import { resolveError } from '@/utils/errorMessages';
import { labSpecimenStatusLabel, labResultFlagLabel, labResultFlagBadgeClass } from '@/utils/labels';
import { toneBadgeClass } from '@/utils/badgeStyles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface SpecimenTypeOption {
  Code: string;
  Name: string;
}

function includesRole(roles: string[], role: string | null): boolean {
  return role != null && roles.includes(role);
}

export default function LabOrderPanel({
  orderId,
  orderName,
  orderStatus,
  role,
  onOrderChanged,
}: {
  orderId: number | string;
  orderName: string;
  orderStatus: string;
  role: string | null;
  onOrderChanged: () => Promise<void>;
}) {
  const orderLocked = orderStatus === 'completed' || orderStatus === 'cancelled';
  // AttachItems only resolves the single catalog entry that already matches
  // the order's fixed Name — mechanical, not a clinical choice — so lab_tech
  // (who runs the actual LIS process) must trigger it too, not just the
  // ordering doctor. Must match backend's attachRoles gate on
  // POST /orders/:orderId/lab/items (routes/lab.go).
  const canAttach = includesRole(['admin', 'doctor', 'lab_tech'], role);
  const canCollect = includesRole(['admin', 'lab_tech', 'nurse'], role);
  const canProcess = includesRole(['admin', 'lab_tech'], role);

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LabOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [specimenType, setSpecimenType] = useState('');
  const [specimenTypeOptions, setSpecimenTypeOptions] = useState<SpecimenTypeOption[]>([]);
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});

  const loadDetail = async (): Promise<LabOrderDetail | null> => {
    setLoading(true);
    setError('');
    try {
      const res = await getLabOrderDetail(orderId);
      const data: LabOrderDetail = res.data ?? { results: [] };
      setDetail(data);
      return data;
    } catch (err) {
      setError(resolveError(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadDetail();
    await onOrderChanged();
  };

  // A lab Order is created for exactly one named test (Order.Name fixed at
  // creation) — so the LIS "attach items" step no longer lets staff pick
  // freely, it auto-resolves and attaches the one matching catalog entry.
  // Attaching a different test would silently perform extra work under the
  // same flat Order.Price (see QUY_TRINH_XET_NGHIEM.md).
  const attachMatchingTest = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await searchLabTests({ name: orderName, active: true, page: 1, limit: 50 });
      const match = (res.data ?? []).find((t: LabTestOption) => t.Name === orderName);
      if (!match) {
        setError(`Không tìm thấy xét nghiệm "${orderName}" trong danh mục xét nghiệm. Vui lòng thêm vào danh mục trước.`);
        return;
      }
      await attachLabItems(orderId, [match.ID]);
      await refresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) return;
    const current = detail ?? await loadDetail();
    if (specimenTypeOptions.length === 0) {
      try {
        const res = await listSpecimenTypes();
        setSpecimenTypeOptions(res.data ?? []);
      } catch {
        setSpecimenTypeOptions([]);
      }
    }
    if (canAttach && !orderLocked && current && current.results.length === 0) {
      await attachMatchingTest();
    }
  };

  const handleCollect = async () => {
    if (!specimenType) {
      setError('Vui lòng chọn loại bệnh phẩm.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await collectLabSpecimen(orderId, { specimen_type: specimenType });
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
    // Validate against the value each row actually displays (local draft,
    // falling back to the already-saved LabResult.Value) — not just
    // resultDrafts, which gets wiped to {} right after a successful save
    // while the input keeps showing the saved value via that same fallback.
    // Checking resultDrafts alone made a second "Lưu kết quả" click
    // incorrectly report "chưa nhập" on a row that clearly has a value.
    const results = (detail?.results ?? [])
      .map(r => ({ id: r.ID, value: (resultDrafts[String(r.ID)] ?? r.Value ?? '').trim() }))
      .filter(({ value }) => value !== '')
      .map(({ id, value }) => ({ lab_result_id: Number(id), value }));
    if (results.length === 0) {
      setError('Vui lòng nhập kết quả trước khi lưu.');
      return;
    }
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
                  <span className="text-[13px] text-[#6c757d]">
                    Bệnh phẩm: {specimenTypeOptions.find(t => t.Code === detail.specimen?.SpecimenType)?.Name ?? detail.specimen.SpecimenType}
                  </span>
                  <Badge className={toneBadgeClass('info')}>
                    {labSpecimenStatusLabel(specimenStatus ?? 'pending_collection')}
                  </Badge>
                </div>
              )}

              {orderLocked && (
                <p className="mb-2.5 text-[13px] text-[#6c757d]">
                  Chỉ định đã {orderStatus === 'completed' ? 'hoàn tất' : 'hủy'}, không thể chỉnh sửa quy trình xét nghiệm.
                </p>
              )}

              {canAttach && !orderLocked && specimenStatus !== 'verified' && results.length === 0 && busy && (
                <p className="mb-3 text-[13px] text-[#6c757d]">Đang chỉ định hạng mục xét nghiệm "{orderName}"…</p>
              )}

              {canCollect && !orderLocked && (!specimenStatus || specimenStatus === 'pending_collection') && (
                <div className="mb-3 flex items-center gap-2">
                  <Select value={specimenType} onValueChange={setSpecimenType}>
                    <SelectTrigger className="h-auto min-w-[180px] flex-1 rounded-lg border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]">
                      <SelectValue placeholder="Chọn loại bệnh phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {specimenTypeOptions.map(t => (
                        <SelectItem key={t.Code} value={t.Code}>{t.Name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={handleCollect}
                    size="cta-md"
                  >
                    Lấy mẫu
                  </Button>
                </div>
              )}

              {canProcess && !orderLocked && specimenStatus === 'collected' && (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={handleReceive}
                  size="cta-sm" className="mb-3"
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
                        {canProcess && !orderLocked && specimenStatus === 'received' && r.Status !== 'verified' ? (
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
                        <Badge className={labResultFlagBadgeClass(r.Flag)}>{labResultFlagLabel(r.Flag)}</Badge>
                      </li>
                    ))}
                  </ul>

                  {canProcess && !orderLocked && specimenStatus === 'received' && (
                    <div className="mt-2.5 flex gap-2">
                      {!allResulted && (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={handleSubmitResults}
                          size="cta-sm"
                        >
                          Lưu kết quả
                        </Button>
                      )}
                      {allResulted && (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={handleVerify}
                          className="h-auto rounded-lg bg-[#28a745] px-4 py-2.25 text-xs font-semibold text-white hover:bg-[#28a745]/90"
                        >
                          Duyệt kết quả
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && <ErrorAlert variant="compact" className="mt-2.5">{error}</ErrorAlert>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
