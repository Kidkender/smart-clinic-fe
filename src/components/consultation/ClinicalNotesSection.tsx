import { useEffect, useState } from 'react';
import { updateClinicalNotes } from '@/api/consultation';
import { resolveError } from '@/utils/errorMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ErrorBox } from './shared';

export default function ClinicalNotesSection({
  encounterId,
  notes,
  canEdit,
  onSaved,
}: {
  encounterId: string;
  notes?: string;
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(notes ?? '');
    setDirty(false);
  }, [notes]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await updateClinicalNotes(encounterId, value);
      setDirty(false);
      await onSaved();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-5 rounded-2xl border-[#e8edf2] p-6">
      <h2 className="m-0 mb-4 text-[17px] font-bold text-[#274760]">Ghi chú lâm sàng</h2>
      <Textarea
        value={value}
        onChange={e => { setValue(e.target.value); setDirty(true); }}
        disabled={!canEdit}
        placeholder={canEdit ? 'Triệu chứng, diễn biến, nhận định lâm sàng…' : 'Chưa có ghi chú.'}
        className="min-h-[90px] w-full rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
      />
      {error && <div className="mt-2.5"><ErrorBox>{error}</ErrorBox></div>}
      {canEdit && (
        <Button onClick={handleSave} disabled={saving || !dirty} className="mt-3 h-auto rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white hover:bg-[#307bc4]/90">
          {saving ? 'Đang lưu…' : 'Lưu ghi chú'}
        </Button>
      )}
    </Card>
  );
}
