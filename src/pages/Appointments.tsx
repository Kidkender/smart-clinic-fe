import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { searchAppointments, cancelAppointment, markNoShow, checkInAppointment } from '@/api/appointment';
import { getDepartments } from '@/api/department';
import { listDoctors } from '@/api/doctor';
import { resolveError } from '@/utils/errorMessages';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import AppointmentFilters from '@/components/appointments/AppointmentFilters';
import AppointmentsTable from '@/components/appointments/AppointmentsTable';
import CreateAppointmentDialog from '@/components/appointments/CreateAppointmentDialog';
import CheckInDialog from '@/components/appointments/CheckInDialog';
import type { Appointment, Department, DoctorFilterOption } from '@/components/appointments/types';

const PAGE_LIMIT = 20;

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
  const [checkInType, setCheckInType] = useState('follow_up');
  const [checkingIn, setCheckingIn] = useState(false);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [doctorOptions, setDoctorOptions] = useState<DoctorFilterOption[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
    setCheckInType('follow_up');
  };

  const handleCheckIn = async () => {
    if (!checkInTarget) return;
    setCheckingIn(true);
    try {
      await checkInAppointment(checkInTarget.ID, checkInType);
      await fetchAppointments();
      setCheckInTarget(null);
    } catch (err) {
      setError(resolveError(err));
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
            className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Đặt lịch hẹn
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-[#6c757d]">
            Trang {page}/{totalPages} · {total} lịch hẹn
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-sm font-medium text-[#274760]"
            >
              <Icon icon="fa6-solid:chevron-left" className="text-xs" />
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-auto rounded-full border-[#dde2e8] px-4 py-2 text-sm font-medium text-[#274760]"
            >
              Sau
              <Icon icon="fa6-solid:chevron-right" className="text-xs" />
            </Button>
          </div>
        </div>
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
        checkInType={checkInType}
        onCheckInTypeChange={setCheckInType}
        checkingIn={checkingIn}
        onClose={() => setCheckInTarget(null)}
        onConfirm={handleCheckIn}
      />

      {ConfirmDialog}
    </>
  );
}
