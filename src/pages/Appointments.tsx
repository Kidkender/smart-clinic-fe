import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { searchAppointments, cancelAppointment, markNoShow, checkInAppointment } from '@/api/appointment';
import { getDepartments } from '@/api/department';
import { listRooms } from '@/api/room';
import { listDoctors } from '@/api/doctor';
import { listPayers } from '@/api/payer';
import { addInsurancePolicy } from '@/api/patient';
import { checkEligibility } from '@/api/encounter';
import { resolveError } from '@/utils/errorMessages';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import AppointmentFilters from '@/components/appointments/AppointmentFilters';
import AppointmentsTable from '@/components/appointments/AppointmentsTable';
import CreateAppointmentDialog from '@/components/appointments/CreateAppointmentDialog';
import CheckInDialog from '@/components/appointments/CheckInDialog';
import { toLocalDateInput, type Appointment, type Department, type DoctorFilterOption } from '@/components/appointments/types';

const PAGE_LIMIT = 20;
const today = () => toLocalDateInput(new Date());

export default function Appointments() {
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'receptionist';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();
  const [checkInTarget, setCheckInTarget] = useState<Appointment | null>(null);
  const [checkInError, setCheckInError] = useState('');
  const [checkInType, setCheckInType] = useState('follow_up');
  const [checkInHasInsurance, setCheckInHasInsurance] = useState(false);
  const [checkInCoveragePercent, setCheckInCoveragePercent] = useState('');
  const [checkInFacilityCode, setCheckInFacilityCode] = useState('');
  const [checkInSyncToProfile, setCheckInSyncToProfile] = useState(false);
  const [checkInHasPrivateInsurance, setCheckInHasPrivateInsurance] = useState(false);
  const [checkInPrivatePayerId, setCheckInPrivatePayerId] = useState('');
  const [checkInPrivatePolicyNumber, setCheckInPrivatePolicyNumber] = useState('');
  const [checkInPrivateCardNumber, setCheckInPrivateCardNumber] = useState('');
  const [checkInPrivateValidFrom, setCheckInPrivateValidFrom] = useState('');
  const [checkInPrivateValidTo, setCheckInPrivateValidTo] = useState('');
  const [checkInPrivateCoveragePercentEstimate, setCheckInPrivateCoveragePercentEstimate] = useState('');
  const [checkInRoomId, setCheckInRoomId] = useState('');
  const [checkInRooms, setCheckInRooms] = useState<{ ID: number | string; Name: string; Type: string; Status: string }[]>([]);
  const [payers, setPayers] = useState<{ ID: number | string; Name: string; Type: string }[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [doctorOptions, setDoctorOptions] = useState<DoctorFilterOption[]>([]);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [sortBy, setSortBy] = useState('scheduled');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, departmentFilter, doctorFilter, dateFrom, dateTo, sortBy, sortDir]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchAppointments({
        page,
        limit: PAGE_LIMIT,
        q: search || undefined,
        status: statusFilter.length === 0 ? undefined : statusFilter.join(','),
        department_id: departmentFilter === 'all' ? undefined : departmentFilter,
        doctor_id: doctorFilter === 'all' ? undefined : doctorFilter,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setAppointments(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, departmentFilter, doctorFilter, dateFrom, dateTo, sortBy, sortDir]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const hasActiveFilters = !!searchInput || statusFilter.length > 0 || departmentFilter !== 'all'
    || doctorFilter !== 'all' || !!dateFrom || !!dateTo || sortBy !== 'scheduled' || sortDir !== 'asc';

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter([]);
    setDepartmentFilter('all');
    setDoctorFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('scheduled');
    setSortDir('asc');
  };

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
    listDoctors({ page: 1, limit: 200 }).then(r => setDoctorOptions(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!canManage) return;
    listPayers().then(r => setPayers(r.data ?? [])).catch(() => setPayers([]));
  }, [canManage]);

  const handleCancel = async (appt: Appointment) => {
    if (!(await confirm('Hủy lịch hẹn này?', { confirmLabel: 'Hủy lịch' }))) return;
    try {
      await cancelAppointment(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleNoShow = async (appt: Appointment) => {
    if (!(await confirm('Đánh dấu bệnh nhân không đến khám?', { confirmLabel: 'Không đến' }))) return;
    try {
      await markNoShow(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const openCheckIn = (appt: Appointment) => {
    setCheckInTarget(appt);
    setCheckInError('');
    setCheckInType('follow_up');
    setCheckInHasInsurance(false);
    setCheckInCoveragePercent('');
    setCheckInFacilityCode(appt.Patient?.RegisteredFacilityCode ?? '');
    setCheckInSyncToProfile(false);
    setCheckInHasPrivateInsurance(false);
    setCheckInPrivatePayerId('');
    setCheckInPrivatePolicyNumber('');
    setCheckInPrivateCardNumber('');
    setCheckInPrivateValidFrom('');
    setCheckInPrivateValidTo('');
    setCheckInPrivateCoveragePercentEstimate('');
    setCheckInRoomId('');
    setCheckInRooms([]);
    listRooms(appt.DepartmentID)
      .then(r => setCheckInRooms(r.data ?? []))
      .catch(() => setCheckInRooms([]));
  };

  const handleCheckIn = async () => {
    if (!checkInTarget) return;
    setCheckInError('');
    const hasInsurance = checkInHasInsurance && checkInType !== 'service';
    if (hasInsurance && checkInCoveragePercent.trim()) {
      const parsed = Number(checkInCoveragePercent);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        setCheckInError('Mức hưởng BHYT phải là số từ 0 đến 100.');
        return;
      }
    }
    if (checkInHasPrivateInsurance) {
      if (!checkInPrivatePayerId) {
        setCheckInError('Vui lòng chọn công ty bảo hiểm tư nhân.');
        return;
      }
      if (!checkInPrivatePolicyNumber.trim()) {
        setCheckInError('Vui lòng nhập số hợp đồng/thẻ bảo hiểm tư nhân.');
        return;
      }
      if (checkInPrivateValidFrom && checkInPrivateValidTo && checkInPrivateValidFrom > checkInPrivateValidTo) {
        setCheckInError('Ngày hiệu lực từ phải trước ngày hiệu lực đến.');
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (checkInPrivateValidTo && checkInPrivateValidTo < today) {
        setCheckInError('Hợp đồng bảo hiểm tư nhân đã hết hạn (Hiệu lực đến đã qua ngày hôm nay). Vui lòng bỏ chọn bảo hiểm tư nhân hoặc cập nhật lại ngày hiệu lực.');
        return;
      }
      if (checkInPrivateCoveragePercentEstimate.trim()) {
        const parsed = Number(checkInPrivateCoveragePercentEstimate);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          setCheckInError('Mức chi trả ước tính phải là số từ 0 đến 100.');
          return;
        }
      }
    }
    setCheckingIn(true);
    try {
      const encounterRes = await checkInAppointment(checkInTarget.ID, {
        type: checkInType,
        roomId: checkInRoomId ? Number(checkInRoomId) : null,
        hasInsurance,
        coveragePercent: hasInsurance && checkInCoveragePercent.trim() ? Number(checkInCoveragePercent) : null,
        registeredFacilityCode: hasInsurance && checkInFacilityCode.trim() ? checkInFacilityCode.trim() : null,
        syncToPatientProfile: hasInsurance && checkInSyncToProfile,
      });

      if (checkInHasPrivateInsurance) {
        const policyRes = await addInsurancePolicy(Number(checkInTarget.PatientID), {
          payer_id: Number(checkInPrivatePayerId),
          policy_number: checkInPrivatePolicyNumber.trim(),
          card_number: checkInPrivateCardNumber.trim(),
          valid_from: checkInPrivateValidFrom || null,
          valid_to: checkInPrivateValidTo || null,
        });
        await checkEligibility(encounterRes.data.ID, {
          policy_id: policyRes.data.ID,
          result: 'eligible',
          coverage_percent_estimate: checkInPrivateCoveragePercentEstimate.trim() ? Number(checkInPrivateCoveragePercentEstimate) : null,
          note: 'Khai báo lúc check-in',
        });
      }

      await fetchAppointments();
      setCheckInTarget(null);
    } catch (err) {
      setCheckInError(resolveError(err));
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Lịch hẹn</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Đặt lịch và quản lý tiếp nhận bệnh nhân</p>
        </div>
        {canManage && (
          <Button
            onClick={() => setModalOpen(true)}
            size="cta"
          >
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Đặt lịch hẹn
          </Button>
        )}
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <AppointmentFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        doctorFilter={doctorFilter}
        onDoctorFilterChange={setDoctorFilter}
        departments={departments}
        doctorOptions={doctorOptions}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
      />

      <AppointmentsTable
        appointments={appointments}
        loading={loading}
        hasActiveFilters={hasActiveFilters}
        canManage={canManage}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onCheckIn={openCheckIn}
        onNoShow={handleNoShow}
        onCancel={handleCancel}
      />

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="lịch hẹn" />
      )}

      {canManage && (
        <CreateAppointmentDialog
          open={modalOpen}
          onOpenChange={setModalOpen}
          departments={departments}
          onCreated={fetchAppointments}
        />
      )}

      <CheckInDialog
        target={checkInTarget}
        error={checkInError}
        checkInType={checkInType}
        onCheckInTypeChange={setCheckInType}
        roomId={checkInRoomId}
        onRoomIdChange={setCheckInRoomId}
        rooms={checkInRooms}
        hasInsurance={checkInHasInsurance}
        onHasInsuranceChange={setCheckInHasInsurance}
        coveragePercent={checkInCoveragePercent}
        onCoveragePercentChange={setCheckInCoveragePercent}
        registeredFacilityCode={checkInFacilityCode}
        onRegisteredFacilityCodeChange={setCheckInFacilityCode}
        syncToPatientProfile={checkInSyncToProfile}
        onSyncToPatientProfileChange={setCheckInSyncToProfile}
        hasPrivateInsurance={checkInHasPrivateInsurance}
        onHasPrivateInsuranceChange={setCheckInHasPrivateInsurance}
        privatePayerId={checkInPrivatePayerId}
        onPrivatePayerIdChange={setCheckInPrivatePayerId}
        privatePolicyNumber={checkInPrivatePolicyNumber}
        onPrivatePolicyNumberChange={setCheckInPrivatePolicyNumber}
        privateCardNumber={checkInPrivateCardNumber}
        onPrivateCardNumberChange={setCheckInPrivateCardNumber}
        privateValidFrom={checkInPrivateValidFrom}
        onPrivateValidFromChange={setCheckInPrivateValidFrom}
        privateValidTo={checkInPrivateValidTo}
        onPrivateValidToChange={setCheckInPrivateValidTo}
        privateCoveragePercentEstimate={checkInPrivateCoveragePercentEstimate}
        onPrivateCoveragePercentEstimateChange={setCheckInPrivateCoveragePercentEstimate}
        payers={payers}
        checkingIn={checkingIn}
        onClose={() => { setCheckInTarget(null); setCheckInError(''); }}
        onConfirm={handleCheckIn}
      />

      {ConfirmDialog}
    </>
  );
}
