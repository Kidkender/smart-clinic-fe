import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { listFeeSettings, updateFeeSetting } from '@/api/feeSettings';
import { resolveError } from '@/utils/errorMessages';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface FeeSetting {
  ID: number | string;
  Key: string;
  Name: string;
  Amount: number;
  IsPercentage: boolean;
}

export default function FeeSettings() {
  const { role } = useAuth();
  // Must match backend's writeRoles gate on PUT /fee-settings/:key
  // (routes/fee_setting.go) — cashier/receptionist can read but not edit.
  const canEdit = role === 'admin';
  const [settings, setSettings] = useState<FeeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedKey, setSavedKey] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listFeeSettings();
      const list: FeeSetting[] = result.data ?? [];
      setSettings(list);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const displayValue = (setting: FeeSetting) => {
    const raw = form[setting.Key] ?? String(setting.IsPercentage ? setting.Amount * 100 : setting.Amount);
    return raw;
  };

  const handleSave = async (setting: FeeSetting) => {
    const raw = displayValue(setting);
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError('Giá trị không hợp lệ.');
      return;
    }
    const amount = setting.IsPercentage ? parsed / 100 : parsed;
    setSaving({ ...saving, [setting.Key]: true });
    setError('');
    try {
      await updateFeeSetting(setting.Key, amount);
      setSavedKey(setting.Key);
      setTimeout(() => setSavedKey(''), 2000);
      await fetchSettings();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSaving({ ...saving, [setting.Key]: false });
    }
  };

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 text-[26px] font-bold text-[#274760]">Cấu hình viện phí</h1>
        <p className="mt-1 mb-0 text-[15px] text-[#6c757d]">
          Điều chỉnh phí khám bệnh và thuế VAT áp dụng cho hóa đơn mới. Không ảnh hưởng hóa đơn đã lập.
        </p>
      </div>

      {error && <ErrorAlert className="mb-5">{error}</ErrorAlert>}

      {loading ? (
        <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-5">
          {settings.map(setting => (
            <Card key={setting.ID} className="rounded-2xl border-[#e8edf2] p-6">
              <h2 className="m-0 mb-1 text-[17px] font-bold text-[#274760]">{setting.Name}</h2>
              <p className="mt-0 mb-3.5 text-xs text-[#6c757d]">
                {setting.IsPercentage ? 'Tính theo % trên mỗi dòng hóa đơn' : 'Số tiền cố định (VNĐ)'}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="0"
                    step={setting.IsPercentage ? '0.1' : '1000'}
                    value={displayValue(setting)}
                    onChange={e => setForm({ ...form, [setting.Key]: e.target.value })}
                    disabled={!canEdit}
                    className="h-auto rounded-xl border-[#dde2e8] px-3 py-2.25 pr-10 text-[15px] text-[#274760]"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-[#6c757d]">
                    {setting.IsPercentage ? '%' : 'đ'}
                  </span>
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    disabled={saving[setting.Key]}
                    onClick={() => handleSave(setting)}
                    size="cta-sm"
                    className="shrink-0"
                  >
                    {saving[setting.Key] ? 'Đang lưu…' : savedKey === setting.Key ? 'Đã lưu ✓' : 'Lưu'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
