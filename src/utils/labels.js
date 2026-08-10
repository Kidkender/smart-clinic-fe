const APPOINTMENT_STATUS = {
  booked: 'Đã đặt',
  checked_in: 'Đã check-in',
  cancelled: 'Đã hủy',
  no_show: 'Không đến',
};

const APPOINTMENT_TYPE = {
  new: 'Khám mới',
  follow_up: 'Tái khám',
  service: 'Dịch vụ',
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
  service: 'Dịch vụ',
  inpatient: 'Nội trú',
};

const BED_STATUS = {
  available: 'Trống',
  occupied: 'Có người',
  cleaning: 'Đang vệ sinh',
};

const ROOM_TYPE = {
  consultation: 'Phòng khám',
  treatment: 'Phòng điều trị',
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
  surgery: 'Phẫu thuật',
};

const SURGERY_CLASSIFICATION = {
  dac_biet: 'Đặc biệt',
  loai_1: 'Loại I',
  loai_2: 'Loại II',
  loai_3: 'Loại III',
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

const IMAGING_MODALITY = {
  imaging: 'Chẩn đoán hình ảnh',
  xray: 'X-quang',
  ct: 'Chụp CT',
  mri: 'Chụp MRI',
  ultrasound: 'Siêu âm',
  endoscopy: 'Nội soi',
};

const IMAGING_STUDY_STATUS = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang thực hiện',
  completed: 'Đã chụp xong',
  cancelled: 'Đã hủy',
};

const IMAGING_REPORT_STATUS = {
  pending: 'Chưa có báo cáo',
  reported: 'Đã có báo cáo',
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
  radiology_tech: 'Kỹ thuật viên CĐHA',
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
  partially_paid: 'Thanh toán một phần',
  paid: 'Đã thanh toán',
  cancelled: 'Đã hủy',
};

const PAYER_TYPE = {
  individual: 'Cá nhân bảo lãnh',
  insurance_company: 'Bảo hiểm bảo lãnh',
  government: 'BHYT',
};

const ALLOCATION_STATUS = {
  pending: 'Chờ xử lý',
  approved: 'Đã duyệt',
  settled: 'Đã thanh toán',
  rejected: 'Từ chối',
};

const CLAIM_STATUS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

const INVOICE_ITEM_CATEGORY = {
  visit_fee: 'Phí khám',
  service_fee: 'Dịch vụ cận lâm sàng',
  drug_fee: 'Tiền thuốc',
  bed_fee: 'Tiền giường bệnh',
  supply_fee: 'Vật tư y tế',
};

const PAYMENT_METHOD = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  qr: 'Quét mã QR',
  vnpay: 'VNPay',
};

const STOCK_TRANSACTION_TYPE = {
  purchase: 'Nhập kho',
  transfer_in: 'Chuyển kho vào',
  transfer_out: 'Chuyển kho ra',
  adjustment: 'Điều chỉnh kiểm kê',
};

const STOCK_AUDIT_STATUS = {
  draft: 'Đang kiểm kê',
  completed: 'Đã hoàn tất',
};

const SUPPLY_STOCK_TRANSACTION_TYPE = {
  purchase: 'Nhập kho',
  transfer_out: 'Chuyển kho ra',
  adjustment: 'Điều chỉnh kiểm kê',
  usage: 'Sử dụng cho bệnh nhân',
};

const EMAIL_EVENT_TYPE = {
  'appointment.reminder.24h': 'Nhắc lịch khám (24h)',
  'appointment.reminder.2h': 'Nhắc lịch khám (2h)',
  'medication.instructions': 'Hướng dẫn sử dụng thuốc',
  'satisfaction.survey': 'Khảo sát hài lòng',
};

