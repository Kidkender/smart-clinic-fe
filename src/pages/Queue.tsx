import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { checkIn, getTodayQueue, callNext, updateEncounterStatus } from '@/api/encounter';
import { getDepartments } from '@/api/department';
import { searchPatients } from '@/api/patient';
import { resolveError } from '@/utils/errorMessages';
import { encounterStatusLabel, encounterTypeLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

interface Department {
  ID: number | string;
  Name: string;
}

interface Encounter {
  ID: number | string;
  QueueNumber: number;
  PatientID: number | string;
  Patient?: { Fullname?: string };
  Type: string;
  CheckedInAt?: string;
  Status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
}

interface PatientResult {
  ID: number | string;
  Fullname: string;
  MRN: string;
}

const TYPES = [
  { value: 'new', label: 'Khám mới' },
  { value: 'follow_up', label: 'Tái khám' },
  { value: 'insurance', label: 'BHYT' },
  { value: 'service', label: 'Dịch vụ' },
];

const STATUS_STYLES: Record<string, string> = {
  waiting: 'bg-[#307bc4]/10 text-[#307bc4]',
  in_progress: 'bg-[#198754]/10 text-[#198754]',
  completed: 'bg-[#6c757d]/10 text-[#6c757d]',
  cancelled: 'bg-[#dc3545]/10 text-[#dc3545]',
};

export default function Queue() {
  const { role } = useAuth();
  // Must match backend role gates: POST /encounters + /encounters/call-next
  // are admin+receptionist only; PATCH /encounters/:id/status (complete/
  // cancel) and the exam link are admin+doctor+nurse only.
  const canCheckInWalkIn = role === 'admin' || role === 'receptionist';
  const canDoClinical = role === 'admin' || role === 'doctor' || role === 'nurse';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [queue, setQueue] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [form, setForm] = useState({ patient_id: '', type: 'new' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm() as [
    (message: string, options?: { danger?: boolean; confirmLabel?: string }) => Promise<boolean>,
    React.ReactNode,
  ];

  const fetchQueue = useCallback(async (deptId: string) => {
    if (!deptId) {
      setQueue([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getTodayQueue(deptId);
      setQueue(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getDepartments()
      .then(r => {
        const list = r.data ?? [];
        setDepartments(list);
        if (list.length > 0) setDepartmentId(String(list[0].ID));
        else setLoading(false);
      })
      .catch(err => {
        setError(resolveError(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (departmentId) fetchQueue(departmentId);
  }, [departmentId, fetchQueue]);

  const handlePatientSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientQuery(value);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const result = await searchPatients({ name: value.trim(), page: 1, limit: 10 });
      setPatientResults(result.data ?? []);
    } catch {
      setPatientResults([]);
    }
  };

  const openCheckIn = () => {
    setForm({ patient_id: '', type: 'new' });
    setPatientQuery('');
    setPatientResults([]);
    setFormError('');
    setModalOpen(true);
  };

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await checkIn({ patient_id: Number(form.patient_id), department_id: Number(departmentId), type: form.type });
      await fetchQueue(departmentId);
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCallNext = async () => {
    setCalling(true);
    setError('');
    try {
      await callNext(departmentId);
      await fetchQueue(departmentId);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setCalling(false);
    }
  };

  const handleComplete = async (enc: Encounter) => {
    try {
      await updateEncounterStatus(enc.ID, 'completed');
      await fetchQueue(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleCancel = async (enc: Encounter) => {
    if (!(await confirm('Hủy lượt khám này?', { confirmLabel: 'Hủy lượt' }))) return;
    try {
      await updateEncounterStatus(enc.ID, 'cancelled');
      await fetchQueue(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const waitingCount = queue.filter(q => q.Status === 'waiting').length;
  const inProgress = queue.find(q => q.Status === 'in_progress');

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Hàng đợi khám</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Check-in bệnh nhân và gọi số theo khoa/phòng
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="h-auto min-w-[180px] max-w-[220px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
              <SelectValue placeholder="Chọn khoa/phòng" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCheckInWalkIn && (
            <Button
              onClick={openCheckIn}
              disabled={!departmentId}
              className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              <Icon icon="fa6-solid:user-plus" className="text-sm" />
              Check-in
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatCard label="Đang chờ" value={waitingCount} color="#307bc4" />
        <StatCard
          label="Đang khám"
          value={inProgress ? `#${inProgress.QueueNumber} — ${inProgress.Patient?.Fullname ?? ''}` : '—'}
          color="#198754"
        />
        {canCheckInWalkIn && (
          <Card className="flex-row items-center justify-between rounded-2xl border-[#e8edf2] px-5 py-4.5">
            <div className="text-xs font-bold tracking-wide text-[#6c757d] uppercase">Gọi số tiếp theo</div>
            <Button
              variant="outline"
              onClick={handleCallNext}
              disabled={calling || waitingCount === 0}
              className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              {calling ? 'Đang gọi…' : 'Gọi tiếp theo'}
            </Button>
          </Card>
        )}
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : !departmentId ? (
          <div className="p-15 text-center text-[#6c757d]">Chưa có khoa/phòng nào.</div>
        ) : queue.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Hàng đợi trống.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">STT</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Loại</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Check-in</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map(q => (
                <TableRow key={q.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-bold text-[#274760]">{q.QueueNumber}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{q.Patient?.Fullname ?? `#${q.PatientID}`}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{encounterTypeLabel(q.Type)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {q.CheckedInAt ? new Date(q.CheckedInAt).toLocaleTimeString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[q.Status] ?? STATUS_STYLES.waiting)}>
                      {encounterStatusLabel(q.Status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {canDoClinical && q.Status === 'in_progress' && (
                      <Link
                        to={`/encounters/${q.ID}`}
                        title="Khám bệnh"
                        className="inline-flex size-[30px] items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#307bc4] no-underline"
                      >
                        <Icon icon="fa6-solid:stethoscope" className="text-[13px]" />
                      </Link>
                    )}
                    {canDoClinical && q.Status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={() => handleComplete(q)}
                        title="Hoàn tất"
                        className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#198754]"
                      >
                        <Icon icon="fa6-solid:check" className="text-[13px]" />
                      </button>
                    )}
                    {canDoClinical && (q.Status === 'waiting' || q.Status === 'in_progress') && (
                      <button
                        type="button"
                        onClick={() => handleCancel(q)}
                        title="Hủy"
                        className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                      >
                        <Icon icon="fa6-solid:xmark" className="text-[13px]" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-w-[440px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Check-in bệnh nhân</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckIn}>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tìm bệnh nhân *</label>
            <Input
              value={patientQuery}
              onChange={handlePatientSearch}
              placeholder="Nhập tên, SĐT, CCCD, MRN…"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            {patientResults.length > 0 && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-[#dde2e8]">
                {patientResults.map(p => (
                  <div
                    key={p.ID}
                    onClick={() => { setForm({ ...form, patient_id: String(p.ID) }); setPatientQuery(`${p.Fullname} (${p.MRN})`); setPatientResults([]); }}
                    className={cn(
                      'cursor-pointer px-3.5 py-2.5 text-sm text-[#274760]',
                      String(form.patient_id) === String(p.ID) ? 'bg-[#f4f7fa]' : 'bg-white',
                    )}
                  >
                    {p.Fullname} <span className="text-[#6c757d]">· {p.MRN}</span>
                  </div>
                ))}
              </div>
            )}
            {form.patient_id && (
              <div className="mt-1.5 text-[13px] text-[#198754]">Đã chọn bệnh nhân #{form.patient_id}</div>
            )}

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại khám *</label>
            <Select value={form.type} onValueChange={value => setForm({ ...form, type: value })}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {formError}
              </div>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.patient_id}
                className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {saving ? 'Đang lưu…' : 'Check-in'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card className="rounded-2xl border-[#e8edf2] px-5 py-4.5">
      <div className="mb-1.5 text-xs font-bold tracking-wide text-[#6c757d] uppercase">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </Card>
  );
}
