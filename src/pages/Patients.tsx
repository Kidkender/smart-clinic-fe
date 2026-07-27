import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { ErrorAlert } from '@/components/ui/alert';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { searchPatients, createPatient } from '@/api/patient';
import { resolveError } from '@/utils/errorMessages';
import { genderLabel } from '@/utils/labels';
import { patientSchema, type PatientFormValues } from '@/schemas/patient';
import { useAuth } from '@/context/AuthContext';
import FieldError from '@/components/FieldError';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { MultiSelect } from '@/components/ui/multi-select';
import { Pagination } from '@/components/ui/pagination';
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

interface Patient {
  ID: number | string;
  MRN: string;
  Fullname: string;
  Gender: string;
  Phone: string;
  CCCD: string;
}

const PAGE_LIMIT = 20;
const GENDERS = ['male', 'female', 'other'];
const GENDER_OPTIONS = GENDERS.map(value => ({ value, label: genderLabel(value) }));
const EMPTY_FORM: PatientFormValues = {
  fullname: '',
  gender: 'other',
  phone: '',
  cccd: '',
  address: '',
  insurance_number: '',
  allergies: '',
  date_of_birth: '',
};

export default function Patients() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'receptionist';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('mrn');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const {
    register, handleSubmit, control, reset, formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: EMPTY_FORM,
  });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await searchPatients({
        q: search || undefined,
        gender: genderFilter.length === 0 ? undefined : genderFilter.join(','),
        page,
        limit: PAGE_LIMIT,
        sort_by: sortBy || undefined,
        sort_dir: sortBy ? sortDir : undefined,
      });
      setPatients(result.data ?? []);
      setTotal(result.meta?.total ?? 0);
      setTotalPages(result.meta?.total_pages ?? 1);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [search, genderFilter, sortBy, sortDir, page]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, genderFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const hasActiveFilters = !!searchInput || genderFilter.length > 0;

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setGenderFilter([]);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    reset(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = handleSubmit(async values => {
    setFormError('');
    setSaving(true);
    try {
      await createPatient({
        ...values,
        fullname: values.fullname.trim(),
        date_of_birth: values.date_of_birth || null,
      });
      await fetchPatients();
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  });

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Bệnh nhân</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">Tra cứu và tiếp nhận bệnh nhân</p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            size="cta"
          >
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Thêm bệnh nhân
          </Button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#6c757d]" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, SĐT, CCCD, MRN…"
            className="h-auto rounded-xl border-[#dde2e8] py-2.75 pr-4 pl-9.5 text-sm text-[#274760]"
          />
        </div>
        <MultiSelect
          options={GENDER_OPTIONS}
          selected={genderFilter}
          onChange={setGenderFilter}
          placeholder="Tất cả giới tính"
          className="w-[170px]"
        />
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

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : patients.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không tìm thấy bệnh nhân nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <SortableTableHead label="MRN" column="mrn" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Họ tên" column="fullname" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortableTableHead label="Giới tính" column="gender" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">SĐT</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">CCCD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map(p => (
                <TableRow
                  key={p.ID}
                  onClick={() => navigate(`/patients/${p.ID}`)}
                  className="cursor-pointer border-t border-[#f0f4f8]"
                >
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.MRN}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.Fullname}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{genderLabel(p.Gender)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.Phone}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#274760]">{p.CCCD}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} itemLabel="bệnh nhân" />
      )}

      <Dialog open={canManage && modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-h-[90vh] sm:max-w-[720px] overflow-y-auto rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Thêm bệnh nhân</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên *</label>
                <Input
                  {...register('fullname')}
                  placeholder="Nguyễn Văn A"
                  aria-invalid={!!errors.fullname}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.fullname?.message} />
              </div>

              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới tính *</label>
                <Controller
                  control={control}
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
                <FieldError message={errors.gender?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số điện thoại</label>
                <Input
                  {...register('phone')}
                  placeholder="0912345678"
                  aria-invalid={!!errors.phone}
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
                <FieldError message={errors.phone?.message} />
              </div>

              <div>
                <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">CCCD</label>
                <Input
                  {...register('cccd')}
                  placeholder="079..."
                  className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
                />
              </div>
            </div>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Địa chỉ</label>
            <Input
              {...register('address')}
              placeholder="Số nhà, đường, phường/xã…"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ngày sinh</label>
            <Controller
              control={control}
              name="date_of_birth"
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
            />
            <FieldError message={errors.date_of_birth?.message} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số BHYT</label>
            <Input
              {...register('insurance_number')}
              placeholder="DN4xxxxxxxxxx"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tiền sử dị ứng</label>
            <Input
              {...register('allergies')}
              placeholder="VD: Penicillin, hải sản…"
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            {formError && (
              <ErrorAlert icon={false} className="mt-4">{formError}</ErrorAlert>
            )}

            <DialogFooter className="mx-0 mt-6 mb-0 justify-end rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="h-auto w-30 rounded-xl border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="cta" className="w-30"
              >
                {saving ? 'Đang lưu…' : 'Tạo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
