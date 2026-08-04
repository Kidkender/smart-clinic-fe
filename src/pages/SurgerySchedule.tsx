import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import SortableTableHead from '@/components/ui/sortable-table-head';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  listSurgeries,
  listOperatingRooms,
  scheduleSurgery,
  startSurgery,
  completeSurgery,
  cancelSurgery,
  searchSurgeryStaff,
} from '@/api/surgery';
import RecordUsageDialog from '@/components/medical-supplies/RecordUsageDialog';
import { resolveError } from '@/utils/errorMessages';
import { surgeryStatusBadgeClass } from '@/utils/badgeStyles';
import { surgeryClassificationLabel } from '@/utils/labels';

interface OperatingRoom {
  ID: number | string;
  Name: string;
}

interface TeamMember {
  user_id: number | string;
  fullname: string;
  role: string;
}

interface Surgery {
  id: number | string;
  encounter_id: number | string;
  patient_id: number | string;
  patient_name: string;
  patient_mrn: string;
  operating_room_id: number | string | null;
  operating_room_name: string;
  name: string;
  classification: string;
  price: number;
  pre_op_diagnosis: string;
  status: string;
  scheduled_at: string | null;
  estimated_duration_minutes: number | null;
  team: TeamMember[];
}

const STATUS_LABEL: Record<string, string> = {
  pending_scheduling: 'Chờ xếp lịch',
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang mổ',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const ROLE_LABEL: Record<string, string> = {
  primary_surgeon: 'PTV chính',
  assistant_surgeon: 'Phụ mổ',
  anesthesiologist: 'Bác sĩ gây mê',
  scrub_nurse: 'ĐD dụng cụ',
  circulating_nurse: 'ĐD chạy ngoài',
};

const ROLE_OPTIONS = Object.keys(ROLE_LABEL);
const PAGE_LIMIT = 20;

interface StaffOption {
  id: number | string;
  fullname: string;
  role: string;
}

interface TeamRow {
  userId: string;
  fullname: string;
  role: string;
  query: string;
  results: StaffOption[];
}

const emptyTeamRow = (): TeamRow => ({ userId: '', fullname: '', role: 'primary_surgeon', query: '', results: [] });

