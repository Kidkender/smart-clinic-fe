export interface PrescriptionLabelItem {
  drug_name: string;
  strength?: string;
  dosage?: string;
  quantity: number;
  instructions?: string;
}

export interface PrescriptionLabelData {
  prescription_code: string;
  prescribed_at: string;
  doctor_name?: string;
  department_name?: string;
  patient_name: string;
  patient_mrn: string;
  patient_gender?: string;
  patient_age?: number | null;
  diagnosis?: string;
  items: PrescriptionLabelItem[];
  total_amount: number;
  payment_status: string;
}

const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: 'Đã thanh toán',
  unpaid: 'Chưa thanh toán',
  cancelled: 'Hóa đơn đã hủy',
  no_invoice: 'Chưa lập hóa đơn',
};

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  opts?: { className?: string; text?: string },
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (opts?.className) node.className = opts.className;
  if (opts?.text !== undefined) node.textContent = opts.text;
  return node;
}

function section(doc: Document, sheet: HTMLElement, title: string): HTMLElement {
  sheet.appendChild(el(doc, 'div', { className: 'divider' }));
  sheet.appendChild(el(doc, 'div', { className: 'section-title', text: title }));
  const body = el(doc, 'div', { className: 'section-body' });
  sheet.appendChild(body);
  return body;
}

function formatCurrency(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN');
}

