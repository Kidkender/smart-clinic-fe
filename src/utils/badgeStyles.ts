type BadgeTone = 'neutral' | 'info' | 'warning' | 'success';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'rounded-full bg-[#6c757d]/10 px-2.5 py-1 text-xs font-semibold text-[#6c757d] hover:bg-[#6c757d]/10',
  info: 'rounded-full bg-[#307bc4]/10 px-2.5 py-1 text-xs font-semibold text-[#307bc4] hover:bg-[#307bc4]/10',
  warning: 'rounded-full bg-[#ffc107]/15 px-2.5 py-1 text-xs font-semibold text-[#8a6100] hover:bg-[#ffc107]/15',
  success: 'rounded-full bg-[#28a745]/10 px-2.5 py-1 text-xs font-semibold text-[#28a745] hover:bg-[#28a745]/10',
};

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
