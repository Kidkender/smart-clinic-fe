import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getPatientById, updatePatient, getPatientHistory,
  listContacts, addContact, updateContact, deleteContact,
  listAttachments, uploadAttachment, deleteAttachment, downloadAttachment,
} from '@/api/patient';
import { resolveError } from '@/utils/errorMessages';
import { genderLabel, encounterStatusLabel, encounterTypeLabel, prescriptionStatusLabel, orderStatusLabel, orderTypeLabel, attachmentCategoryLabel, ATTACHMENT_CATEGORIES } from '@/utils/labels';
import { patientSchema, contactSchema, type PatientFormValues, type ContactFormValues } from '@/schemas/patient';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import DateOfBirthSelect from '@/components/DateOfBirthSelect';
import { Textarea } from '@/components/ui/textarea';
import FieldError from '@/components/FieldError';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Patient {
  ID: number | string;
  MRN: string;
  Fullname: string;
  Gender: string;
  Phone?: string;
  CCCD?: string;
  Address?: string;
  InsuranceNumber?: string;
  Allergies?: string;
  DateOfBirth?: string;
}

interface Contact {
  ID: number | string;
  Fullname: string;
  Relationship?: string;
  Phone?: string;
}

interface Attachment {
  ID: number | string;
  FileName: string;
  Category: string;
  ContentType?: string;
  FileSize?: number;
}

interface HistoryEncounter {
  ID: number | string;
  DepartmentID: number | string;
  Department?: { Name?: string };
  Type: string;
  Status: string;
  CreatedAt: string;
}

interface Prescription {
  ID: number | string;
  Status: string;
  CreatedAt: string;
  Items?: unknown[];
}

interface Order {
  ID: number | string;
  Name: string;
  Type: string;
  Status: string;
  CreatedAt: string;
}

interface PatientHistory {
  encounters?: HistoryEncounter[];
  prescriptions?: Prescription[];
  orders?: Order[];
}

const GENDERS = ['male', 'female', 'other'];

