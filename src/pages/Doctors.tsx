import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments } from '@/api/department';
import { listDoctors, upsertDoctorProfile, createDoctor, deleteDoctor } from '@/api/doctor';
import { resolveError } from '@/utils/errorMessages';
import { userStatusLabel } from '@/utils/labels';
import useConfirm from '@/hooks/useConfirm';
import {
  doctorProfileSchema, type DoctorProfileFormValues,
  doctorCreateSchema, type DoctorCreateFormValues,
} from '@/schemas/doctor';
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
  Institution?: string;
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

const QUALIFICATIONS = [
  'Bác sĩ đa khoa', 'Chuyên khoa I', 'Chuyên khoa II', 'Thạc sĩ Y khoa', 'Tiến sĩ Y khoa', 'Phó Giáo sư', 'Giáo sư',
];

const SPECIALTIES = [
  'Nội khoa', 'Ngoại khoa', 'Sản phụ khoa', 'Nhi khoa', 'Tim mạch', 'Hô hấp', 'Tiêu hóa', 'Nội tiết',
  'Thần kinh', 'Tâm thần', 'Da liễu', 'Mắt', 'Tai Mũi Họng', 'Răng Hàm Mặt', 'Ung bướu',
  'Chấn thương chỉnh hình', 'Tiết niệu', 'Truyền nhiễm', 'Y học cổ truyền', 'Phục hồi chức năng',
  'Gây mê hồi sức', 'Chẩn đoán hình ảnh', 'Xét nghiệm', 'Khác',
];

const EMPTY_PROFILE_FORM: DoctorProfileFormValues = {
  specialty: '',
  license_no: '',
  qualification: '',
  institution: '',
  years_experience: 0,
  bio: '',
};

const EMPTY_CREATE_FORM: DoctorCreateFormValues = {
  fullname: '', email: '', password: '', department_id: '',
  specialty: '', license_no: '', qualification: '', institution: '', years_experience: 0, bio: '',
};