// datetime-local expects local time, not UTC — toISOString() would shift by
// the timezone offset and let the picker's own "min" silently accept times
// that are actually already in the past for this user.
const toDatetimeLocalValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function SurgerySchedule() {
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [rooms, setRooms] = useState<OperatingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('scheduled_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('');

  const [scheduleTarget, setScheduleTarget] = useState<Surgery | null>(null);
  const [operatingRoomId, setOperatingRoomId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [teamRows, setTeamRows] = useState<TeamRow[]>([emptyTeamRow()]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Surgery | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [postOpDiagnosis, setPostOpDiagnosis] = useState('');
  const [operativeNote, setOperativeNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [supplyDialogOpen, setSupplyDialogOpen] = useState(false);

  const fetchSurgeries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listSurgeries({
        page,
        limit: PAGE_LIMIT,
        sort_by: sortBy,
        sort_dir: sortDir,
        status: statusFilter || undefined,
      });
      setSurgeries(result.data?.items ?? []);
      setTotal(result.data?.total ?? 0);
      setTotalPages(result.data?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    fetchSurgeries();
  }, [fetchSurgeries]);

  useEffect(() => {
    listOperatingRooms().then(res => setRooms(res.data ?? [])).catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const addTeamRow = () => setTeamRows(prev => [...prev, emptyTeamRow()]);
  const removeTeamRow = (index: number) => setTeamRows(prev => prev.filter((_, i) => i !== index));
  const updateTeamRow = (index: number, patch: Partial<TeamRow>) => {
    setTeamRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleStaffSearch = async (index: number, query: string) => {
    updateTeamRow(index, { query });
    if (query.trim().length < 2) {
      updateTeamRow(index, { results: [] });
      return;
    }
    try {
      const result = await searchSurgeryStaff(query.trim());
      updateTeamRow(index, { results: result.data ?? [] });
    } catch {
      updateTeamRow(index, { results: [] });
    }
  };

  const selectStaff = (index: number, option: StaffOption) => {
    updateTeamRow(index, { userId: String(option.id), fullname: option.fullname, query: '', results: [] });
  };

  const clearStaffSelection = (index: number) => {
    updateTeamRow(index, { userId: '', fullname: '', query: '', results: [] });
  };

  const openScheduleDialog = (surgery: Surgery) => {
    setScheduleTarget(surgery);
    setOperatingRoomId('');
    setScheduledAt('');
    setDurationMinutes('60');
    setTeamRows([emptyTeamRow()]);
    setFormError('');
  };

  const handleSchedule = async () => {
    if (!scheduleTarget) return;
    setFormError('');
    if (!operatingRoomId || !scheduledAt) {
      setFormError('Vui lòng chọn phòng mổ và thời gian.');
      return;
    }
    if (new Date(scheduledAt).getTime() < Date.now()) {
      setFormError('Thời gian dự kiến mổ không được ở trong quá khứ.');
      return;
    }
    const validTeam = teamRows.filter(r => r.userId.trim());
    if (validTeam.length === 0) {
      setFormError('Cần chỉ định ít nhất một thành viên kíp mổ.');
      return;
    }
    const seen = new Set<string>();
    for (const row of validTeam) {
      const key = `${row.userId}:${row.role}`;
      if (seen.has(key)) {
        setFormError(`${row.fullname} đã được chỉ định vai trò "${ROLE_LABEL[row.role] ?? row.role}" rồi, vui lòng chọn vai trò khác hoặc xóa dòng trùng.`);
        return;
      }
      seen.add(key);
    }
    setSaving(true);
    try {
      await scheduleSurgery(scheduleTarget.id, {
        operating_room_id: Number(operatingRoomId),
        scheduled_at: new Date(scheduledAt).toISOString(),
        estimated_duration_minutes: Number(durationMinutes),
        team_members: validTeam.map(r => ({ user_id: Number(r.userId), role: r.role })),
      });
      await fetchSurgeries();
      setScheduleTarget(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (surgery: Surgery) => {
    if (surgery.status === 'pending_scheduling') {
      openScheduleDialog(surgery);
      return;
    }
    setDetail(surgery);
    setDetailError('');
    setPostOpDiagnosis('');
    setOperativeNote('');
    setCancelReason('');
  };

  const handleStart = async () => {
    if (!detail) return;
    setDetailBusy(true);
    setDetailError('');
    try {
      await startSurgery(detail.id);
      await fetchSurgeries();
      setDetail(null);
    } catch (err) {
      setDetailError(resolveError(err));
    } finally {
      setDetailBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!detail) return;
    if (!postOpDiagnosis.trim() || !operativeNote.trim()) {
      setDetailError('Vui lòng nhập chẩn đoán sau mổ và tường trình phẫu thuật.');
      return;
    }
    setDetailBusy(true);
    setDetailError('');
    try {
      await completeSurgery(detail.id, { post_op_diagnosis: postOpDiagnosis.trim(), operative_note: operativeNote.trim() });
      await fetchSurgeries();
      setDetail(null);
    } catch (err) {
      setDetailError(resolveError(err));
    } finally {
      setDetailBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    if (!cancelReason.trim()) {
      setDetailError('Vui lòng nhập lý do hủy.');
      return;
    }
    setDetailBusy(true);
    setDetailError('');
    try {
      await cancelSurgery(detail.id, cancelReason.trim());
      await fetchSurgeries();
      setDetail(null);
    } catch (err) {
      setDetailError(resolveError(err));
    } finally {
      setDetailBusy(false);
    }
  };

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Lịch mổ</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Xếp phòng mổ, kíp mổ và giờ mổ cho các ca đã được bác sĩ chỉ định phẫu thuật từ Khám bệnh
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-auto w-[200px] rounded-xl border-[#dde2e8] px-4 py-2.5 text-sm text-[#274760]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.keys(STATUS_LABEL).map(status => (
              <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : surgeries.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            Chưa có ca mổ nào. Bác sĩ chỉ định phẫu thuật từ màn hình Khám bệnh của lượt khám.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="Thời gian" column="scheduled_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Tên ca mổ" column="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Phòng mổ</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Kíp mổ</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surgeries.map(sg => (
                <TableRow
                  key={sg.id}
                  className="cursor-pointer border-t border-[#f0f4f8] hover:bg-[#f4f7fa]"
                  onClick={() => openDetail(sg)}
                >
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {sg.scheduled_at ? new Date(sg.scheduled_at).toLocaleString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    <div className="font-semibold">{sg.name}</div>
                    <div className="text-xs text-[#6c757d]">
                      {surgeryClassificationLabel(sg.classification)} · {sg.price.toLocaleString('vi-VN')} đ
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {sg.patient_name} <span className="text-[#6c757d]">({sg.patient_mrn})</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{sg.operating_room_name || '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {(sg.team ?? []).map(t => `${t.fullname} (${ROLE_LABEL[t.role] ?? t.role})`).join(', ') || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge className={surgeryStatusBadgeClass(sg.status)}>{STATUS_LABEL[sg.status] ?? sg.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="ca mổ" />
      )}

      <Dialog open={!!scheduleTarget} onOpenChange={open => { if (!saving && !open) setScheduleTarget(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Xếp lịch mổ</DialogTitle>
          </DialogHeader>

          {scheduleTarget && (
            <p className="m-0 text-sm text-[#6c757d]">
              {scheduleTarget.name} ({surgeryClassificationLabel(scheduleTarget.classification)} · {scheduleTarget.price.toLocaleString('vi-VN')} đ) — {scheduleTarget.patient_name} ({scheduleTarget.patient_mrn})
              {scheduleTarget.pre_op_diagnosis && <> · {scheduleTarget.pre_op_diagnosis}</>}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Phòng mổ *</label>
              <Select value={operatingRoomId} onValueChange={setOperatingRoomId}>
                <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                  <SelectValue placeholder="Chọn phòng mổ" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.ID} value={String(r.ID)}>{r.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Thời gian dự kiến *</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={toDatetimeLocalValue(new Date())}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Thời lượng dự kiến (phút) *</label>
              <Input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label className="block text-sm font-semibold text-[#274760]">Kíp mổ *</label>
            <button
              type="button"
              onClick={addTeamRow}
              className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-xs font-semibold text-[#307bc4]"
            >
              <Icon icon="fa6-solid:plus" className="text-[10px]" />
              Thêm thành viên
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {teamRows.map((row, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="relative flex-1">
                  {row.userId ? (
                    <div className="flex h-auto items-center justify-between rounded-xl border border-[#dde2e8] px-3 py-2 text-sm text-[#274760]">
                      <span className="font-medium">{row.fullname}</span>
                      <button
                        type="button"
                        onClick={() => clearStaffSelection(index)}
                        className="cursor-pointer border-none bg-transparent p-0 text-[#6c757d]"
                      >
                        <Icon icon="fa6-solid:xmark" className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={row.query}
                        onChange={e => handleStaffSearch(index, e.target.value)}
                        placeholder="Tìm theo tên bác sĩ/điều dưỡng…"
                        className="h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2 text-sm text-[#274760]"
                      />
                      {row.results.length > 0 && (
                        <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-[200px] overflow-y-auto rounded-xl border border-[#e8edf2] bg-white shadow-lg">
                          {row.results.map(option => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => selectStaff(index, option)}
                              className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent px-3 py-2 text-left text-sm text-[#274760] hover:bg-[#f4f7fa]"
                            >
                              {option.fullname}
                              <span className="text-xs text-[#6c757d]">{option.role === 'doctor' ? 'Bác sĩ' : 'Điều dưỡng'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <Select value={row.role} onValueChange={value => updateTeamRow(index, { role: value })}>
                  <SelectTrigger className="h-auto w-[170px] rounded-xl border-[#dde2e8] px-3 py-2 text-sm text-[#274760]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(role => (
                      <SelectItem key={role} value={role}>{ROLE_LABEL[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teamRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeamRow(index)}
                    className="inline-flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                  >
                    <Icon icon="fa6-solid:trash" className="text-[12px]" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {formError && <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>}

          <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleTarget(null)}
              disabled={saving}
              className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              Hủy
            </Button>
            <Button type="button" onClick={handleSchedule} disabled={saving} size="cta">
              {saving ? 'Đang lưu…' : 'Xếp lịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={open => { if (!detailBusy && !open) setDetail(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">{detail?.name}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div>
              <div className="flex items-center justify-between">
                <p className="m-0 text-sm text-[#6c757d]">
                  {detail.patient_name} ({detail.patient_mrn}) · {detail.operating_room_name || '—'} · {surgeryClassificationLabel(detail.classification)} · {detail.price.toLocaleString('vi-VN')} đ
                </p>
                <Badge className={surgeryStatusBadgeClass(detail.status)}>{STATUS_LABEL[detail.status] ?? detail.status}</Badge>
              </div>
              {detail.scheduled_at && (
                <p className="mt-1 mb-0 text-sm text-[#6c757d]">
                  {new Date(detail.scheduled_at).toLocaleString('vi-VN')} · Dự kiến {detail.estimated_duration_minutes} phút
                </p>
              )}
              <p className="mt-3 mb-0 text-sm text-[#274760]">
                <span className="font-semibold">Kíp mổ:</span>{' '}
                {(detail.team ?? []).map(t => `${t.fullname} (${ROLE_LABEL[t.role] ?? t.role})`).join(', ') || '—'}
              </p>

              {detailError && <ErrorAlert icon={false} className="mt-4">{detailError}</ErrorAlert>}

              {detail.status === 'scheduled' && (
                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" onClick={handleStart} disabled={detailBusy} size="cta">
                    Bắt đầu mổ
                  </Button>
                </div>
              )}

              {detail.status === 'in_progress' && (
                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Chẩn đoán sau mổ *</label>
                  <Textarea
                    value={postOpDiagnosis}
                    onChange={e => setPostOpDiagnosis(e.target.value)}
                    className="rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                  />
                  <label className="mt-3 mb-1.5 block text-sm font-semibold text-[#274760]">Tường trình phẫu thuật *</label>
                  <Textarea
                    value={operativeNote}
                    onChange={e => setOperativeNote(e.target.value)}
                    className="min-h-24 rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                  />
                  <div className="mt-3 flex justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSupplyDialogOpen(true)}
                      className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.5 text-sm font-medium text-[#274760]"
                    >
                      <Icon icon="fa6-solid:kit-medical" className="text-sm" />
                      Ghi nhận vật tư tiêu hao
                    </Button>
                    <Button type="button" onClick={handleComplete} disabled={detailBusy} size="cta">
                      Hoàn tất ca mổ
                    </Button>
                  </div>
                </div>
              )}

              {(detail.status === 'scheduled' || detail.status === 'in_progress') && (
                <div className="mt-5 border-t border-[#f0f4f8] pt-4">
                  <label className="mb-1.5 block text-sm font-semibold text-[#274760]">Hủy ca mổ</label>
                  <div className="flex gap-2">
                    <Input
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Lý do hủy"
                      className="h-auto flex-1 rounded-xl border-[#dde2e8] px-3 py-2 text-sm text-[#274760]"
                    />
                    <Button type="button" variant="danger" onClick={handleCancel} disabled={detailBusy} size="cta">
                      Hủy ca mổ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {detail && (
        <RecordUsageDialog
          open={supplyDialogOpen}
          onClose={() => setSupplyDialogOpen(false)}
          onSaved={async () => {}}
          fixedEncounterId={detail.encounter_id}
          fixedEncounterLabel={`Phẫu thuật: ${detail.name}`}
        />
      )}
    </>
  );
}
