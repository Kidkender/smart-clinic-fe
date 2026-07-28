import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getEncounterById, updateEncounterStatus } from '@/api/encounter';
import { listVitalSigns, listDiagnoses } from '@/api/consultation';
import { listOrdersByEncounter } from '@/api/order';
import { listPrescriptionsByEncounter } from '@/api/prescription';
import { useAuth } from '@/context/AuthContext';
import useConfirm from '@/hooks/useConfirm';
import { resolveError } from '@/utils/errorMessages';
import { encounterStatusLabel, encounterTypeLabel } from '@/utils/labels';
import { allergyWarningClass } from '@/utils/badgeStyles';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import VitalsSection from '@/components/consultation/VitalsSection';
import DiagnosesSection from '@/components/consultation/DiagnosesSection';
import ClinicalNotesSection from '@/components/consultation/ClinicalNotesSection';
import OrdersSection from '@/components/consultation/OrdersSection';
import PrescriptionsSection from '@/components/consultation/PrescriptionsSection';
import RecordUsageDialog from '@/components/medical-supplies/RecordUsageDialog';
import { SectionBadge, ErrorBox, includesRole } from '@/components/consultation/shared';
import type { Encounter, VitalSign, Diagnosis, Order, Prescription } from '@/components/consultation/types';

export default function Consultation() {
  const { id } = useParams<{ id: string }>();
  const encounterId = id ?? '';
  const navigate = useNavigate();
  const { role } = useAuth();
  const canRecordVitals = includesRole(['admin', 'doctor', 'nurse'], role);
  // Must match backend's clinicalRoles gate on PATCH /encounters/:id/status (routes/encounter.go)
  // and vitalsRoles gate on GET vitals/diagnoses (routes/consultation.go) — pharmacist can open an
  // encounter to dispense, but has no read access to vitals/diagnoses, so those must be skipped
  // entirely rather than fetched and 403ing the whole page load.
  const canCompleteEncounter = canRecordVitals;
  const canViewClinicalData = canRecordVitals;
  const canDiagnose = includesRole(['admin', 'doctor'], role);
  const canOrder = includesRole(['admin', 'doctor'], role);
  const canUpdateOrderStatus = includesRole(['admin', 'lab_tech', 'nurse'], role);
  const canPrescribe = includesRole(['admin', 'doctor'], role);
  const canUpdatePrescriptionStatus = includesRole(['admin', 'pharmacist'], role);
  const canRecordSupplyUsage = includesRole(['admin', 'doctor', 'nurse', 'pharmacist'], role);

  const [confirm, ConfirmDialog] = useConfirm();
  const [supplyUsageOpen, setSupplyUsageOpen] = useState(false);

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [enc, o, p] = await Promise.all([
        getEncounterById(encounterId),
        listOrdersByEncounter(encounterId),
        listPrescriptionsByEncounter(encounterId),
      ]);
      setEncounter(enc.data);
      setOrders(o.data ?? []);
      setPrescriptions(p.data ?? []);

      if (canViewClinicalData) {
        const [v, d] = await Promise.all([listVitalSigns(encounterId), listDiagnoses(encounterId)]);
        setVitals(v.data ?? []);
        setDiagnoses(d.data ?? []);
      }
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [encounterId, canViewClinicalData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleComplete = async () => {
    const ok = await confirm(
      'Hoàn tất lượt khám này? Sau khi hoàn tất, dược sĩ sẽ được phép cấp phát các đơn thuốc đang hiệu lực của lượt khám. Hãy chắc chắn đã ghi nhận đầy đủ sinh hiệu, chẩn đoán, chỉ định và đơn thuốc trước khi tiếp tục.',
      { title: 'Hoàn tất khám', danger: false, confirmLabel: 'Hoàn tất' },
    );
    if (!ok) return;
    try {
      await updateEncounterStatus(encounterId, 'completed');
      await loadAll();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  if (loading) {
    return <div className="p-15 text-center text-[#6c757d]">Đang tải…</div>;
  }
  if (error && !encounter) {
    return <ErrorBox>{error}</ErrorBox>;
  }
  if (!encounter) return null;

  const isCompleted = encounter.Status === 'completed';

  return (
    <>
      {ConfirmDialog}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-sm font-semibold text-[#307bc4]"
      >
        <Icon icon="fa6-solid:arrow-left" className="text-xs" /> Quay lại
      </button>

      <Card className="rounded-2xl border-[#e8edf2] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-[22px] font-bold text-[#274760]">
              {encounter.Patient?.Fullname ?? `Bệnh nhân #${encounter.PatientID}`}
            </h1>
            <p className="mt-1 mb-0 text-sm text-[#6c757d]">
              MRN: {encounter.Patient?.MRN ?? '—'} · {encounter.Department?.Name ?? `Khoa #${encounter.DepartmentID}`} · {encounterTypeLabel(encounter.Type)} · STT {encounter.QueueNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SectionBadge>{encounterStatusLabel(encounter.Status)}</SectionBadge>
            {canRecordSupplyUsage && (
              <Button
                variant="outline"
                onClick={() => setSupplyUsageOpen(true)}
                className="h-auto rounded-xl border-[#dde2e8] px-4 py-2.25 text-[13px] font-medium text-[#274760]"
              >
                <Icon icon="fa6-solid:kit-medical" className="mr-1.5 text-[13px]" />Ghi nhận vật tư
              </Button>
            )}
            {canCompleteEncounter && encounter.Status === 'in_progress' && (
              <Button
                onClick={handleComplete}
                size="cta"
              >
                <Icon icon="fa6-solid:check" className="mr-1.5 text-[13px]" />Hoàn tất khám
              </Button>
            )}
          </div>
        </div>
        {encounter.Patient?.Allergies && (
          <div className={cn('mt-3.5', allergyWarningClass)}>
            <Icon icon="fa6-solid:triangle-exclamation" className="mr-1.5" />Dị ứng: {encounter.Patient.Allergies}
          </div>
        )}
        {error && <div className="mt-3.5"><ErrorBox>{error}</ErrorBox></div>}
      </Card>

      {isCompleted && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-[#6c757d]/25 bg-[#6c757d]/8 px-4.5 py-3.5 text-[13px] font-medium text-[#6c757d]">
          <Icon icon="fa6-solid:lock" />
          Lượt khám đã hoàn tất — sinh hiệu, chẩn đoán, ghi chú và chỉ định đã bị khoá. Đơn thuốc vẫn có thể sửa nếu dược sĩ báo thiếu thuốc.
        </div>
      )}

      {canViewClinicalData && (
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-5">
          <VitalsSection encounterId={encounterId} vitals={vitals} canRecord={canRecordVitals && !isCompleted} onRecorded={loadAll} />
          <DiagnosesSection encounterId={encounterId} diagnoses={diagnoses} canAdd={canDiagnose && !isCompleted} onAdded={loadAll} />
        </div>
      )}

      <ClinicalNotesSection encounterId={encounterId} notes={encounter.ClinicalNotes} canEdit={canDiagnose && !isCompleted} onSaved={loadAll} />

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(460px,1fr))] gap-5">
        <OrdersSection encounterId={encounterId} orders={orders} canCreate={canOrder && !isCompleted} canUpdateStatus={canUpdateOrderStatus} role={role} onChanged={loadAll} />
        <PrescriptionsSection
          encounterId={encounterId}
          prescriptions={prescriptions}
          canCreate={canPrescribe}
          canUpdateStatus={canUpdatePrescriptionStatus}
          encounterCompleted={isCompleted}
          onChanged={loadAll}
        />
      </div>

      <RecordUsageDialog
        open={supplyUsageOpen}
        onClose={() => setSupplyUsageOpen(false)}
        onSaved={async () => {}}
        fixedEncounterId={encounterId}
        fixedEncounterLabel={`${encounter.Patient?.Fullname ?? `Bệnh nhân #${encounter.PatientID}`} — Lượt khám #${encounterId}`}
      />
    </>
  );
}
