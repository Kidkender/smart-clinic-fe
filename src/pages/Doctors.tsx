import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments } from '@/api/department';
import { listDoctors, upsertDoctorProfile } from '@/api/doctor';
import { resolveError } from '@/utils/errorMessages';
import { userStatusLabel } from '@/utils/labels';
import { doctorProfileSchema, type DoctorProfileFormValues } from '@/schemas/doctor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

interface Department {
  ID: number | string;
  Name: string;
}

interface DoctorProfile {
  Specialty: string;
  LicenseNo?: string;
  Qualification?: string;
  YearsExperience: number;
  Bio?: string;
}

interface Doctor {
  ID: number | string;
  Fullname: string;
  Email: string;
  DepartmentID?: number | string | null;
  Status: string;
  profile?: DoctorProfile;
}

const EMPTY_PROFILE_FORM: DoctorProfileFormValues = {
  specialty: '',
  license_no: '',
  qualification: '',
  years_experience: 0,
  bio: '',
};

export default function Doctors() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('all');
  const [specialty, setSpecialty] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalDoctor, setModalDoctor] = useState<Doctor | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm<DoctorProfileFormValues>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: EMPTY_PROFILE_FORM,
  });

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data ?? [])).catch(() => setDepartments([]));
  }, []);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listDoctors({
        department_id: departmentId !== 'all' ? Number(departmentId) : undefined,
        specialty: specialty.trim() || undefined,
        limit: 100,
      });
      setDoctors(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [departmentId, specialty]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const departmentName = (id?: number | string | null) =>
    departments.find(d => String(d.ID) === String(id))?.Name ?? '—';

  const openProfile = (doctor: Doctor) => {
    reset({
      specialty: doctor.profile?.Specialty ?? '',
      license_no: doctor.profile?.LicenseNo ?? '',
      qualification: doctor.profile?.Qualification ?? '',
      years_experience: doctor.profile?.YearsExperience ?? 0,
      bio: doctor.profile?.Bio ?? '',
    });
    setFormError('');
    setModalDoctor(doctor);
  };

  const closeModal = () => {
    if (saving) return;
    setModalDoctor(null);
  };

  const handleProfileSubmit = handleSubmit(async values => {
    if (!modalDoctor) return;
    setFormError('');
    setSaving(true);
    try {
      await upsertDoctorProfile(modalDoctor.ID, {
        specialty: values.specialty.trim(),
        license_no: values.license_no.trim(),
        qualification: values.qualification.trim(),
        years_experience: values.years_experience,
        bio: values.bio.trim(),
      });
      await fetchDoctors();
      setModalDoctor(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Quản lý Bác sĩ</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Hồ sơ chuyên môn, ca trực, nghỉ phép và hiệu suất khám bệnh
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="h-auto w-[220px] shrink-0 rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760] data-[size=default]:h-auto">
              <SelectValue placeholder="Tất cả khoa/phòng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khoa/phòng</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Lọc theo chuyên khoa…"
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className="h-auto w-[220px] shrink-0 rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
          />
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
        ) : doctors.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">
            <Icon icon="fa6-solid:user-doctor" className="mb-4 text-5xl text-[#307bc4] opacity-40" />
            <h3 className="mb-2 text-[#274760]">Không có bác sĩ nào phù hợp</h3>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Bác sĩ</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Khoa/Phòng</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Chuyên khoa</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Kinh nghiệm</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Trạng thái</TableHead>
                <TableHead className="h-auto px-4 py-3"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map(doctor => (
                <TableRow key={doctor.ID} className="border-t border-[#f0f4f8]">
                  <TableCell className="px-4 py-3 text-sm">
                    <div className="font-semibold text-[#274760]">{doctor.Fullname}</div>
                    <div className="text-[13px] text-[#6c757d]">{doctor.Email}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {departmentName(doctor.DepartmentID)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {doctor.profile?.Specialty || '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">
                    {doctor.profile ? `${doctor.profile.YearsExperience} năm` : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <Badge variant={doctor.Status === 'active' ? 'secondary' : 'outline'}>
                      {userStatusLabel(doctor.Status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/doctors/${doctor.ID}`)}
                      title="Ca trực / Nghỉ phép / Hiệu suất"
                      className="inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#307bc4]"
                    >
                      <Icon icon="fa6-solid:calendar-days" className="text-[13px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openProfile(doctor)}
                      title="Sửa hồ sơ"
                      className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                    >
                      <Icon icon="fa6-solid:pen" className="text-[13px]" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!modalDoctor} onOpenChange={open => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-[480px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">
              Hồ sơ chuyên môn — {modalDoctor?.Fullname}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Chuyên khoa *</label>
            <Input
              {...register('specialty')}
              placeholder="VD: Tim mạch"
              aria-invalid={!!errors.specialty}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={errors.specialty?.message} />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số CCHN</label>
                <Input
                  {...register('license_no')}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số năm kinh nghiệm</label>
                <Input
                  type="number"
                  min={0}
                  {...register('years_experience', { valueAsNumber: true })}
                  aria-invalid={!!errors.years_experience}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.years_experience?.message} />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bằng cấp/Chứng chỉ</label>
            <Input
              {...register('qualification')}
              placeholder="VD: Tiến sĩ Y khoa, ĐH Y Hà Nội"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới thiệu</label>
            <Textarea
              {...register('bio')}
              rows={3}
              className="rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {formError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {formError}
              </div>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
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
                {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