// Builds the print window via DOM APIs (textContent only) rather than an HTML
// string, so label data never passes through an unescaped-injection path.
export function printPrescriptionLabel(label: PrescriptionLabelData) {
  const win = window.open('', '_blank', 'width=460,height=720');
  if (!win) return;
  const doc = win.document;
  doc.title = `Đơn thuốc ${label.prescription_code}`;

  const style = doc.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0 0 24px;
      background: #eef2f6;
      color: #1f2d3a;
    }
    .toolbar { display: flex; justify-content: flex-end; padding: 12px 20px; }
    .toolbar button {
      cursor: pointer;
      border: none;
      border-radius: 999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      background: #307bc4;
      color: #fff;
    }
    .sheet {
      max-width: 400px;
      margin: 0 auto;
      background: #fff;
      border-radius: 14px;
      padding: 24px 26px 20px;
    }
    .brand { text-align: center; font-size: 15px; font-weight: 800; letter-spacing: 0.06em; margin: 0; }
    .title { text-align: center; font-size: 20px; font-weight: 800; margin: 4px 0 0; letter-spacing: 0.02em; }
    .divider { border-top: 1px dashed #c3cbd4; margin: 16px 0; }
    .section-title { font-size: 11px; font-weight: 800; color: #6c757d; letter-spacing: 0.08em; margin-bottom: 8px; }
    .section-body { font-size: 13px; line-height: 1.6; color: #274760; }
    .kv { display: flex; justify-content: space-between; gap: 12px; }
    .kv span:first-child { color: #6c757d; }
    .kv span:last-child { font-weight: 600; text-align: right; }
    .patient-name { font-size: 15px; font-weight: 800; color: #1f2d3a; margin-bottom: 2px; }
    .item { margin-bottom: 14px; page-break-inside: avoid; }
    .item:last-child { margin-bottom: 0; }
    .item-head { display: flex; align-items: baseline; gap: 6px; }
    .item-index { font-weight: 800; color: #307bc4; }
    .item-name { font-weight: 800; font-size: 14px; }
    .item-strength { font-size: 12px; color: #6c757d; margin: 0 0 6px 20px; }
    .item-rows { margin-left: 20px; }
    .item-rows .kv { font-size: 12px; padding: 1px 0; }
    .total-row { display: flex; justify-content: space-between; align-items: baseline; }
    .total-row .amount { font-size: 18px; font-weight: 800; color: #1f2d3a; }
    .payment-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .payment-badge.paid { background: #e6f4ea; color: #1e7e34; }
    .payment-badge.unpaid { background: #fdecea; color: #c0392b; }
    .payment-badge.other { background: #f0f0f0; color: #6c757d; }
    .signature { text-align: center; margin-top: 4px; }
    .signature .role { font-size: 11px; color: #6c757d; margin-bottom: 40px; }
    .signature .name { font-size: 13px; font-weight: 700; }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none; }
      .sheet { border-radius: 0; max-width: none; padding: 16px 4px; }
    }
  `;
  doc.head.appendChild(style);

  const toolbar = el(doc, 'div', { className: 'toolbar' });
  const printBtn = el(doc, 'button', { text: 'In đơn thuốc' });
  printBtn.addEventListener('click', () => win.print());
  toolbar.appendChild(printBtn);
  doc.body.appendChild(toolbar);

  const sheet = el(doc, 'div', { className: 'sheet' });
  sheet.appendChild(el(doc, 'p', { className: 'brand', text: 'SMARTCLINIC' }));
  sheet.appendChild(el(doc, 'p', { className: 'title', text: 'ĐƠN THUỐC' }));

  const info = section(doc, sheet, 'THÔNG TIN ĐƠN');
  const infoRows: [string, string][] = [
    ['Đơn số', label.prescription_code],
    ['Ngày kê', formatDate(label.prescribed_at)],
  ];
  if (label.doctor_name) infoRows.push(['Bác sĩ', label.doctor_name]);
  if (label.department_name) infoRows.push(['Khoa', label.department_name]);
  for (const [k, v] of infoRows) {
    const row = el(doc, 'div', { className: 'kv' });
    row.appendChild(el(doc, 'span', { text: k }));
    row.appendChild(el(doc, 'span', { text: v }));
    info.appendChild(row);
  }

  const patient = section(doc, sheet, 'BỆNH NHÂN');
  patient.appendChild(el(doc, 'div', { className: 'patient-name', text: label.patient_name }));
  const patientMeta: string[] = [label.patient_mrn];
  const genderAge: string[] = [];
  if (label.patient_gender) genderAge.push(GENDER_LABEL[label.patient_gender] ?? label.patient_gender);
  if (label.patient_age != null) genderAge.push(`${label.patient_age} tuổi`);
  if (genderAge.length > 0) patientMeta.push(genderAge.join(' • '));
  patient.appendChild(el(doc, 'div', { text: patientMeta.join(' · ') }));

  if (label.diagnosis) {
    const dx = section(doc, sheet, 'CHẨN ĐOÁN');
    dx.appendChild(el(doc, 'div', { text: label.diagnosis }));
  }

  const drugs = section(doc, sheet, 'THUỐC');
  label.items.forEach((item, i) => {
    const box = el(doc, 'div', { className: 'item' });
    const head = el(doc, 'div', { className: 'item-head' });
    head.appendChild(el(doc, 'span', { className: 'item-index', text: `${i + 1}.` }));
    head.appendChild(el(doc, 'span', { className: 'item-name', text: item.drug_name }));
    box.appendChild(head);
    if (item.strength) {
      box.appendChild(el(doc, 'div', { className: 'item-strength', text: item.strength }));
    }
    const rows = el(doc, 'div', { className: 'item-rows' });
    const qtyRow = el(doc, 'div', { className: 'kv' });
    qtyRow.appendChild(el(doc, 'span', { text: 'Số lượng' }));
    qtyRow.appendChild(el(doc, 'span', { text: String(item.quantity) }));
    rows.appendChild(qtyRow);
    if (item.dosage) {
      const dosageRow = el(doc, 'div', { className: 'kv' });
      dosageRow.appendChild(el(doc, 'span', { text: 'Liều dùng' }));
      dosageRow.appendChild(el(doc, 'span', { text: item.dosage }));
      rows.appendChild(dosageRow);
    }
    if (item.instructions) {
      const insRow = el(doc, 'div', { className: 'kv' });
      insRow.appendChild(el(doc, 'span', { text: 'Hướng dẫn' }));
      insRow.appendChild(el(doc, 'span', { text: item.instructions }));
      rows.appendChild(insRow);
    }
    box.appendChild(rows);
    drugs.appendChild(box);
  });

  const totalSection = section(doc, sheet, 'THANH TOÁN');
  const totalRow = el(doc, 'div', { className: 'total-row' });
  totalRow.appendChild(el(doc, 'span', { text: 'Tổng tiền' }));
  totalRow.appendChild(el(doc, 'span', { className: 'amount', text: formatCurrency(label.total_amount) }));
  totalSection.appendChild(totalRow);
  const badgeClass = label.payment_status === 'paid' ? 'paid' : label.payment_status === 'unpaid' ? 'unpaid' : 'other';
  totalSection.appendChild(el(doc, 'span', {
    className: `payment-badge ${badgeClass}`,
    text: PAYMENT_STATUS_LABEL[label.payment_status] ?? label.payment_status,
  }));

  if (label.doctor_name) {
    sheet.appendChild(el(doc, 'div', { className: 'divider' }));
    const sig = el(doc, 'div', { className: 'signature' });
    sig.appendChild(el(doc, 'div', { className: 'role', text: '(Ký điện tử)' }));
    sig.appendChild(el(doc, 'div', { className: 'name', text: label.doctor_name }));
    sheet.appendChild(sig);
  }

  doc.body.appendChild(sheet);

  win.focus();
  win.print();
}
