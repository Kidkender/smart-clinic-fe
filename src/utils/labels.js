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
export const genderLabel = value => translate(GENDER, value);
export const roleLabel = value => translate(ROLE, value);
