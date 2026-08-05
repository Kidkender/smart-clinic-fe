import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getMyProfile, getPortalDepartments,
  listMyAppointments, cancelMyAppointment,
  getMyHistory, getMyInvoices, updateMyProfile,
  listMyAttachments, downloadMyAttachment,
} from '@/api/portal';
import { resolveError } from '@/utils/errorMessages';
import { usePatientAuth } from '@/context/PatientAuthContext';
import useConfirm from '@/hooks/useConfirm';
import { cn } from '@/lib/utils';
import { ErrorAlert } from '@/components/ui/alert';
import { portalProfileSchema, type PortalProfileFormValues } from '@/schemas/portal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TABS } from './constants';
import PortalAppointmentsPanel from './PortalAppointmentsPanel';
import PortalHistoryPanel from './PortalHistoryPanel';
import PortalInvoicesPanel from './PortalInvoicesPanel';
import PortalAttachmentsPanel from './PortalAttachmentsPanel';
import PortalProfilePanel from './PortalProfilePanel';
import PortalChangePasswordPanel from './PortalChangePasswordPanel';
import PortalBookingDialog from './PortalBookingDialog';
import type { Profile, Department, Appointment, PatientHistory, Invoice, Attachment } from './types';

export default function PortalHome() {
  const { logout } = usePatientAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, ConfirmDialog] = useConfirm();

  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentTotal, setAppointmentTotal] = useState(0);
  const [appointmentTotalPages, setAppointmentTotalPages] = useState(1);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('all');
  const [appointmentSortDir, setAppointmentSortDir] = useState<'asc' | 'desc'>('desc');
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [tab, setTab] = useState('appointments');
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[] | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const {
    register: registerProfile, handleSubmit: handleProfileSubmit, reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<PortalProfileFormValues>({
    resolver: zodResolver(portalProfileSchema),
    defaultValues: { phone: '', address: '', insurance_number: '', allergies: '' },
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getMyProfile();
      setProfile(me.data);
      resetProfile({
        phone: me.data.Phone ?? '',
        address: me.data.Address ?? '',
        insurance_number: me.data.InsuranceNumber ?? '',
        allergies: me.data.Allergies ?? '',
      });
      setProfileLoaded(true);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const result = await listMyAppointments({
        page: appointmentPage,
        status: appointmentStatusFilter === 'all' ? undefined : appointmentStatusFilter,
        sort_by: 'scheduled',
        sort_dir: appointmentSortDir,
      });
      setAppointments(result.data ?? []);
      setAppointmentTotal(result.meta?.total ?? 0);
      setAppointmentTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoadingAppointments(false);
    }
  }, [appointmentPage, appointmentStatusFilter, appointmentSortDir]);

  useEffect(() => {
    setAppointmentPage(1);
  }, [appointmentStatusFilter, appointmentSortDir]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    loadAll();
    getPortalDepartments().then(r => setDepartments(r.data ?? [])).catch(() => {});
  }, [loadAll]);

  const handleLogout = async () => {
    const ok = await confirm('Bạn có chắc chắn muốn đăng xuất?', { title: 'Đăng xuất' });
    if (!ok) return;
    logout();
    navigate('/portal/login');
  };

  const handleCancel = async (appt: Appointment) => {
    if (!(await confirm('Hủy lịch hẹn này?', { confirmLabel: 'Hủy lịch' }))) return;
    try {
      await cancelMyAppointment(appt.ID);
      await fetchAppointments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleTabChange = (tabName: string) => {
    setTab(tabName);
    if (tabName === 'history' && !history) {
      setLoadingHistory(true);
      getMyHistory()
        .then(r => setHistory(r.data))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingHistory(false));
    }
    if (tabName === 'invoices' && !invoices) {
      setLoadingInvoices(true);
      getMyInvoices()
        .then(r => setInvoices(r.data ?? []))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingInvoices(false));
    }
    if (tabName === 'attachments' && !attachments) {
      setLoadingAttachments(true);
      listMyAttachments()
        .then(r => setAttachments(r.data ?? []))
        .catch(err => setError(resolveError(err)))
        .finally(() => setLoadingAttachments(false));
    }
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    setAttachmentError('');
    setOpeningAttachmentId(attachment.ID);
    try {
      const blob = await downloadMyAttachment(attachment.ID);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setAttachmentError(resolveError(err));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const handleProfileSave = handleProfileSubmit(async values => {
    setProfileError('');
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      await updateMyProfile(values);
      const me = await getMyProfile();
      setProfile(me.data);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(resolveError(err));
    } finally {
      setSavingProfile(false);
    }
  });

  return (
    <div className="min-h-screen bg-[#f0fdfa]">
      <header className="flex items-center justify-between border-b border-[#d1fae5] bg-white px-8 py-4.5">
        <Link to="/" className="inline-flex items-center gap-2 no-underline opacity-90 transition-opacity hover:opacity-100">
          <Icon icon="fa6-solid:hospital" className="text-lg text-[#0d6b5f]" />
          <span className="text-lg font-bold text-[#0d6b5f]">SmartClinic</span>
          <span className="text-[13px] text-[#6c757d]">Cổng bệnh nhân</span>
        </Link>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="h-auto rounded-xl border-[#0d9488]/30 px-4 py-2 text-[13px] font-semibold text-[#0d6b5f] hover:bg-[#0d9488]/5"
        >
          <Icon icon="fa6-solid:right-from-bracket" className="text-[13px]" />Đăng xuất
        </Button>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-8">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : (
          <>
            {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

            {profile && (
              <Card className="mb-1 rounded-2xl border-[#d1fae5] p-5">
                <h1 className="m-0 text-[22px] font-bold text-[#134e48]">Xin chào, {profile.Fullname}</h1>
                <p className="mt-1 mb-0 text-sm text-[#6c757d]">Mã hồ sơ: {profile.MRN}</p>
              </Card>
            )}

            <div className="mt-6 flex gap-1.5 border-b border-[#d1fae5]">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={cn(
                    'cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-[#6c757d]',
                    tab === t.key && 'border-[#0d9488] text-[#0d9488]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'appointments' && (
              <PortalAppointmentsPanel
                appointments={appointments}
                loading={loadingAppointments}
                onNewBooking={() => setModalOpen(true)}
                statusFilter={appointmentStatusFilter}
                onStatusFilterChange={setAppointmentStatusFilter}
                sortDir={appointmentSortDir}
                onToggleSortDir={() => setAppointmentSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                onCancel={handleCancel}
                page={appointmentPage}
                totalPages={appointmentTotalPages}
                total={appointmentTotal}
                onPageChange={setAppointmentPage}
              />
            )}

            {tab === 'history' && (
              <PortalHistoryPanel history={history} loading={loadingHistory} />
            )}

            {tab === 'invoices' && (
              <PortalInvoicesPanel invoices={invoices} loading={loadingInvoices} />
            )}

            {tab === 'attachments' && (
              <PortalAttachmentsPanel
                attachments={attachments}
                loading={loadingAttachments}
                error={attachmentError}
                openingAttachmentId={openingAttachmentId}
                onView={handleViewAttachment}
              />
            )}

            {tab === 'profile' && profileLoaded && (
              <PortalProfilePanel
                register={registerProfile}
                errors={profileErrors}
                onSubmit={handleProfileSave}
                saving={savingProfile}
                error={profileError}
                saved={profileSaved}
              />
            )}

            {tab === 'profile' && profileLoaded && <PortalChangePasswordPanel />}
          </>
        )}
      </main>

      <PortalBookingDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        departments={departments}
        onBooked={fetchAppointments}
      />

      {ConfirmDialog}
    </div>
  );
}
