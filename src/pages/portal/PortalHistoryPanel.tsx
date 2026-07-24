import { encounterStatusLabel, encounterTypeLabel } from '@/utils/labels';
import { cn } from '@/lib/utils';
import { portalAppointmentStatusBadgeClass } from '@/utils/badgeStyles';
import { Card } from '@/components/ui/card';
import type { PatientHistory } from './types';

export default function PortalHistoryPanel({
  history,
  loading,
}: {
  history: PatientHistory | null;
  loading: boolean;
}) {
  return (
    <div className="mt-5">
      <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Lịch sử khám &amp; đơn thuốc</h2>
      {loading ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
      ) : !history || (history.encounters?.length ?? 0) === 0 ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Chưa có lượt khám nào.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {history.encounters!.map(enc => {
            const rx = (history.prescriptions ?? []).filter(p => p.EncounterID === enc.ID && p.Status !== 'cancelled');
            return (
              <Card key={enc.ID} className="rounded-2xl border-[#d1fae5] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div>
                    <div className="font-bold text-[#134e48]">{enc.Department?.Name ?? `Khoa #${enc.DepartmentID}`}</div>
                    <div className="mt-1 text-[13px] text-[#6c757d]">
                      {encounterTypeLabel(enc.Type)} · {new Date(enc.CheckedInAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <span className={cn('inline-block', portalAppointmentStatusBadgeClass(enc.Status === 'completed' ? 'booked' : enc.Status))}>
                    {encounterStatusLabel(enc.Status)}
                  </span>
                </div>
                {enc.ClinicalNotes && (
                  <div className="mt-2.5 text-[13px] text-[#134e48]">{enc.ClinicalNotes}</div>
                )}
                {rx.length > 0 && (
                  <div className="mt-3 border-t border-[#d1fae5] pt-3">
                    <div className="mb-1.5 text-[13px] font-bold text-[#134e48]">Đơn thuốc</div>
                    {rx.map(p => (
                      <ul key={p.ID} className="m-0 pl-4.5">
                        {(p.Items ?? []).map(item => (
                          <li key={item.ID} className="text-[13px] text-[#6c757d]">
                            {item.Drug?.Name ?? `Thuốc #${item.DrugID}`} — {item.Dosage}, SL {item.Quantity}
                            {item.Instructions ? ` (${item.Instructions})` : ''}
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
