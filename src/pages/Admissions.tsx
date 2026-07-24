import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admitPatient, listAdmissions } from '@/api/admission';
import { getDepartments, getDoctorsByDepartment } from '@/api/department';
import { listWards } from '@/api/ward';
import { listBeds } from '@/api/bed';
import { searchPatients } from '@/api/patient';
import { resolveError } from '@/utils/errorMessages';
import { admissionTypeLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { admissionStatusBadgeClass } from '@/utils/badgeStyles';
import { admissionSchema, type AdmissionFormValues } from '@/schemas/admission';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Department {
  ID: number | string;
  Name: string;
}

interface Doctor {
  id: number | string;
  fullname: string;
}

interface Ward {
  ID: number | string;
  Name: string;
}

interface Bed {
  ID: number | string;
  BedNumber: string;
}

interface PatientResult {
  ID: number | string;
  Fullname: string;
  MRN: string;
}

interface Admission {
  ID: number | string;
  AdmissionType: string;
  AdmittedAt: string;
  DischargedAt?: string | null;
  Encounter?: { PatientID?: number | string; Patient?: { Fullname?: string }; Department?: { Name?: string } };
  Ward?: { Name?: string };
  Bed?: { BedNumber?: string };
}

const ADMISSION_TYPES = ['bhyt', 'service', 'insurance_private'];

const ADMISSION_STATUS_OPTIONS = [
  { value: 'active', label: 'Đang điều trị' },
  { value: 'discharged', label: 'Đã xuất viện' },
];

const EMPTY_FORM: AdmissionFormValues = {
  patient_id: '', department_id: '', attending_doctor_id: '', admission_type: 'bhyt', ward_id: '', bed_id: '',
};

export default function Admissions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canAdmit = role === 'admin' || role === 'doctor' || role === 'receptionist';
  const [statusFilter, setStatusFilter] = useState<string[]>(['active']);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    control, handleSubmit, reset, setValue, watch, formState: { errors },
  } = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: EMPTY_FORM,
  });
  const wardId = watch('ward_id');
  const patientId = watch('patient_id');
  const departmentId = watch('department_id');
  const attendingDoctorId = watch('attending_doctor_id');

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdmissions({ status: statusFilter.length === 0 ? undefined : statusFilter.join(',') });
      setAdmissions(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const openAdmit = () => {
    reset(EMPTY_FORM);
    setPatientQuery('');
    setPatientResults([]);
    setDoctors([]);
    setWards([]);
    setBeds([]);
    setFormError('');
    setModalOpen(true);
  };

  const handlePatientSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPatientQuery(value);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    searchPatients({ q: value.trim(), page: 1, limit: 10 })
      .then(result => setPatientResults(result.data ?? []))
      .catch(() => setPatientResults([]));
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setValue('department_id', departmentId, { shouldValidate: true });
    setValue('attending_doctor_id', '');
    setValue('ward_id', '');
    setValue('bed_id', '');
    setBeds([]);
    setFormError('');
    if (!departmentId) {
      setDoctors([]);
      setWards([]);
      return;
    }
    try {
      const [doctorsResult, wardsResult] = await Promise.all([
        getDoctorsByDepartment(departmentId),
        listWards(departmentId),
      ]);
      const doctorList = doctorsResult.data ?? [];
      setDoctors(doctorList);
      setWards(wardsResult.data ?? []);
      if (doctorList.length === 0) {
        setFormError('Khoa này chưa có bác sĩ nào. Vui lòng chọn khoa khác hoặc liên hệ quản trị viên.');
      }
    } catch {
      setDoctors([]);
      setWards([]);
    }
  };

  const handleWardChange = async (wardId: string) => {
    setValue('ward_id', wardId);
    setValue('bed_id', '');
    if (!wardId) {
      setBeds([]);
      return;
    }
    try {
      const result = await listBeds({ ward_id: wardId, status: 'available' });
      setBeds(result.data ?? []);
    } catch {
      setBeds([]);
    }
  };

  const handleFormSubmit = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      const admission = await admitPatient({
        patient_id: Number(values.patient_id),
        department_id: Number(values.department_id),
        attending_doctor_id: Number(values.attending_doctor_id),
        admission_type: values.admission_type,
        ward_id: values.ward_id ? Number(values.ward_id) : undefined,
        bed_id: values.bed_id ? Number(values.bed_id) : undefined,
      });
      setModalOpen(false);
      await fetchAdmissions();
      navigate(`/admissions/${admission.data.ID}`);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Nội trú</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Danh sách bệnh nhân đang điều trị nội trú</p>
        </div>
        <div className="flex gap-2.5">
          <MultiSelect
            options={ADMISSION_STATUS_OPTIONS}
            selected={statusFilter}
            onChange={setStatusFilter}
            placeholder="Tất cả"
            className="w-[180px]"
          />
          {canAdmit && (
            <Button
              onClick={openAdmit}
              size="cta"
            >
              <Icon icon="fa6-solid:bed-pulse" className="text-sm" />
              Nhập viện
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : admissions.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không có đợt nhập viện nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bệnh nhân</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoa</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Giường</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Diện</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Ngày nhập</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admissions.map(a => (
                <TableRow key={a.ID} onClick={() => navigate(`/admissions/${a.ID}`)} className="cursor-pointer border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm font-semibold text-[#307bc4]">
                    {a.Encounter?.Patient?.Fullname ?? `#${a.Encounter?.PatientID}`}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Encounter?.Department?.Name ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{a.Ward?.Name ?? '—'} {a.Bed ? `· ${a.Bed.BedNumber}` : ''}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{admissionTypeLabel(a.AdmissionType)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{new Date(a.AdmittedAt).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span className={cn('inline-block', admissionStatusBadgeClass(a.DischargedAt ? 'discharged' : 'active'))}>
                      {a.DischargedAt ? 'Đã xuất viện' : 'Đang điều trị'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={canAdmit && modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-h-[90vh] sm:max-w-[460px] overflow-y-auto rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Nhập viện</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tìm bệnh nhân *</label>
            <Input
              value={patientQuery}
              onChange={handlePatientSearch}
              placeholder="Nhập tên, SĐT, CCCD, MRN…"
              aria-invalid={!!errors.patient_id}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            {patientResults.length > 0 && (
              <div className="mt-1.5 max-h-[140px] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                {patientResults.map(p => (
                  <div
                    key={p.ID}
                    onClick={() => { setValue('patient_id', String(p.ID), { shouldValidate: true }); setPatientQuery(`${p.Fullname} (${p.MRN})`); setPatientResults([]); }}
                    className="cursor-pointer px-3.5 py-2.5 text-sm text-[#274760] hover:bg-[#f4f7fa]"
                  >
                    {p.Fullname} <span className="text-[#6c757d]">· {p.MRN}</span>
                  </div>
                ))}
              </div>
            )}
            <FieldError message={errors.patient_id?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa điều trị *</label>
            <Controller
              control={control}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Chọn khoa --" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.department_id?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bác sĩ điều trị *</label>
            <Controller
              control={control}
              name="attending_doctor_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={doctors.length === 0}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Chọn bác sĩ --" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.attending_doctor_id?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Diện điều trị *</label>
            <Controller
              control={control}
              name="admission_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMISSION_TYPES.map(t => <SelectItem key={t} value={t}>{admissionTypeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.admission_type?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khu điều trị</label>
            <Controller
              control={control}
              name="ward_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleWardChange} disabled={wards.length === 0}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Chưa xếp giường --" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map(w => <SelectItem key={w.ID} value={String(w.ID)}>{w.Name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />

            {wardId && (
              <>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giường trống</label>
                <Controller
                  control={control}
                  name="bed_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue placeholder="-- Chưa chọn giường --" />
                      </SelectTrigger>
                      <SelectContent>
                        {beds.map(b => <SelectItem key={b.ID} value={String(b.ID)}>Giường {b.BedNumber}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </>
            )}

            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
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
                disabled={saving || !patientId || !departmentId || !attendingDoctorId || doctors.length === 0}
                size="cta"
              >
                {saving ? 'Đang lưu…' : 'Nhập viện'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
