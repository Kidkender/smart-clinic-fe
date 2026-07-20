// Vietnamese mobile number: optional +84/0 prefix, valid carrier lead digit, 9 digits total.
const PHONE_REGEX = /^(\+84|0)(3|5|7|8|9)\d{8}$/;
// Letters (including Vietnamese diacritics) and spaces only.
const FULLNAME_REGEX = /^[\p{L}][\p{L} ]*[\p{L}]$|^[\p{L}]$/u;

/**
 * @param {string} value
 * @param {{ required?: boolean }} [opts]
 * @returns {string} error message, or '' when valid
 */
export function validateFullname(value, { required = true } = {}) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return required ? 'Họ tên không được để trống.' : '';
  }
  if (trimmed.length < 2) {
    return 'Họ tên phải có ít nhất 2 ký tự.';
  }
  if (trimmed.length > 100) {
    return 'Họ tên không được vượt quá 100 ký tự.';
  }
  if (!FULLNAME_REGEX.test(trimmed)) {
    return 'Họ tên chỉ được chứa chữ cái và khoảng trắng.';
  }
  return '';
}

/**
 * @param {string} value
 * @param {{ required?: boolean }} [opts]
 * @returns {string} error message, or '' when valid
 */
export function validateFacilityName(value, { required = true } = {}) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return required ? 'Tên không được để trống.' : '';
  }
  if (trimmed.length < 2) {
    return 'Tên phải có ít nhất 2 ký tự.';
  }
  if (trimmed.length > 100) {
    return 'Tên không được vượt quá 100 ký tự.';
  }
  if (!/\p{L}/u.test(trimmed)) {
    return 'Tên phải chứa chữ cái, không thể chỉ gồm số hoặc ký tự đặc biệt.';
  }
  return '';
}

/**
 * @param {string} value
 * @param {{ required?: boolean }} [opts]
 * @returns {string} error message, or '' when valid
 */
export function validatePhone(value, { required = false } = {}) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return required ? 'Số điện thoại không được để trống.' : '';
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return 'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678).';
  }
  return '';
}