const EMAIL_STATUS = {
  pending: 'Chờ gửi',
  queued: 'Đã lên hàng đợi',
  sent: 'Đã gửi',
  failed: 'Gửi lỗi',
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

const AUDIT_ACTION = {
  admit: 'Nhập viện',
  discharge: 'Xuất viện',
  update_fee_setting: 'Cập nhật cấu hình phí',
  add_policy: 'Thêm hợp đồng bảo hiểm',
  check_eligibility: 'Kiểm tra hưởng BHYT',
  update_status: 'Cập nhật trạng thái',
  update_insurance: 'Cập nhật thông tin bảo hiểm',
  create_order: 'Tạo chỉ định',
  schedule: 'Lên lịch',
  start: 'Bắt đầu',
  complete: 'Hoàn tất',
  cancel: 'Hủy',
  schedule_study: 'Lên lịch chụp',
  perform_study: 'Thực hiện chụp',
  submit_report: 'Nộp báo cáo kết quả',
  verify_report: 'Duyệt báo cáo kết quả',
  stock_in: 'Nhập kho',
  create: 'Tạo mới',
  finalize: 'Hoàn tất kiểm kê',
  collect_specimen: 'Lấy mẫu',
  receive_specimen: 'Nhận mẫu',
  submit_results: 'Nộp kết quả',
  verify_results: 'Duyệt kết quả',
  record_usage: 'Ghi nhận sử dụng',
  flag: 'Đánh dấu cảnh báo',
  resolve_flag: 'Xử lý cảnh báo',
  confirm_ready: 'Xác nhận đủ thuốc',
  return: 'Hoàn trả',
  manual_create_attendance: 'Ghi chấm công thủ công',
  update_attendance: 'Cập nhật chấm công',
  review_leave: 'Duyệt nghỉ phép',
  record_payment: 'Ghi nhận thanh toán',
  record_refund: 'Ghi nhận hoàn tiền',
  split_invoice: 'Phân bổ hóa đơn',
  update_allocation_status: 'Cập nhật trạng thái phân bổ',
  submit_claim: 'Gửi hồ sơ claim',
  record_claim_response: 'Ghi nhận phản hồi claim',
};

const AUDIT_ENTITY = {
  admission: 'Đợt nhập viện',
  fee_setting: 'Cấu hình phí',
  patient_insurance_policy: 'Hợp đồng bảo hiểm',
  encounter_eligibility_check: 'Kiểm tra hưởng BHYT',
  encounter: 'Lượt khám',
  surgery: 'Ca phẫu thuật',
  order: 'Chỉ định CLS',
  drug_batch: 'Lô thuốc',
  stock_audit: 'Kiểm kê kho thuốc',
  medical_supply_batch: 'Lô vật tư y tế',
  supply_usage: 'Sử dụng vật tư',
  supply_stock_audit: 'Kiểm kê kho vật tư',
  prescription_item: 'Dòng thuốc trong đơn',
  prescription: 'Đơn thuốc',
  attendance_record: 'Bản ghi chấm công',
  doctor_leave: 'Đơn nghỉ phép',
  invoice: 'Hóa đơn',
  invoice_allocation: 'Phân bổ hóa đơn',
  insurance_claim: 'Hồ sơ claim bảo hiểm',
};

export const auditActionLabel = value => translate(AUDIT_ACTION, value);
export const auditEntityLabel = value => translate(AUDIT_ENTITY, value);
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION);
export const AUDIT_ENTITIES = Object.keys(AUDIT_ENTITY);

import { toneBadgeClass } from './badgeStyles';

const LAB_RESULT_FLAG_BADGE_TONE = {
  normal: 'success',
  low: 'warning',
  high: 'warning',
  abnormal: 'danger',
};

export const labResultFlagBadgeClass = flag => toneBadgeClass(LAB_RESULT_FLAG_BADGE_TONE[flag] ?? 'neutral');

const STOCK_AUDIT_STATUS_BADGE_TONE = {
  draft: 'warning',
  completed: 'success',
};

export const stockAuditStatusBadgeClass = status => toneBadgeClass(STOCK_AUDIT_STATUS_BADGE_TONE[status] ?? 'neutral');

const EMAIL_STATUS_BADGE_TONE = {
  pending: 'neutral',
  queued: 'info',
  sent: 'success',
  failed: 'danger',
};

export const emailStatusBadgeClass = status => toneBadgeClass(EMAIL_STATUS_BADGE_TONE[status] ?? 'neutral');

const STOCK_TRANSACTION_TYPE_BADGE_TONE = {
  purchase: 'success',
  transfer_in: 'success',
  transfer_out: 'warning',
  adjustment: 'info',
};

export const stockTransactionTypeBadgeClass = type => toneBadgeClass(STOCK_TRANSACTION_TYPE_BADGE_TONE[type] ?? 'neutral');

const SUPPLY_STOCK_TRANSACTION_TYPE_BADGE_TONE = {
  purchase: 'success',
  transfer_out: 'warning',
  adjustment: 'info',
  usage: 'warning',
};

export const supplyStockTransactionTypeBadgeClass = type => toneBadgeClass(SUPPLY_STOCK_TRANSACTION_TYPE_BADGE_TONE[type] ?? 'neutral');