function SortableHead({
  label, column, sortBy, sortDir, onSort,
}: {
  label: string;
  column: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (column: string) => void;
}) {
  const active = sortBy === column;
  const icon = active ? (sortDir === 'asc' ? 'fa6-solid:sort-up' : 'fa6-solid:sort-down') : 'fa6-solid:sort';
  return (
    <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-xs font-bold text-[#6c757d] uppercase"
      >
        {label}
        <Icon icon={icon} className={active ? 'text-[#307bc4]' : 'text-[#6c757d]/50'} />
      </button>
    </TableHead>
  );
}

export default function Doctors() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('all');
  const [specialty, setSpecialty] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [confirm, ConfirmDialog] = useConfirm();

  const [modalDoctor, setModalDoctor] = useState<Doctor | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, reset, control, formState: { errors },
  } = useForm<DoctorProfileFormValues>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: EMPTY_PROFILE_FORM,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate,
    control: createControl, formState: { errors: createErrors },
  } = useForm<DoctorCreateFormValues>({
    resolver: zodResolver(doctorCreateSchema),
    defaultValues: EMPTY_CREATE_FORM,
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
        specialty: specialty !== 'all' ? specialty : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        limit: 100,
      });
      setDoctors(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [departmentId, specialty, sortBy, sortDir]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const departmentName = (id?: number | string | null) =>
    departments.find(d => String(d.ID) === String(id))?.Name ?? '—';

  const handleDelete = async (doctor: Doctor) => {
    if (!(await confirm(`Xóa bác sĩ "${doctor.Fullname}"? Hành động này không thể hoàn tác.`, { confirmLabel: 'Xóa' }))) return;
    setDeletingId(doctor.ID);
    setError('');
    try {
      await deleteDoctor(doctor.ID);
      await fetchDoctors();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openProfile = (doctor: Doctor) => {
    reset({
      specialty: doctor.profile?.Specialty ?? '',
      license_no: doctor.profile?.LicenseNo ?? '',
      qualification: doctor.profile?.Qualification ?? '',
      institution: doctor.profile?.Institution ?? '',
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
        institution: values.institution.trim(),
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

  const openCreate = () => {
    resetCreate({ ...EMPTY_CREATE_FORM, department_id: String(departments[0]?.ID ?? '') });
    setCreateError('');
    setShowPassword(false);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const handleCreate = handleCreateSubmit(async values => {
    setCreateError('');
    setCreating(true);
    try {
      await createDoctor({
        fullname: values.fullname.trim(),
        email: values.email.trim(),
        password: values.password,
        department_id: Number(values.department_id),
        specialty: values.specialty.trim(),
        license_no: values.license_no.trim(),
        qualification: values.qualification.trim(),
        institution: values.institution.trim(),
        years_experience: values.years_experience,
        bio: values.bio.trim(),
      });
      await fetchDoctors();
      setCreateOpen(false);
    } catch (err) {
      setCreateError(resolveError(err));
    } finally {
      setCreating(false);
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
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="h-auto w-[220px] shrink-0 rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760] data-[size=default]:h-auto">
              <SelectValue placeholder="Tất cả chuyên khoa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chuyên khoa</SelectItem>
              {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={openCreate}
            className="h-auto shrink-0 rounded-xl bg-[#307bc4] px-4.5 py-3 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            <Icon icon="fa6-solid:plus" className="text-[13px]" /> Thêm bác sĩ
          </Button>
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
                <SortableHead label="Bác sĩ" column="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableHead label="Khoa/Phòng" column="department" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Chuyên khoa</TableHead>
                <SortableHead label="Kinh nghiệm" column="experience" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
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
                    <button
                      type="button"
                      onClick={() => handleDelete(doctor)}
                      disabled={deletingId === doctor.ID}
                      title="Xóa bác sĩ"
                      className="ml-2 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-lg border border-[#dc3545]/20 bg-white text-[#dc3545] disabled:opacity-50"
                    >
                      <Icon icon="fa6-solid:trash" className="text-[13px]" />
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
            <Controller
              control={control}
              name="specialty"
              render={({ field }) => {
                const options = field.value && !SPECIALTIES.includes(field.value)
                  ? [field.value, ...SPECIALTIES]
                  : SPECIALTIES;
                return (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" aria-invalid={!!errors.specialty}>
                      <SelectValue placeholder="-- Chọn chuyên khoa --" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                );
              }}
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

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bằng cấp</label>
                <Controller
                  control={control}
                  name="qualification"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue placeholder="-- Chọn bằng cấp --" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Nơi đào tạo</label>
                <Input
                  {...register('institution')}
                  placeholder="VD: ĐH Y Hà Nội"
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới thiệu</label>
            <Textarea
              {...register('bio')}
              rows={3}
              placeholder="Giới thiệu ngắn về bác sĩ (kinh nghiệm, chuyên môn...)"
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
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={open => { if (!open) closeCreate(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px] rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Thêm bác sĩ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên *</label>
            <Input
              {...registerCreate('fullname')}
              placeholder="VD: Nguyễn Văn A"
              aria-invalid={!!createErrors.fullname}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={createErrors.fullname?.message} />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Email *</label>
                <Input
                  type="email"
                  {...registerCreate('email')}
                  placeholder="bacsi@smartclinic.vn"
                  aria-invalid={!!createErrors.email}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={createErrors.email?.message} />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Mật khẩu *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...registerCreate('password')}
                    placeholder="Tối thiểu 8 ký tự"
                    aria-invalid={!!createErrors.password}
                    className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 pr-10 text-[15px] text-[#274760]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-[#6c757d]"
                  >
                    <Icon icon={showPassword ? 'fa6-solid:eye-slash' : 'fa6-solid:eye'} className="text-sm" />
                  </button>
                </div>
                <FieldError message={createErrors.password?.message} />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Khoa/Phòng *</label>
            <Controller
              control={createControl}
              name="department_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                    <SelectValue placeholder="-- Chọn khoa --" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={createErrors.department_id?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Chuyên khoa *</label>
            <Controller
              control={createControl}
              name="specialty"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]" aria-invalid={!!createErrors.specialty}>
                    <SelectValue placeholder="-- Chọn chuyên khoa --" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={createErrors.specialty?.message} />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số CCHN</label>
                <Input
                  {...registerCreate('license_no')}
                  placeholder="VD: 001234/BYT-CCHN"
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số năm kinh nghiệm</label>
                <Input
                  type="number"
                  min={0}
                  {...registerCreate('years_experience', { valueAsNumber: true })}
                  placeholder="VD: 5"
                  aria-invalid={!!createErrors.years_experience}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={createErrors.years_experience?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Bằng cấp</label>
                <Controller
                  control={createControl}
                  name="qualification"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                        <SelectValue placeholder="-- Chọn bằng cấp --" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALIFICATIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Nơi đào tạo</label>
                <Input
                  {...registerCreate('institution')}
                  placeholder="VD: ĐH Y Hà Nội"
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới thiệu</label>
            <Textarea
              {...registerCreate('bio')}
              rows={3}
              placeholder="Giới thiệu ngắn về bác sĩ (kinh nghiệm, chuyên môn...)"
              className="rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {createError && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
                {createError}
              </div>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeCreate}
                disabled={creating}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
              >
                {creating ? 'Đang tạo…' : 'Tạo bác sĩ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </>
  );
}