function toDateInput(value?: string) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function PatientDetail() {
  const { id = '' } = useParams();
  const { role } = useAuth();
  // Must match backend role gates in routes/patient.go: create/update patient,
  // contacts, and attachments are admin+receptionist only; history is
  // admin+doctor+nurse only (receptionist can't view it).
  const canManage = role === 'admin' || role === 'receptionist';
  const canViewHistory = role === 'admin' || role === 'doctor' || role === 'nurse';
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register: registerEdit, handleSubmit: handleSubmitEdit, control: editControl, reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullname: '', gender: 'other', phone: '', cccd: '', address: '',
      insurance_number: '', allergies: '', date_of_birth: '',
    },
  });

  const [editingContactId, setEditingContactId] = useState<number | string | null>(null);
  const [contactError, setContactError] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const {
    register: registerContact, handleSubmit: handleSubmitContact, reset: resetContact,
    formState: { errors: contactErrors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { fullname: '', relationship: '', phone: '' },
  });

  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [uploadCategory, setUploadCategory] = useState('document');
  const [attachmentFilter, setAttachmentFilter] = useState('');
  const [openingAttachmentId, setOpeningAttachmentId] = useState<number | string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirm, ConfirmDialog] = useConfirm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, c, a] = await Promise.all([
        getPatientById(id),
        listContacts(id),
        listAttachments(id),
      ]);
      setPatient(p.data);
      setContacts(c.data ?? []);
      setAttachments(a.data ?? []);
    } catch (err) {
      setError(resolveError(err));
      setLoading(false);
      return;
    }

    if (canViewHistory) {
      try {
        const h = await getPatientHistory(id);
        setHistory(h.data);
      } catch {
        setHistory(null);
      }
    }
    setLoading(false);
  }, [id, canViewHistory]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openEdit = () => {
    if (!patient) return;
    resetEdit({
      fullname: patient.Fullname ?? '',
      gender: (patient.Gender as PatientFormValues['gender']) ?? 'other',
      phone: patient.Phone ?? '',
      cccd: patient.CCCD ?? '',
      address: patient.Address ?? '',
      insurance_number: patient.InsuranceNumber ?? '',
      allergies: patient.Allergies ?? '',
      date_of_birth: toDateInput(patient.DateOfBirth),
    });
    setFormError('');
    setEditOpen(true);
  };

  const handleSaveEdit = handleSubmitEdit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await updatePatient(id, { ...values, fullname: values.fullname.trim(), date_of_birth: values.date_of_birth || null });
      const p = await getPatientById(id);
      setPatient(p.data);
      setEditOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  const openAddContact = () => {
    setEditingContactId(null);
    resetContact({ fullname: '', relationship: '', phone: '' });
    setContactError('');
  };

  const openEditContact = (contact: Contact) => {
    setEditingContactId(contact.ID);
    resetContact({ fullname: contact.Fullname, relationship: contact.Relationship ?? '', phone: contact.Phone ?? '' });
    setContactError('');
  };

  const handleSaveContact = handleSubmitContact(async values => {
    setContactError('');
    setSavingContact(true);
    try {
      const payload = { ...values, fullname: values.fullname.trim() };
      if (editingContactId) {
        await updateContact(id, editingContactId, payload);
      } else {
        await addContact(id, payload);
      }
      const c = await listContacts(id);
      setContacts(c.data ?? []);
      setEditingContactId(null);
      resetContact({ fullname: '', relationship: '', phone: '' });
    } catch (err) {
      setContactError(resolveError(err));
    } finally {
      setSavingContact(false);
    }
  });

  const handleDeleteContact = async (contact: Contact) => {
    if (!(await confirm(`Xóa người liên hệ "${contact.Fullname}"?`))) return;
    try {
      await deleteContact(id, contact.ID);
      const c = await listContacts(id);
      setContacts(c.data ?? []);
    } catch (err) {
      setContactError(resolveError(err));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAttachmentError('');
    try {
      await uploadAttachment(id, file, uploadCategory);
      const a = await listAttachments(id);
      setAttachments(a.data ?? []);
    } catch (err) {
      setAttachmentError(resolveError(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!(await confirm(`Xóa tệp "${attachment.FileName}"?`))) return;
    try {
      await deleteAttachment(id, attachment.ID);
      const a = await listAttachments(id);
      setAttachments(a.data ?? []);
    } catch (err) {
      setAttachmentError(resolveError(err));
    }
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    setAttachmentError('');
    setOpeningAttachmentId(attachment.ID);
    try {
      const blob = await downloadAttachment(id, attachment.ID);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setAttachmentError(resolveError(err));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }
  if (error || !patient) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
        <Icon icon="fa6-solid:circle-exclamation" />{error || 'Không tìm thấy bệnh nhân.'}
      </div>
    );
  }

  return (
    <>
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#307bc4] no-underline">
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Danh sách bệnh nhân
      </Link>

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="m-0 text-2xl font-bold text-[#274760]">{patient.Fullname}</h1>
            <p className="mt-1 mb-0 text-sm text-[#6c757d]">MRN: {patient.MRN}</p>
          </div>
          {canManage && (
            <Button
              variant="outline"
              onClick={openEdit}
              className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
            >
              <Icon icon="fa6-solid:pen" className="text-xs" />Sửa
            </Button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          <Field label="Giới tính" value={genderLabel(patient.Gender)} />
          <Field label="Ngày sinh" value={patient.DateOfBirth ? toDateInput(patient.DateOfBirth) : '—'} />
          <Field label="SĐT" value={patient.Phone || '—'} />
          <Field label="CCCD" value={patient.CCCD || '—'} />
          <Field label="Địa chỉ" value={patient.Address || '—'} />
          <Field label="Số BHYT" value={patient.InsuranceNumber || '—'} />
          <Field label="Dị ứng" value={patient.Allergies || 'Không ghi nhận'} />
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-5">
        <Card className="rounded-2xl border-[#e8edf2] p-6">
          <h2 className="mb-4 text-[17px] font-bold text-[#274760]">Người liên hệ</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-[#6c757d]">Chưa có người liên hệ.</p>
          ) : (
            <ul className="m-0 mb-4 list-none p-0">
              {contacts.map(c => (
                <li key={c.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                  <div>
                    <div className="font-semibold text-[#274760]">{c.Fullname}</div>
                    <div className="text-[13px] text-[#6c757d]">{c.Relationship || '—'} · {c.Phone || '—'}</div>
                  </div>
                  {canManage && (
                    <div>
                      <IconButton onClick={() => openEditContact(c)} title="Sửa"><Icon icon="fa6-solid:pen" className="text-xs" /></IconButton>
                      <IconButton onClick={() => handleDeleteContact(c)} title="Xóa" className="ml-1.5 text-[#dc3545]"><Icon icon="fa6-solid:xmark" className="text-xs" /></IconButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <form onSubmit={handleSaveContact} className="border-t border-[#f0f4f8] pt-3.5" noValidate>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Input {...registerContact('fullname')} placeholder="Họ tên" aria-invalid={!!contactErrors.fullname} className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-sm text-[#274760]" />
                  <FieldError message={contactErrors.fullname?.message} />
                </div>
                <Input {...registerContact('relationship')} placeholder="Quan hệ" className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-sm text-[#274760]" />
              </div>
              <Input {...registerContact('phone')} placeholder="SĐT" aria-invalid={!!contactErrors.phone} className="mt-2.5 h-auto w-full rounded-xl border-[#dde2e8] px-3 py-2.25 text-sm text-[#274760]" />
              <FieldError message={contactErrors.phone?.message} />
              {contactError && (
                <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{contactError}</div>
              )}
              <div className="mt-2.5 flex gap-2">
                <Button
                  type="submit"
                  disabled={savingContact}
                  className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
                >
                  {editingContactId ? 'Cập nhật' : 'Thêm liên hệ'}
                </Button>
                {editingContactId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openAddContact}
                    className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
                  >
                    Hủy sửa
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>

        <Card className="rounded-2xl border-[#e8edf2] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 className="m-0 text-[17px] font-bold text-[#274760]">Tệp đính kèm</h2>
            <Select value={attachmentFilter || 'all'} onValueChange={value => setAttachmentFilter(value === 'all' ? '' : value)}>
              <SelectTrigger className="h-auto w-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                {ATTACHMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{attachmentCategoryLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(() => {
            const filtered = attachmentFilter ? attachments.filter(a => a.Category === attachmentFilter) : attachments;
            if (filtered.length === 0) {
              return <p className="mt-3.5 text-sm text-[#6c757d]">Chưa có tệp đính kèm.</p>;
            }
            return (
              <ul className="m-0 my-3.5 mb-4 list-none p-0">
                {filtered.map(a => (
                  <li key={a.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                    <div className="min-w-0">
                      <div className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap text-[#274760]">{a.FileName}</div>
                      <div className="text-[13px] text-[#6c757d]">
                        <span className="inline-block rounded-full bg-[#307bc4]/10 px-2 py-0.5 text-xs font-semibold text-[#307bc4]">{attachmentCategoryLabel(a.Category)}</span>
                        {' · '}{a.ContentType || 'file'} · {a.FileSize ? `${(a.FileSize / 1024).toFixed(0)} KB` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <IconButton
                        onClick={() => handleViewAttachment(a)}
                        title="Xem"
                        disabled={openingAttachmentId === a.ID}
                        className="text-[#307bc4]"
                      >
                        <Icon icon={openingAttachmentId === a.ID ? 'fa6-solid:spinner' : 'fa6-solid:eye'} className={openingAttachmentId === a.ID ? 'animate-spin text-xs' : 'text-xs'} />
                      </IconButton>
                      {canManage && (
                        <IconButton onClick={() => handleDeleteAttachment(a)} title="Xóa" className="text-[#dc3545]"><Icon icon="fa6-solid:xmark" className="text-xs" /></IconButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            );
          })()}
          {attachmentError && (
            <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{attachmentError}</div>
          )}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={uploading}>
                <SelectTrigger className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-sm text-[#274760]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTACHMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{attachmentCategoryLabel(c)}</SelectItem>)}
                </SelectContent>
              </Select>
              <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={uploading} className="text-sm" />
              {uploading && <span className="text-[13px] text-[#6c757d]">Đang tải lên…</span>}
            </div>
          )}
        </Card>
      </div>

      {canViewHistory && (
        <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
          <h2 className="mb-4 text-[17px] font-bold text-[#274760]">Lịch sử khám</h2>
          <HistorySubsection title="Lượt khám" empty="Chưa có lượt khám nào.">
            {(history?.encounters ?? []).map(e => (
              <li key={e.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">{e.Department?.Name ?? `Khoa #${e.DepartmentID}`} · {encounterTypeLabel(e.Type)}</div>
                  <div className="text-[13px] text-[#6c757d]">{new Date(e.CreatedAt).toLocaleString('vi-VN')}</div>
                </div>
                <span className="inline-block shrink-0 rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4]">{encounterStatusLabel(e.Status)}</span>
              </li>
            ))}
          </HistorySubsection>
          <HistorySubsection title="Đơn thuốc" empty="Chưa có đơn thuốc nào.">
            {(history?.prescriptions ?? []).map(p => (
              <li key={p.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">Đơn #{p.ID} ({(p.Items ?? []).length} thuốc)</div>
                  <div className="text-[13px] text-[#6c757d]">{new Date(p.CreatedAt).toLocaleString('vi-VN')}</div>
                </div>
                <span className="inline-block shrink-0 rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4]">{prescriptionStatusLabel(p.Status)}</span>
              </li>
            ))}
          </HistorySubsection>
          <HistorySubsection title="Chỉ định CLS" empty="Chưa có chỉ định nào." last>
            {(history?.orders ?? []).map(o => (
              <li key={o.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                <div>
                  <div className="font-semibold text-[#274760]">{o.Name} ({orderTypeLabel(o.Type)})</div>
                  <div className="text-[13px] text-[#6c757d]">{new Date(o.CreatedAt).toLocaleString('vi-VN')}</div>
                </div>
                <span className="inline-block shrink-0 rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4]">{orderStatusLabel(o.Status)}</span>
              </li>
            ))}
          </HistorySubsection>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={open => { if (!saving) setEditOpen(open); }}>
        <DialogContent className="max-h-[90vh] sm:max-w-[560px] overflow-y-auto rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Sửa thông tin bệnh nhân</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên *</label>
            <Input {...registerEdit('fullname')} aria-invalid={!!editErrors.fullname} className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" />
            <FieldError message={editErrors.fullname?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới tính *</label>
            <Controller
              control={editControl}
              name="gender"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g} value={g}>{genderLabel(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ngày sinh</label>
            <Controller
              control={editControl}
              name="date_of_birth"
              render={({ field }) => <DateOfBirthSelect value={field.value} onChange={field.onChange} />}
            />
            <FieldError message={editErrors.date_of_birth?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số điện thoại</label>
            <Input {...registerEdit('phone')} aria-invalid={!!editErrors.phone} className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" />
            <FieldError message={editErrors.phone?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">CCCD</label>
            <Input {...registerEdit('cccd')} className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Địa chỉ</label>
            <Input {...registerEdit('address')} className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số BHYT</label>
            <Input {...registerEdit('insurance_number')} className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tiền sử dị ứng</label>
            <Textarea {...registerEdit('allergies')} className="min-h-[70px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" />

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">{formError}</div>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {saving ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {ConfirmDialog}
    </>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold tracking-wide text-[#6c757d] uppercase">{label}</div>
      <div className="text-[15px] text-[#274760]">{value}</div>
    </div>
  );
}

interface IconButtonProps {
  onClick: () => void;
  title: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

function IconButton({ onClick, title, className, disabled, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

interface HistorySubsectionProps {
  title: string;
  empty: string;
  children: ReactNode;
  last?: boolean;
}

function HistorySubsection({ title, empty, children, last }: HistorySubsectionProps) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);
  return (
    <div className={last ? 'mb-0' : 'mb-5'}>
      <h3 className="mb-2.5 text-sm font-bold text-[#274760]">{title}</h3>
      {hasItems ? (
        <ul className="m-0 list-none p-0">{children}</ul>
      ) : (
        <p className="m-0 text-sm text-[#6c757d]">{empty}</p>
      )}
    </div>
  );
}