export const appointmentStatusLabel = value => translate(APPOINTMENT_STATUS, value);
export const appointmentTypeLabel = value => translate(APPOINTMENT_TYPE, value);
export const APPOINTMENT_TYPES = Object.keys(APPOINTMENT_TYPE);
export const encounterStatusLabel = value => translate(ENCOUNTER_STATUS, value);
export const encounterTypeLabel = value => translate(ENCOUNTER_TYPE, value);
export const prescriptionStatusLabel = value => translate(PRESCRIPTION_STATUS, value);
export const orderStatusLabel = value => translate(ORDER_STATUS, value);
export const orderTypeLabel = value => translate(ORDER_TYPE, value);
export const surgeryClassificationLabel = value => translate(SURGERY_CLASSIFICATION, value);
export const SURGERY_CLASSIFICATIONS = Object.keys(SURGERY_CLASSIFICATION);
export const labTestCategoryLabel = value => translate(LAB_TEST_CATEGORY, value);
export const labSpecimenStatusLabel = value => translate(LAB_SPECIMEN_STATUS, value);
export const labResultFlagLabel = value => translate(LAB_RESULT_FLAG, value);
export const labResultStatusLabel = value => translate(LAB_RESULT_STATUS, value);
export const LAB_TEST_CATEGORIES = Object.keys(LAB_TEST_CATEGORY);
export const imagingModalityLabel = value => translate(IMAGING_MODALITY, value);
export const IMAGING_MODALITIES = Object.keys(IMAGING_MODALITY);
export const imagingStudyStatusLabel = value => translate(IMAGING_STUDY_STATUS, value);
export const imagingReportStatusLabel = value => translate(IMAGING_REPORT_STATUS, value);
export const interactionSeverityLabel = value => translate(INTERACTION_SEVERITY, value);
export const bedStatusLabel = value => translate(BED_STATUS, value);
export const roomTypeLabel = value => translate(ROOM_TYPE, value);
export const ROOM_TYPES = Object.keys(ROOM_TYPE);
export const admissionTypeLabel = value => translate(ADMISSION_TYPE, value);
export const genderLabel = value => translate(GENDER, value);
export const roleLabel = value => translate(ROLE, value);
export const ROLES = Object.keys(ROLE);
export const shiftTypeLabel = value => translate(SHIFT_TYPE, value);
export const leaveStatusLabel = value => translate(LEAVE_STATUS, value);
export const userStatusLabel = value => translate(USER_STATUS, value);
export const invoiceStatusLabel = value => translate(INVOICE_STATUS, value);
export const invoiceItemCategoryLabel = value => translate(INVOICE_ITEM_CATEGORY, value);
export const paymentMethodLabel = value => translate(PAYMENT_METHOD, value);
export const payerTypeLabel = value => translate(PAYER_TYPE, value);
export const PAYER_TYPES = Object.keys(PAYER_TYPE);
export const allocationStatusLabel = value => translate(ALLOCATION_STATUS, value);
export const claimStatusLabel = value => translate(CLAIM_STATUS, value);
export const attachmentCategoryLabel = value => translate(ATTACHMENT_CATEGORY, value);
export const ATTACHMENT_CATEGORIES = Object.keys(ATTACHMENT_CATEGORY);
export const stockTransactionTypeLabel = value => translate(STOCK_TRANSACTION_TYPE, value);
export const STOCK_TRANSACTION_TYPES = Object.keys(STOCK_TRANSACTION_TYPE);
export const stockAuditStatusLabel = value => translate(STOCK_AUDIT_STATUS, value);
export const supplyStockTransactionTypeLabel = value => translate(SUPPLY_STOCK_TRANSACTION_TYPE, value);
export const SUPPLY_STOCK_TRANSACTION_TYPES = Object.keys(SUPPLY_STOCK_TRANSACTION_TYPE);

export function supplyStockTransactionReferenceLabel(reference) {
  if (!reference) return null;
  const usageMatch = /^supply_usage:(\d+)$/.exec(reference);
  if (usageMatch) return `Sử dụng cho bệnh nhân (bản ghi #${usageMatch[1]})`;
  const auditMatch = /^supply_stock_audit:(\d+)$/.exec(reference);
  if (auditMatch) return `Điều chỉnh theo kiểm kê kho #${auditMatch[1]}`;
  return reference;
}

export function stockTransactionReferenceLabel(reference) {
  if (!reference) return null;
  const auditMatch = /^stock_audit:(\d+)$/.exec(reference);
  if (auditMatch) return `Điều chỉnh theo kiểm kê kho #${auditMatch[1]}`;
  return reference;
}

export const emailEventTypeLabel = value => translate(EMAIL_EVENT_TYPE, value);
export const emailStatusLabel = value => translate(EMAIL_STATUS, value);

const ATTENDANCE_STATUS = {
  present: 'Đúng giờ',
  late: 'Trễ',
  absent: 'Vắng',
};

export const attendanceStatusLabel = value => translate(ATTENDANCE_STATUS, value);
