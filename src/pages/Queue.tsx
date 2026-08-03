import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkIn, getTodayQueue, callNext, updateEncounterStatus, checkEligibility } from '@/api/encounter';
import { getDepartments } from '@/api/department';
import { searchPatients, addInsurancePolicy } from '@/api/patient';
import { listPayers } from '@/api/payer';
import { resolveError } from '@/utils/errorMessages';
import { encounterStatusLabel, encounterTypeLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { encounterStatusBadgeClass } from '@/utils/badgeStyles';
import { checkInSchema, type CheckInFormValues } from '@/schemas/queue';
import CheckInPrivateInsuranceFields from '@/components/queue/CheckInPrivateInsuranceFields';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import FieldError from '@/components/FieldError';
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
import SortableTableHead from '@/components/ui/sortable-table-head';

interface Department {
  ID: number | string;
  Name: string;
}

interface Encounter {
  ID: number | string;
  QueueNumber: number;
  PatientID: number | string;
  Patient?: { Fullname?: string; Phone?: string; MRN?: string };
  DepartmentID: number | string;
  Department?: { Name?: string };
  Type: string;
  CheckedInAt?: string;
  Status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
}

interface PatientResult {
  ID: number | string;
  Fullname: string;
  MRN: string;
  InsuranceNumber?: string;
  RegisteredFacilityCode?: string;
}

interface Payer {
  ID: number | string;
  Name: string;
  Type: string;
}

const TYPES = [
  { value: 'new', label: 'Khám mới' },
  { value: 'follow_up', label: 'Tái khám' },
  { value: 'service', label: 'Dịch vụ' },
];

const EMPTY_CHECKIN_FORM: CheckInFormValues = {
  patient_id: '',
  type: 'new',
  has_insurance: false,
  coverage_percent: '',
  registered_facility_code: '',
  sync_to_patient_profile: false,
  has_private_insurance: false,
  private_payer_id: '',
  private_policy_number: '',
  private_card_number: '',
  private_valid_from: '',
  private_valid_to: '',
  private_coverage_percent_estimate: '',
};

const QUEUE_STATUS_OPTIONS = ['waiting', 'in_progress', 'completed', 'cancelled'].map(value => ({
  value,
  label: encounterStatusLabel(value),
}));

export default function Queue() {
  const { role } = useAuth();
  // Must match backend role gates: POST /encounters + /encounters/call-next
  // are admin+receptionist only; PATCH /encounters/:id/status (complete/
  // cancel) and the exam link are admin+doctor+nurse only.
  const canCheckInWalkIn = role === 'admin' || role === 'receptionist';
  const canDoClinical = role === 'admin' || role === 'doctor' || role === 'nurse';
  const canManageBilling = (role === 'cashier' || role === 'receptionist') && !canDoClinical;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [queue, setQueue] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calling, setCalling] = useState(false);
  const [sortBy, setSortBy] = useState('queue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [confirm, ConfirmDialog] = useConfirm();
  const {
    control, handleSubmit, reset, setValue, watch, register, formState: { errors },
  } = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: EMPTY_CHECKIN_FORM,
  });
  const patientId = watch('patient_id');
  const hasInsurance = watch('has_insurance');
  const hasPrivateInsurance = watch('has_private_insurance');
  const privatePayerId = watch('private_payer_id');
  const privatePolicyNumber = watch('private_policy_number');
  const privateCardNumber = watch('private_card_number');
  const privateValidFrom = watch('private_valid_from');
  const privateValidTo = watch('private_valid_to');
  const privateCoveragePercentEstimate = watch('private_coverage_percent_estimate');
  const checkInType = watch('type');

  const fetchQueue = useCallback(async (deptId: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await getTodayQueue(deptId, sortBy, sortDir);
      setQueue(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    getDepartments()
      .then(r => setDepartments(r.data ?? []))
      .catch(err => setError(resolveError(err)));
  }, []);

  useEffect(() => {
    if (!canCheckInWalkIn) return;
    listPayers()
      .then(r => setPayers(r.data ?? []))
      .catch(() => setPayers([]));
  }, [canCheckInWalkIn]);

  useEffect(() => {
    fetchQueue(departmentId);
  }, [departmentId, fetchQueue]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const handlePatientSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientQuery(value);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const result = await searchPatients({ q: value.trim(), page: 1, limit: 10 });
      setPatientResults(result.data ?? []);
    } catch {
      setPatientResults([]);
    }
  };

  const openCheckIn = () => {
    reset(EMPTY_CHECKIN_FORM);
    setPatientQuery('');
    setPatientResults([]);
    setFormError('');
    setModalOpen(true);
  };

  const handleCheckIn = handleSubmit(async values => {
    setFormError('');
    const hasInsuranceValue = values.has_insurance && values.type !== 'service';
    if (hasInsuranceValue && values.coverage_percent.trim()) {
      const parsed = Number(values.coverage_percent);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        setFormError('Mức hưởng BHYT phải là số từ 0 đến 100.');
        return;
      }
    }
    if (values.has_private_insurance) {
      if (!values.private_payer_id) {
        setFormError('Vui lòng chọn công ty bảo hiểm tư nhân.');
        return;
      }
      if (!values.private_policy_number.trim()) {
        setFormError('Vui lòng nhập số hợp đồng/thẻ bảo hiểm tư nhân.');
        return;
      }
      if (values.private_valid_from && values.private_valid_to && values.private_valid_from > values.private_valid_to) {
        setFormError('Ngày hiệu lực từ phải trước ngày hiệu lực đến.');
        return;
      }
      if (values.private_coverage_percent_estimate.trim()) {
        const parsed = Number(values.private_coverage_percent_estimate);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          setFormError('Mức chi trả ước tính phải là số từ 0 đến 100.');
          return;
        }
      }
    }
    setSaving(true);
    try {
      const encounterRes = await checkIn({
        patient_id: Number(values.patient_id),
        department_id: Number(departmentId),
        type: values.type,
        has_insurance: hasInsuranceValue,
        coverage_percent: hasInsuranceValue && values.coverage_percent.trim() ? Number(values.coverage_percent) : null,
        registered_facility_code: hasInsuranceValue && values.registered_facility_code.trim() ? values.registered_facility_code.trim() : null,
        sync_to_patient_profile: hasInsuranceValue && values.sync_to_patient_profile,
      });

      if (values.has_private_insurance) {
        const policyRes = await addInsurancePolicy(Number(values.patient_id), {
          payer_id: Number(values.private_payer_id),
          policy_number: values.private_policy_number.trim(),
          card_number: values.private_card_number.trim(),
          valid_from: values.private_valid_from || null,
          valid_to: values.private_valid_to || null,
        });
        const today = new Date().toISOString().slice(0, 10);
        const isExpired = !!values.private_valid_to && values.private_valid_to < today;
        await checkEligibility(encounterRes.data.ID, {
          policy_id: policyRes.data.ID,
          result: isExpired ? 'ineligible' : 'eligible',
          coverage_percent_estimate: values.private_coverage_percent_estimate.trim() ? Number(values.private_coverage_percent_estimate) : null,
          note: 'Khai báo lúc check-in',
        });
      }

      await fetchQueue(departmentId);
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

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
    if (!(await confirm(
      'Hoàn tất lượt khám này? Sau khi hoàn tất, dược sĩ sẽ được phép cấp phát các đơn thuốc đang hiệu lực của lượt khám. Hãy chắc chắn đã ghi nhận đầy đủ sinh hiệu, chẩn đoán, chỉ định và đơn thuốc trước khi tiếp tục.',
      { danger: false, confirmLabel: 'Hoàn tất' },
    ))) return;
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

  const normalizedSearch = search.trim().toLowerCase();
  const visibleQueue = queue.filter(q => {
    if (statusFilter.length > 0 && !statusFilter.includes(q.Status)) return false;
    if (!normalizedSearch) return true;
    const haystack = [q.Patient?.Fullname, q.Patient?.Phone, q.Patient?.MRN]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const hasActiveFilters = !!searchInput || statusFilter.length > 0;

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter([]);
  };

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
          {canCheckInWalkIn && (
            <Button
              onClick={openCheckIn}
              disabled={!departmentId}
              size="cta"
            >
              <Icon icon="fa6-solid:user-plus" className="text-sm" />
              Check-in
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, SĐT, MRN…"
            className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <MultiSelect
          options={QUEUE_STATUS_OPTIONS}
          selected={statusFilter}
          onChange={setStatusFilter}
          placeholder="Tất cả trạng thái"
          className="w-[170px]"
        />
        <Select
          value={departmentId || 'all'}
          onValueChange={value => setDepartmentId(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="h-auto w-[180px] rounded-xl px-4 py-2.75 text-sm">
            <SelectValue placeholder="Tất cả khoa/phòng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khoa/phòng</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.75 text-sm font-medium text-[#6c757d] hover:text-[#dc3545]"
          >
            <Icon icon="fa6-solid:filter-circle-xmark" className="text-sm" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

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
              disabled={calling || waitingCount === 0 || !departmentId}
              title={!departmentId ? 'Chọn một khoa/phòng cụ thể để gọi số' : undefined}
              className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              {calling ? 'Đang gọi…' : 'Gọi tiếp theo'}
            </Button>
          </Card>
        )}
      </div>

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : visibleQueue.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            {hasActiveFilters ? 'Không tìm thấy bệnh nhân phù hợp.' : 'Hàng đợi trống.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="STT" column="queue" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Bệnh nhân" column="patient" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                {!departmentId && (
                  <SortableTableHead label="Khoa/phòng" column="department" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                )}
                <SortableTableHead label="Loại" column="type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Check-in" column="checkin" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Trạng thái" column="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleQueue.map(q => (
                <TableRow key={q.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-bold text-[#274760]">{q.QueueNumber}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{q.Patient?.Fullname ?? `#${q.PatientID}`}</TableCell>
                  {!departmentId && (
                    <TableCell className="px-4 py-3 text-sm text-[#274760]">{q.Department?.Name ?? `#${q.DepartmentID}`}</TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{encounterTypeLabel(q.Type)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {q.CheckedInAt ? new Date(q.CheckedInAt).toLocaleTimeString('vi-VN') : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span className={cn('inline-block', encounterStatusBadgeClass(q.Status))}>
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
                    {canDoClinical && q.Status === 'completed' && (
                      <Link
                        to={`/encounters/${q.ID}`}
                        title="Xem lại (đơn thuốc, cảnh báo dược sĩ...)"
                        className="inline-flex size-[30px] items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d] no-underline"
                      >
                        <Icon icon="fa6-solid:eye" className="text-[13px]" />
                      </Link>
                    )}
                    {canManageBilling && q.Status === 'completed' && (
                      <Link
                        to={`/encounters/${q.ID}`}
                        title="Hóa đơn viện phí"
                        className="inline-flex size-[30px] items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#307bc4] no-underline"
                      >
                        <Icon icon="fa6-solid:file-invoice-dollar" className="text-[13px]" />
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Check-in bệnh nhân</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckIn} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tìm bệnh nhân *</label>
            <Input
              value={patientQuery}
              onChange={handlePatientSearch}
              placeholder="Nhập tên, SĐT, CCCD, MRN…"
              aria-invalid={!!errors.patient_id}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            {patientResults.length > 0 && (
              <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                {patientResults.map(p => (
                  <div
                    key={p.ID}
                    onClick={() => {
                      setValue('patient_id', String(p.ID), { shouldValidate: true });
                      setValue('registered_facility_code', p.RegisteredFacilityCode ?? '');
                      setPatientQuery(`${p.Fullname} (${p.MRN})`);
                      setPatientResults([]);
                    }}
                    className={cn(
                      'cursor-pointer px-3.5 py-2.5 text-sm text-[#274760]',
                      String(patientId) === String(p.ID) ? 'bg-[#f4f7fa]' : 'bg-white',
                    )}
                  >
                    {p.Fullname} <span className="text-[#6c757d]">· {p.MRN}</span>
                  </div>
                ))}
              </div>
            )}
            {patientId && (
              <div className="mt-1.5 text-[13px] text-[#198754]">Đã chọn bệnh nhân #{patientId}</div>
            )}
            <FieldError message={errors.patient_id?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Loại khám *</label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value);
                    if (value === 'service') setValue('has_insurance', false);
                  }}
                >
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />

            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <p className="m-0 mb-2 text-[11px] font-bold tracking-wide text-[#6c757d] uppercase">BHYT</p>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#274760] has-[:disabled]:opacity-50">
                  <input type="checkbox" disabled={checkInType === 'service'} {...register('has_insurance')} className="size-4" />
                  Có sử dụng BHYT
                </label>
                {checkInType === 'service' && (
                  <p className="m-0 mt-1 text-xs text-[#6c757d]">Khám dịch vụ không áp dụng BHYT.</p>
                )}
                {hasInsurance && checkInType !== 'service' && (
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <div className="min-w-[140px] flex-1">
                      <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mức hưởng (%) — để trống nếu chưa biết</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        {...register('coverage_percent')}
                        placeholder="VD: 80"
                        className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                      />
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <label className="mb-1.5 block min-h-[32px] text-xs font-semibold text-[#274760]">Mã cơ sở KCB ban đầu</label>
                      <Input
                        {...register('registered_facility_code')}
                        placeholder="VD: 79001"
                        className="h-auto rounded-xl border-[#dde2e8] px-3 py-2 text-[13px] text-[#274760]"
                      />
                    </div>
                  </div>
                )}
                {hasInsurance && checkInType !== 'service' && (
                  <label className="mt-2.5 flex items-center gap-2 text-xs text-[#6c757d]">
                    <input type="checkbox" {...register('sync_to_patient_profile')} className="size-3.5" />
                    Cập nhật vào hồ sơ bệnh nhân
                  </label>
                )}
              </div>

              <div className="sm:border-l sm:border-[#e8edf2] sm:pl-6">
                <CheckInPrivateInsuranceFields
                  hasPrivateInsurance={hasPrivateInsurance}
                  onHasPrivateInsuranceChange={v => setValue('has_private_insurance', v)}
                  payerId={privatePayerId}
                  onPayerIdChange={v => setValue('private_payer_id', v)}
                  policyNumber={privatePolicyNumber}
                  onPolicyNumberChange={v => setValue('private_policy_number', v)}
                  cardNumber={privateCardNumber}
                  onCardNumberChange={v => setValue('private_card_number', v)}
                  validFrom={privateValidFrom}
                  onValidFromChange={v => setValue('private_valid_from', v)}
                  validTo={privateValidTo}
                  onValidToChange={v => setValue('private_valid_to', v)}
                  coveragePercentEstimate={privateCoveragePercentEstimate}
                  onCoveragePercentEstimateChange={v => setValue('private_coverage_percent_estimate', v)}
                  payers={payers}
                />
              </div>
            </div>

            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving || !patientId}
                size="cta"
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
