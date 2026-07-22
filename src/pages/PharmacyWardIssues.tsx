import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { listWards } from '@/api/ward';
import { searchDrugs } from '@/api/drug';
import { listWardDrugIssues, createWardDrugIssue } from '@/api/wardDrugIssue';
import { resolveError } from '@/utils/errorMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Ward {
  ID: number | string;
  Name: string;
}

interface Drug {
  ID: number | string;
  Name: string;
  StockQuantity: number;
}

interface IssueItem {
  drug_id: number | string;
  name: string;
  quantity: number;
}

interface WardDrugIssueItem {
  ID: number | string;
  Drug?: { Name?: string };
  DrugID: number | string;
  Quantity: number;
}

interface WardDrugIssue {
  ID: number | string;
  IssueDate: string;
  Notes?: string;
  Items?: WardDrugIssueItem[];
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function PharmacyWardIssues() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardId, setWardId] = useState('');
  const [issues, setIssues] = useState<WardDrugIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [issueDate, setIssueDate] = useState(todayInput());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<IssueItem[]>([]);
  const [drugQuery, setDrugQuery] = useState('');
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    listWards()
      .then(r => {
        const list = r.data ?? [];
        setWards(list);
        if (list.length > 0) setWardId(String(list[0].ID));
        else setLoading(false);
      })
      .catch(err => {
        setError(resolveError(err));
        setLoading(false);
      });
  }, []);

  const fetchIssues = useCallback(async (id: string) => {
    if (!id) {
      setIssues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await listWardDrugIssues(id, {});
      setIssues(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (wardId) fetchIssues(wardId);
  }, [wardId, fetchIssues]);

  const handleDrugSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDrugQuery(value);
    if (value.trim().length < 2) {
      setDrugResults([]);
      return;
    }
    try {
      const result = await searchDrugs({ name: value.trim(), page: 1, limit: 10 });
      setDrugResults(result.data ?? []);
    } catch {
      setDrugResults([]);
    }
  };

  const addItem = (drug: Drug) => {
    if (items.some(it => it.drug_id === drug.ID)) return;
    setItems([...items, { drug_id: drug.ID, name: drug.Name, quantity: 1 }]);
    setDrugQuery('');
    setDrugResults([]);
  };

  const removeItem = (drugId: number | string) => setItems(items.filter(it => it.drug_id !== drugId));

  const updateItemQuantity = (drugId: number | string, quantity: string) => {
    setItems(items.map(it => (it.drug_id === drugId ? { ...it, quantity: Number(quantity) || 1 } : it)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!wardId) return;
    if (items.length === 0) {
      setFormError('Cần thêm ít nhất một loại thuốc.');
      return;
    }
    setSaving(true);
    try {
      await createWardDrugIssue(wardId, {
        issue_date: issueDate,
        notes,
        items: items.map(it => ({ drug_id: it.drug_id, quantity: it.quantity })),
      });
      setItems([]);
      setNotes('');
      setIssueDate(todayInput());
      await fetchIssues(wardId);
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
          <h1 className="m-0 text-[26px] font-bold text-[#274760]">Cấp thuốc nội trú theo khoa</h1>
          <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
            Xuất thuốc định kỳ theo đợt cho khu điều trị, tự động trừ tồn kho
          </p>
        </div>
        <Select value={wardId} onValueChange={setWardId}>
          <SelectTrigger className="h-auto max-w-[260px] rounded-xl border-[#dde2e8] px-4 py-3 text-[15px] text-[#274760]">
            <SelectValue placeholder="Chọn khu điều trị" />
          </SelectTrigger>
          <SelectContent>
            {wards.map(w => (
              <SelectItem key={w.ID} value={String(w.ID)}>{w.Name}</SelectItem>
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
        <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Cấp thuốc đợt mới</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#274760]">Ngày cấp</label>
              <Input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#274760]">Ghi chú</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú (tùy chọn)"
                className="min-h-[42px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
              />
            </div>
          </div>

          <label className="mt-4 mb-1.5 block text-[13px] font-semibold text-[#274760]">Tìm thuốc</label>
          <Input
            value={drugQuery}
            onChange={handleDrugSearch}
            placeholder="Nhập tên thuốc…"
            className="h-auto rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
          />
          {drugResults.length > 0 && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-[#dde2e8]">
              {drugResults.map(d => (
                <div key={d.ID} onClick={() => addItem(d)} className="cursor-pointer px-3.5 py-2.5 text-sm text-[#274760]">
                  {d.Name} <span className="text-[#6c757d]">· còn {d.StockQuantity}</span>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-3">
              {items.map(it => (
                <div key={it.drug_id} className="mb-2 flex items-center gap-2.5 rounded-lg border border-[#f0f4f8] p-2.5">
                  <strong className="flex-1 text-sm text-[#274760]">{it.name}</strong>
                  <Input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={e => updateItemQuantity(it.drug_id, e.target.value)}
                    className="h-auto w-20 rounded-xl border-[#dde2e8] px-3 py-2 text-sm text-[#274760]"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(it.drug_id)}
                    className="inline-flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] bg-white text-[#6c757d]"
                  >
                    <Icon icon="fa6-solid:xmark" className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {formError && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#dc3545]/30 bg-[#dc3545]/8 px-4.5 py-3.5 text-[#dc3545]">
              {formError}
            </div>
          )}

          <Button
            type="submit"
            disabled={saving || !wardId}
            className="mt-4 h-auto rounded-full bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90"
          >
            {saving ? 'Đang lưu…' : 'Cấp thuốc'}
          </Button>
        </form>
      </Card>

      <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
        <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Lịch sử cấp thuốc</h2>
        {loading ? (
          <div className="p-10 text-center text-[#6c757d]">Đang tải…</div>
        ) : issues.length === 0 ? (
          <p className="text-sm text-[#6c757d]">Chưa có đợt cấp thuốc nào.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {issues.map(issue => (
              <li key={issue.ID} className="border-b border-[#f0f4f8] py-3">
                <div className="font-semibold text-[#274760]">
                  {new Date(issue.IssueDate).toLocaleDateString('vi-VN')}
                  {issue.Notes ? <span className="ml-2 font-normal text-[#6c757d]">· {issue.Notes}</span> : null}
                </div>
                <ul className="m-0 mt-1.5 list-none p-0 text-[13px] text-[#6c757d]">
                  {(issue.Items ?? []).map(it => (
                    <li key={it.ID}>{it.Drug?.Name ?? `Thuốc #${it.DrugID}`} — SL {it.Quantity}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
