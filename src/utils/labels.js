const APPOINTMENT_STATUS = {
  booked: 'Đã đặt',
  checked_in: 'Đã check-in',
  cancelled: 'Đã hủy',
  no_show: 'Không đến',
};

const ENCOUNTER_STATUS = {
  waiting: 'Đang chờ',
  in_progress: 'Đang khám',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const ENCOUNTER_TYPE = {
  new: 'Khám mới',
  follow_up: 'Tái khám',
  insurance: 'BHYT',
  service: 'Dịch vụ',
  inpatient: 'Nội trú',
};

const BED_STATUS = {
  available: 'Trống',
  occupied: 'Có người',
  cleaning: 'Đang vệ sinh',
};

const ADMISSION_TYPE = {
  bhyt: 'BHYT',
  service: 'Dịch vụ',
  insurance_private: 'Bảo hiểm tư nhân',
};

const PRESCRIPTION_STATUS = {
  active: 'Đang hiệu lực',
  dispensed: 'Đã cấp phát',
  cancelled: 'Đã hủy',
};

const ORDER_STATUS = {
  pending: 'Chờ thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const ORDER_TYPE = {
  lab: 'Xét nghiệm',
  imaging: 'Chẩn đoán hình ảnh',
  xray: 'X-quang',
  ct: 'Chụp CT',
  mri: 'Chụp MRI',
  ultrasound: 'Siêu âm',
  endoscopy: 'Nội soi',
};

const LAB_TEST_CATEGORY = {
  hematology: 'Huyết học',
  biochemistry: 'Sinh hóa',
  immunology: 'Miễn dịch',
  microbiology: 'Vi sinh',
  other: 'Khác',
};

const LAB_SPECIMEN_STATUS = {
  pending_collection: 'Chờ lấy mẫu',
  collected: 'Đã lấy mẫu',
  received: 'Đã nhận mẫu',
  verified: 'Đã duyệt',
  cancelled: 'Đã hủy',
};

const LAB_RESULT_FLAG = {
  pending: 'Chưa có kết quả',
  normal: 'Bình thường',
  low: 'Thấp',
  high: 'Cao',
  abnormal: 'Bất thường',
};

const LAB_RESULT_STATUS = {
  pending: 'Chờ thực hiện',
  resulted: 'Đã có kết quả',
  verified: 'Đã duyệt',
};

const INTERACTION_SEVERITY = {
  minor: 'Nhẹ',
  moderate: 'Trung bình',
  severe: 'Nghiêm trọng',
};

const GENDER = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
};

const ROLE = {
  admin: 'Quản trị viên',
  doctor: 'Bác sĩ',
  nurse: 'Điều dưỡng',
  receptionist: 'Lễ tân',
  pharmacist: 'Dược sĩ',
  cashier: 'Thu ngân',
  lab_tech: 'Kỹ thuật viên XN',
};

const SHIFT_TYPE = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  night: 'Ca đêm',
  on_call: 'Trực gác',
};

const LEAVE_STATUS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy',
};

const USER_STATUS = {
  active: 'Đang hoạt động',
  pending: 'Chờ duyệt',
  locked: 'Đã khóa',
};

const INVOICE_STATUS = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

const ATTACHMENT_CATEGORY = {
  document: 'Giấy tờ',
  xray: 'X-quang',
  ct: 'CT',
  mri: 'MRI',
  ultrasound: 'Siêu âm',
  lab_result: 'Kết quả xét nghiệm',
  other: 'Khác',
};

function translate(map, value) {
  if (!value) return '—';
  return map[value] ?? value;
}

export const appointmentStatusLabel = value => translate(APPOINTMENT_STATUS, value);
export const encounterStatusLabel = value => translate(ENCOUNTER_STATUS, value);
export const encounterTypeLabel = value => translate(ENCOUNTER_TYPE, value);
export const prescriptionStatusLabel = value => translate(PRESCRIPTION_STATUS, value);
export const orderStatusLabel = value => translate(ORDER_STATUS, value);
export const orderTypeLabel = value => translate(ORDER_TYPE, value);
export const labTestCategoryLabel = value => translate(LAB_TEST_CATEGORY, value);
export const labSpecimenStatusLabel = value => translate(LAB_SPECIMEN_STATUS, value);
export const labResultFlagLabel = value => translate(LAB_RESULT_FLAG, value);
export const labResultStatusLabel = value => translate(LAB_RESULT_STATUS, value);
export const LAB_TEST_CATEGORIES = Object.keys(LAB_TEST_CATEGORY);
export const interactionSeverityLabel = value => translate(INTERACTION_SEVERITY, value);
export const bedStatusLabel = value => translate(BED_STATUS, value);
export const admissionTypeLabel = value => translate(ADMISSION_TYPE, value);
export const genderLabel = value => translate(GENDER, value);
export const roleLabel = value => translate(ROLE, value);
export const shiftTypeLabel = value => translate(SHIFT_TYPE, value);
export const leaveStatusLabel = value => translate(LEAVE_STATUS, value);
export const userStatusLabel = value => translate(USER_STATUS, value);
export const invoiceStatusLabel = value => translate(INVOICE_STATUS, value);
export const attachmentCategoryLabel = value => translate(ATTACHMENT_CATEGORY, value);
export const ATTACHMENT_CATEGORIES = Object.keys(ATTACHMENT_CATEGORY);
