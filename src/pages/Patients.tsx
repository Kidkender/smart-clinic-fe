import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { searchPatients, createPatient } from '@/api/patient';
import { resolveError } from '@/utils/errorMessages';
import { genderLabel } from '@/utils/labels';
import { validateFullname, validatePhone } from '@/utils/validation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import DateOfBirthSelect from '@/components/DateOfBirthSelect';
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

interface Patient {
  ID: number | string;
  MRN: string;
  Fullname: string;
  Gender: string;
  Phone: string;
  CCCD: string;
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

const GENDERS = ['male', 'female', 'other'];
const EMPTY_FORM = {
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
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPatients = useCallback(async (keyword: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await searchPatients({ q: keyword || undefined, page: 1, limit: 20 });
      setPatients(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients('');
  }, [fetchPatients]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchPatients(search.trim());
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const fullnameError = validateFullname(form.fullname);
    if (fullnameError) {
      setFormError(fullnameError);
      return;
    }
    const phoneError = validatePhone(form.phone);
    if (phoneError) {
      setFormError(phoneError);
      return;
    }
    if (form.date_of_birth && form.date_of_birth > todayDateInput()) {
      setFormError('Ngày sinh không được ở tương lai.');
      return;
    }
    setSaving(true);
    try {
      await createPatient({ ...form, fullname: form.fullname.trim(), date_of_birth: form.date_of_birth ? `${form.date_of_birth}T00:00:00Z` : null });
      await fetchPatients(search.trim());
      setModalOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

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
            className="h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            <Icon icon="fa6-solid:plus" className="text-sm" />
            Thêm bệnh nhân
          </Button>
        )}
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2.5">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên, SĐT, CCCD, MRN…"
          className="h-auto max-w-[360px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
        />
        <Button
          type="submit"
          variant="outline"
          className="h-auto rounded-full border-[#dde2e8] px-5 py-2.75 text-sm font-medium text-[#274760]"
        >
          Tìm kiếm
        </Button>
      </form>

      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
          <Icon icon="fa6-solid:circle-exclamation" />
          {error}
        </div>
      )}

      <Card className="gap-0 overflow-hidden rounded-2xl border-[#e8edf2] py-0">
        {loading ? (
          <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
        ) : patients.length === 0 ? (
          <div className="p-15 text-center text-[#6c757d]">Không tìm thấy bệnh nhân nào.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7fa] hover:bg-[#f4f7fa]">
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">MRN</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Họ tên</TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-bold text-[#6c757d] uppercase">Giới tính</TableHead>
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

      <Dialog open={canManage && modalOpen} onOpenChange={open => { if (!saving) setModalOpen(open); }}>
        <DialogContent className="max-h-[90vh] max-w-110 overflow-y-auto rounded-[20px] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#274760]">Thêm bệnh nhân</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Họ tên *</label>
            <Input
              required
              value={form.fullname}
              onChange={e => setForm({ ...form, fullname: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Giới tính *</label>
            <Select value={form.gender} onValueChange={value => setForm({ ...form, gender: value })}>
              <SelectTrigger className="h-auto w-full rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => <SelectItem key={g} value={g}>{genderLabel(g)}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số điện thoại</label>
            <Input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">CCCD</label>
            <Input
              value={form.cccd}
              onChange={e => setForm({ ...form, cccd: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Địa chỉ</label>
            <Input
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Ngày sinh</label>
            <DateOfBirthSelect value={form.date_of_birth} onChange={value => setForm({ ...form, date_of_birth: value })} />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Số BHYT</label>
            <Input
              value={form.insurance_number}
              onChange={e => setForm({ ...form, insurance_number: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
            />

            <label className="mt-4 mb-1.5 block text-sm font-semibold text-[#274760]">Tiền sử dị ứng</label>
            <Input
              value={form.allergies}
              onChange={e => setForm({ ...form, allergies: e.target.value })}
              className="h-auto rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]"
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
                onClick={() => setModalOpen(false)}
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
                {saving ? 'Đang lưu…' : 'Tạo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
