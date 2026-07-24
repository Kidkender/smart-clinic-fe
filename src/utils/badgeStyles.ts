type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10',
  info: 'rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4] hover:bg-[#307bc4]/10',
  warning: 'rounded-full bg-[#ffc107]/15 px-2.5 py-1 text-xs font-semibold text-[#8a6100] hover:bg-[#ffc107]/15',
  success: 'rounded-full bg-[#28a745]/10 px-2.5 py-1 text-xs font-semibold text-[#28a745] hover:bg-[#28a745]/10',
  danger: 'rounded-full bg-[#dc3545]/10 px-2.5 py-1 text-xs font-semibold text-[#dc3545] hover:bg-[#dc3545]/10',
};

export function toneBadgeClass(tone: BadgeTone): string {
  return TONE_CLASS[tone];
}

export type { BadgeTone };

export const allergyWarningClass = 'rounded-lg bg-[#dc3545]/8 px-3.5 py-2.5 text-[13px] font-semibold text-[#dc3545]';

const IMAGING_STUDY_STATUS_TONE: Record<string, BadgeTone> = {
  completed: 'info',
  in_progress: 'warning',
};

const IMAGING_REPORT_STATUS_TONE: Record<string, BadgeTone> = {
  verified: 'success',
  reported: 'warning',
};

export function imagingStudyBadgeClass(status: string): string {
  return TONE_CLASS[IMAGING_STUDY_STATUS_TONE[status] ?? 'neutral'];
}

export function imagingReportBadgeClass(status: string): string {
  return TONE_CLASS[IMAGING_REPORT_STATUS_TONE[status] ?? 'neutral'];
}

const ENCOUNTER_STATUS_TONE: Record<string, BadgeTone> = {
  waiting: 'info',
  in_progress: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

export function encounterStatusBadgeClass(status: string): string {
  return TONE_CLASS[ENCOUNTER_STATUS_TONE[status] ?? ENCOUNTER_STATUS_TONE.waiting];
}

const APPOINTMENT_STATUS_TONE: Record<string, BadgeTone> = {
  booked: 'info',
  checked_in: 'success',
  cancelled: 'danger',
  no_show: 'neutral',
};

export function appointmentStatusBadgeClass(status: string): string {
  return TONE_CLASS[APPOINTMENT_STATUS_TONE[status] ?? APPOINTMENT_STATUS_TONE.booked];
}

const ADMISSION_STATUS_TONE: Record<string, BadgeTone> = {
  active: 'success',
  discharged: 'neutral',
};

export function admissionStatusBadgeClass(status: string): string {
  return TONE_CLASS[ADMISSION_STATUS_TONE[status] ?? ADMISSION_STATUS_TONE.discharged];
}

const PORTAL_APPOINTMENT_STATUS_CLASS: Record<string, string> = {
  booked: 'rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-semibold text-[#0d9488] hover:bg-[#0d9488]/10',
  checked_in: 'rounded-full bg-[#198754]/10 px-2.5 py-1 text-xs font-semibold text-[#198754] hover:bg-[#198754]/10',
  cancelled: 'rounded-full bg-[#dc3545]/10 px-2.5 py-1 text-xs font-semibold text-[#dc3545] hover:bg-[#dc3545]/10',
  no_show: 'rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10',
};

export function portalAppointmentStatusBadgeClass(status: string): string {
  return PORTAL_APPOINTMENT_STATUS_CLASS[status] ?? PORTAL_APPOINTMENT_STATUS_CLASS.booked;
}
