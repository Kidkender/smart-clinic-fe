const ERROR_MESSAGES = {
  'error.auth.invalid_credentials': 'Sai email hoặc mật khẩu.',
  'error.auth.invalid_token': 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  'error.auth.missing_token': 'Vui lòng đăng nhập để tiếp tục.',

  'error.user.already_exists': 'Email này đã được đăng ký.',
  'error.user.not_found': 'Không tìm thấy người dùng.',
  'error.user.inactive': 'Tài khoản đã bị vô hiệu hóa.',

  'error.department.not_found': 'Không tìm thấy khoa/phòng.',
  'error.department.already_exists': 'Khoa/phòng này đã tồn tại.',

  'error.patient.not_found': 'Không tìm thấy bệnh nhân.',
  'error.patient_contact.not_found': 'Không tìm thấy người liên hệ.',
  'error.patient_attachment.not_found': 'Không tìm thấy tệp đính kèm.',

  'error.encounter.not_found': 'Không tìm thấy lượt khám.',
  'error.encounter.invalid_status': 'Trạng thái lượt khám không hợp lệ.',
  'error.encounter.queue_empty': 'Hàng đợi hiện đang trống.',

  'error.appointment.not_found': 'Không tìm thấy lịch hẹn.',
  'error.appointment.invalid_status': 'Trạng thái lịch hẹn không hợp lệ.',
  'error.appointment.in_past': 'Không thể đặt lịch hẹn trong quá khứ.',

  'error.order.not_found': 'Không tìm thấy chỉ định.',
  'error.drug.not_found': 'Không tìm thấy thuốc.',
  'error.prescription.not_found': 'Không tìm thấy đơn thuốc.',
  'error.invoice.not_found': 'Không tìm thấy hóa đơn.',
  'error.invoice.already_paid': 'Hóa đơn đã được thanh toán.',

  'error.unauthorized': 'Bạn không có quyền thực hiện thao tác này.',
  'error.forbidden': 'Truy cập bị từ chối.',
  'error.internal_server_error': 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.',
  'error.validation': 'Dữ liệu nhập không hợp lệ.',
};

export function resolveError(err, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (typeof err === 'string') {
    return ERROR_MESSAGES[err] ?? err;
  }

  const code = err?.response?.data?.error || err?.message || null;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code && typeof code === 'string' && !code.startsWith('error.')) return code;
  return fallback;
}
