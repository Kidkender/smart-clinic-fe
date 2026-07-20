import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDepartments } from '@/api/department';
import { listWards, createWard, deleteWard } from '@/api/ward';
import { listBeds, createBed, updateBedStatus, deleteBed } from '@/api/bed';
import { resolveError } from '@/utils/errorMessages';
import { bedStatusLabel } from '@/utils/labels';
import useConfirm from '@/hooks/useConfirm';
import { wardSchema, bedSchema, type WardFormValues } from '@/schemas/facility';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import FieldError from '@/components/FieldError';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Department {
  ID: number | string;
  Name: string;
}

interface Ward {
  ID: number | string;
  Name: string;
}

interface Bed {
  ID: number | string;
  BedNumber: string;
  Status: string;
}

const BED_STATUSES = ['available', 'occupied', 'cleaning'];

export default function Wards() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [wards, setWards] = useState<Ward[]>([]);
  const [bedsByWard, setBedsByWard] = useState<Record<string, Bed[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingWard, setSavingWard] = useState(false);
  const [wardError, setWardError] = useState('');
  const {
    register: registerWard, handleSubmit: handleWardSubmit, reset: resetWard, formState: { errors: wardErrors },
  } = useForm<WardFormValues>({
    resolver: zodResolver(wardSchema),
    defaultValues: { name: '' },
  });

  const [bedForm, setBedForm] = useState<Record<string, string>>({});
  const [bedFormErrors, setBedFormErrors] = useState<Record<string, string>>({});
  const [savingBed, setSavingBed] = useState<Record<string, boolean>>({});
  const [confirm, ConfirmDialog] = useConfirm();

  useEffect(() => {
    getDepartments()
      .then(r => {
        const list = r.data ?? [];
        setDepartments(list);
        if (list.length > 0) setDepartmentId(String(list[0].ID));
        else setLoading(false);
      })
      .catch(err => {
        setError(resolveError(err));
        setLoading(false);
      });
  }, []);

  const fetchWards = useCallback(async (deptId: string) => {
    if (!deptId) {
      setWards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await listWards(deptId);
      const wardList: Ward[] = result.data ?? [];
      setWards(wardList);
      const bedsEntries = await Promise.all(
        wardList.map(async w => {
          const bedsResult = await listBeds({ ward_id: w.ID });
          return [w.ID, bedsResult.data ?? []] as const;
        }),
      );
      setBedsByWard(Object.fromEntries(bedsEntries));
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (departmentId) fetchWards(departmentId);
  }, [departmentId, fetchWards]);

  const handleCreateWard = handleWardSubmit(async values => {
    setWardError('');
    setSavingWard(true);
    try {
      await createWard({ department_id: Number(departmentId), name: values.name.trim() });
      resetWard({ name: '' });
      await fetchWards(departmentId);
    } catch (err) {
      setWardError(resolveError(err));
    } finally {
      setSavingWard(false);
    }
  });

  const handleCreateBed = async (wardId: number | string, e: FormEvent) => {
    e.preventDefault();
    const parsed = bedSchema.safeParse({ bed_number: (bedForm[wardId] ?? '').trim() });
    if (!parsed.success) {
      setBedFormErrors({ ...bedFormErrors, [wardId]: parsed.error.issues[0].message });
      return;
    }
    setBedFormErrors({ ...bedFormErrors, [wardId]: '' });
    setSavingBed({ ...savingBed, [wardId]: true });
    try {
      await createBed({ ward_id: wardId, bed_number: parsed.data.bed_number });
      setBedForm({ ...bedForm, [wardId]: '' });
      await fetchWards(departmentId);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSavingBed({ ...savingBed, [wardId]: false });
    }
  };

  const handleBedStatus = async (bed: Bed, status: string) => {
    try {
      await updateBedStatus(bed.ID, status);
      await fetchWards(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleDeleteWard = async (ward: Ward) => {
    if (!(await confirm(`Xóa khu điều trị "${ward.Name}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteWard(ward.ID);
      await fetchWards(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  const handleDeleteBed = async (bed: Bed) => {
    if (!(await confirm(`Xóa giường "${bed.BedNumber}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteBed(bed.ID);
      await fetchWards(departmentId);
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Khu điều trị & Giường bệnh</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Quản lý khu điều trị (ward) và sơ đồ giường theo khoa
          </p>
        </div>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="h-auto max-w-[240px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue placeholder="Chọn khoa/phòng" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(d => (
              <SelectItem key={d.ID} value={String(d.ID)}>{d.Name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Thêm khu điều trị mới</h2>
        <form onSubmit={handleCreateWard} noValidate className="flex gap-2.5">
          <div className="flex-1">
            <Input
              {...registerWard('name')}
              placeholder="Tên khu điều trị (VD: Khu A)"
              aria-invalid={!!wardErrors.name}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />
            <FieldError message={wardErrors.name?.message} />
          </div>
          <Button
            type="submit"
            disabled={savingWard || !departmentId}
            className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            {savingWard ? 'Đang lưu…' : 'Thêm'}
          </Button>
        </form>
        {wardError && (
          <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
            {wardError}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : wards.length === 0 ? (
        <div className="p-10 text-center text-[#6c757d]">Chưa có khu điều trị nào trong khoa này.</div>
      ) : (
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] items-start gap-5">
          {wards.map(ward => (
            <Card key={ward.ID} className="rounded-2xl border-[#e8edf2] p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="m-0 text-[17px] font-bold text-[#274760]">
                  {ward.Name}
                  <span className="ml-2 text-[13px] font-normal text-[#6c757d]">
                    ({(bedsByWard[ward.ID] ?? []).length} giường)
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleDeleteWard(ward)}
                  title="Xóa khu điều trị"
                  className="inline-flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                >
                  <Icon icon="fa6-solid:trash" className="text-[13px]" />
                </button>
              </div>
              {(bedsByWard[ward.ID] ?? []).length === 0 ? (
                <p className="text-sm text-[#6c757d]">Chưa có giường nào.</p>
              ) : (
                <ul className="m-0 mb-3.5 max-h-[320px] list-none overflow-y-auto p-0">
                  {(bedsByWard[ward.ID] ?? []).map(bed => (
                    <li key={bed.ID} className="flex items-center justify-between gap-2.5 border-b border-[#f0f4f8] py-2.5">
                      <span className="font-semibold text-[#274760]">Giường {bed.BedNumber}</span>
                      <div className="flex items-center gap-2">
                        <Select value={bed.Status} onValueChange={value => handleBedStatus(bed, value)}>
                          <SelectTrigger className="h-auto w-auto rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BED_STATUSES.map(s => <SelectItem key={s} value={s}>{bedStatusLabel(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => handleDeleteBed(bed)}
                          title="Xóa giường"
                          className="inline-flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#dc3545]"
                        >
                          <Icon icon="fa6-solid:trash" className="text-[13px]" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={e => handleCreateBed(ward.ID, e)} noValidate className="border-t border-[#f0f4f8] pt-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Số giường"
                    value={bedForm[ward.ID] ?? ''}
                    onChange={e => setBedForm({ ...bedForm, [ward.ID]: e.target.value })}
                    aria-invalid={!!bedFormErrors[ward.ID]}
                    className="h-auto flex-1 rounded-xl border-[#dde2e8] px-3 py-2.25 text-[13px] text-[#274760]"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={savingBed[ward.ID]}
                    className="h-auto rounded-full border-[#dde2e8] px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-[#274760]"
                  >
                    <Icon icon="fa6-solid:plus" className="mr-1 text-[11px]" />Thêm giường
                  </Button>
                </div>
                <FieldError message={bedFormErrors[ward.ID]} />
              </form>
            </Card>
          ))}
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}
