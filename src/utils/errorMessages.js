const ERROR_MESSAGES = {
  'error.auth.invalid_credentials': 'Sai email hoặc mật khẩu.',
  'error.auth.invalid_token': 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  'error.auth.missing_token': 'Vui lòng đăng nhập để tiếp tục.',
  'error.auth.invalid_refresh_token': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'error.auth.invalid_reset_token': 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  'error.rate_limit.exceeded': 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',

  'error.user.already_exists': 'Email này đã được đăng ký.',
  'error.user.not_found': 'Không tìm thấy người dùng.',
  'error.user.pending_approval': 'Tài khoản đang chờ quản trị viên duyệt.',
  'error.user.locked': 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',

  'error.department.not_found': 'Không tìm thấy khoa/phòng.',
  'error.department.already_exists': 'Khoa/phòng này đã tồn tại.',

  'error.patient.not_found': 'Không tìm thấy bệnh nhân.',
  'error.patient.invalid_date_of_birth': 'Ngày sinh không được ở tương lai.',
  'error.patient_contact.not_found': 'Không tìm thấy người liên hệ.',
  'error.patient_attachment.not_found': 'Không tìm thấy tệp đính kèm.',
  'error.patient_attachment.invalid_category': 'Loại tệp đính kèm không hợp lệ.',
  'error.icd10.not_found': 'Không tìm thấy mã ICD-10 phù hợp. Vui lòng chọn từ danh sách gợi ý.',

  'error.encounter.not_found': 'Không tìm thấy lượt khám.',
  'error.encounter.invalid_status': 'Trạng thái lượt khám không hợp lệ.',
  'error.encounter.queue_empty': 'Hàng đợi hiện đang trống.',

  'error.appointment.not_found': 'Không tìm thấy lịch hẹn.',
  'error.appointment.invalid_status': 'Trạng thái lịch hẹn không hợp lệ.',
  'error.appointment.in_past': 'Không thể đặt lịch hẹn trong quá khứ.',
  'error.appointment.duplicate': 'Bạn đã có lịch hẹn khác vào đúng thời điểm này.',

  'error.order.not_found': 'Không tìm thấy chỉ định.',
  'error.order.invalid_transition': 'Không thể chuyển sang trạng thái này.',
  'error.lab_test.not_found': 'Không tìm thấy xét nghiệm trong danh mục.',
  'error.lab_test.code_already_exists': 'Mã xét nghiệm này đã tồn tại.',
  'error.lab_test.inactive': 'Xét nghiệm này hiện đã ngừng sử dụng.',
  'error.lab_specimen.not_found': 'Chưa ghi nhận mẫu bệnh phẩm cho chỉ định này.',
  'error.lab_result.not_found': 'Không tìm thấy hạng mục xét nghiệm.',
  'error.lab.invalid_transition': 'Không thể thực hiện thao tác ở bước hiện tại của quy trình xét nghiệm.',
  'error.lab.results_incomplete': 'Cần nhập đầy đủ kết quả cho tất cả hạng mục trước khi duyệt.',
  'error.lab.order_type_mismatch': 'Chỉ định này không phải là chỉ định xét nghiệm.',
  'error.drug.not_found': 'Không tìm thấy thuốc.',
  'error.drug_interaction.already_exists': 'Cặp thuốc này đã có cảnh báo tương tác.',
  'error.drug_interaction.same_drug': 'Không thể tạo tương tác giữa một thuốc với chính nó.',
  'error.prescription.not_found': 'Không tìm thấy đơn thuốc.',
  'error.prescription.empty': 'Đơn thuốc cần ít nhất một loại thuốc.',
  'error.prescription.invalid_status': 'Không thể chuyển sang trạng thái này.',

  'error.ward.not_found': 'Không tìm thấy khu điều trị.',
  'error.ward.already_exists': 'Khu điều trị này đã tồn tại trong khoa.',
  'error.ward.has_beds': 'Khu điều trị vẫn còn giường. Vui lòng xóa hết giường trước.',
  'error.bed.not_found': 'Không tìm thấy giường.',
  'error.bed.already_exists': 'Số giường này đã tồn tại trong khu điều trị.',
  'error.bed.not_available': 'Giường không còn trống.',
  'error.bed.in_use': 'Giường đang được sử dụng hoặc đang vệ sinh, không thể xóa.',
  'error.admission.not_found': 'Không tìm thấy đợt nhập viện.',
  'error.admission.already_discharged': 'Đợt nhập viện này đã xuất viện.',
  'error.admission.already_active': 'Bệnh nhân này đang có một đợt nhập viện chưa xuất viện.',
  'error.progress_note.not_found': 'Không tìm thấy diễn biến bệnh.',
  'error.nursing_log.not_found': 'Không tìm thấy nhật ký điều dưỡng.',
  'error.invoice.not_found': 'Không tìm thấy hóa đơn.',
  'error.invoice.already_paid': 'Hóa đơn đã được thanh toán.',

  'error.doctor_profile.not_found': 'Không tìm thấy bác sĩ.',
  'error.doctor.role_mismatch': 'Người dùng này không phải là bác sĩ.',
  'error.doctor_schedule.invalid_range': 'Giờ kết thúc phải sau giờ bắt đầu.',
  'error.doctor_schedule.overlap': 'Bác sĩ đã có lịch làm việc trùng khung giờ này trong ngày.',
  'error.doctor_shift.conflict': 'Bác sĩ đã có ca trực này.',
  'error.doctor_shift.not_found': 'Không tìm thấy ca trực.',
  'error.doctor_leave.not_found': 'Không tìm thấy đơn nghỉ phép.',
  'error.doctor_leave.invalid_range': 'Ngày kết thúc phải sau ngày bắt đầu.',
  'error.doctor_leave.already_reviewed': 'Đơn nghỉ phép này đã được xử lý.',
  'error.doctor_leave.overlap': 'Đã có đơn nghỉ phép (chờ duyệt hoặc đã duyệt) trùng khoảng thời gian này.',

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
