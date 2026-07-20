import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { admitPatient, listAdmissions } from '@/api/admission';
import { getDepartments, getDoctorsByDepartment } from '@/api/department';
import { listWards } from '@/api/ward';
import { listBeds } from '@/api/bed';
import { searchPatients } from '@/api/patient';
import { resolveError } from '@/utils/errorMessages';
import { admissionTypeLabel } from '@/utils/labels';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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

interface AdmissionForm {
  patient_id: string;
  department_id: string;
  attending_doctor_id: string;
  admission_type: string;
  ward_id: string;
  bed_id: string;
}

const ADMISSION_TYPES = ['bhyt', 'service', 'insurance_private'];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#198754]/10 text-[#198754]',
  discharged: 'bg-[#6c757d]/10 text-[#6c757d]',
};

function emptyForm(): AdmissionForm {
  return { patient_id: '', department_id: '', attending_doctor_id: '', admission_type: 'bhyt', ward_id: '', bed_id: '' };
}

export default function Admissions() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canAdmit = role === 'admin' || role === 'doctor' || role === 'receptionist';
  const [statusFilter, setStatusFilter] = useState('active');
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
  const [form, setForm] = useState<AdmissionForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listAdmissions({ status: statusFilter || undefined });
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
    setForm(emptyForm());
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
    setForm(f => ({ ...f, department_id: departmentId, attending_doctor_id: '', ward_id: '', bed_id: '' }));
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
    setForm(f => ({ ...f, ward_id: wardId, bed_id: '' }));
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const admission = await admitPatient({
        patient_id: Number(form.patient_id),
        department_id: Number(form.department_id),
        attending_doctor_id: Number(form.attending_doctor_id),
        admission_type: form.admission_type,
        ward_id: form.ward_id ? Number(form.ward_id) : undefined,
        bed_id: form.bed_id ? Number(form.bed_id) : undefined,
      });
      setModalOpen(false);
      await fetchAdmissions();
      navigate(`/admissions/${admission.data.ID}`);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Nội trú</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Danh sách bệnh nhân đang điều trị nội trú</p>
        </div>
        <div className="flex gap-2.5">
          <Select value={statusFilter || 'all'} onValueChange={value => setStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="h-auto w-[180px] rounded-full px-5 py-2.75 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Đang điều trị</SelectItem>
              <SelectItem value="discharged">Đã xuất viện</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
          {canAdmit && (
            <Button
              onClick={openAdmit}
              className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
            >
              <Icon icon="fa6-solid:bed-pulse" className="text-sm" />
              Nhập viện
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
                    <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', a.DischargedAt ? STATUS_STYLES.discharged : STATUS_STYLES.active)}>
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
          <form onSubmit={handleSubmit}>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tìm bệnh nhân *</label>
            <Input
              value={patientQuery}
              onChange={handlePatientSearch}
              placeholder="Nhập tên, SĐT, CCCD, MRN…"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            {patientResults.length > 0 && (
              <div className="mt-1.5 max-h-[140px] overflow-y-auto rounded-lg border border-[#dde2e8]">
                {patientResults.map(p => (
                  <div
                    key={p.ID}
                    onClick={() => { setForm(f => ({ ...f, patient_id: String(p.ID) })); setPatientQuery(`${p.Fullname} (${p.MRN})`); setPatientResults([]); }}
                    className="cursor-pointer px-3.5 py-2.5 text-sm text-[#274760] hover:bg-[#f4f7fa]"
                  >
                    {p.Fullname} <span className="text-[#6c757d]">· {p.MRN}</span>
                  </div>
                ))}
              </div>
            )}

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa điều trị *</label>
            <Select value={form.department_id} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue placeholder="-- Chọn khoa --" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bác sĩ điều trị *</label>
            <Select value={form.attending_doctor_id} onValueChange={value => setForm(f => ({ ...f, attending_doctor_id: value }))} disabled={doctors.length === 0}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue placeholder="-- Chọn bác sĩ --" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doc => <SelectItem key={doc.id} value={String(doc.id)}>{doc.fullname}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Diện điều trị *</label>
            <Select value={form.admission_type} onValueChange={value => setForm(f => ({ ...f, admission_type: value }))}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMISSION_TYPES.map(t => <SelectItem key={t} value={t}>{admissionTypeLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khu điều trị</label>
            <Select value={form.ward_id} onValueChange={handleWardChange} disabled={wards.length === 0}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue placeholder="-- Chưa xếp giường --" />
              </SelectTrigger>
              <SelectContent>
                {wards.map(w => <SelectItem key={w.ID} value={String(w.ID)}>{w.Name}</SelectItem>)}
              </SelectContent>
            </Select>

            {form.ward_id && (
              <>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giường trống</label>
                <Select value={form.bed_id} onValueChange={value => setForm(f => ({ ...f, bed_id: value }))}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Chưa chọn giường --" />
                  </SelectTrigger>
                  <SelectContent>
                    {beds.map(b => <SelectItem key={b.ID} value={String(b.ID)}>Giường {b.BedNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {formError}
              </div>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
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
                disabled={saving || !form.patient_id || !form.department_id || !form.attending_doctor_id || doctors.length === 0}
                className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
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
