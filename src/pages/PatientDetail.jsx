import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import {
  getPatientById, updatePatient, getPatientHistory,
  listContacts, addContact, updateContact, deleteContact,
  listAttachments, uploadAttachment, deleteAttachment,
} from '../api/patient';
import { resolveError } from '../utils/errorMessages';
import { genderLabel, encounterStatusLabel, encounterTypeLabel, prescriptionStatusLabel, orderStatusLabel, orderTypeLabel } from '../utils/labels';
import useConfirm from '../hooks/useConfirm';

const GENDERS = ['male', 'female', 'other'];

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [contactForm, setContactForm] = useState({ fullname: '', relationship: '', phone: '' });
  const [editingContactId, setEditingContactId] = useState(null);
  const [contactError, setContactError] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const fileInputRef = useRef(null);

  const [confirm, ConfirmDialog] = useConfirm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, h, c, a] = await Promise.all([
        getPatientById(id),
        getPatientHistory(id),
        listContacts(id),
        listAttachments(id),
      ]);
      setPatient(p.data);
      setHistory(h.data);
      setContacts(c.data ?? []);
      setAttachments(a.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openEdit = () => {
    setForm({
      fullname: patient.Fullname ?? '',
      gender: patient.Gender ?? 'other',
      phone: patient.Phone ?? '',
      cccd: patient.CCCD ?? '',
      address: patient.Address ?? '',
      insurance_number: patient.InsuranceNumber ?? '',
      allergies: patient.Allergies ?? '',
      date_of_birth: toDateInput(patient.DateOfBirth),
    });
    setFormError('');
    setEditOpen(true);
  };

  const handleSaveEdit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await updatePatient(id, { ...form, date_of_birth: form.date_of_birth ? `${form.date_of_birth}T00:00:00Z` : null });
      const p = await getPatientById(id);
      setPatient(p.data);
      setEditOpen(false);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const openAddContact = () => {
    setEditingContactId(null);
    setContactForm({ fullname: '', relationship: '', phone: '' });
    setContactError('');
  };

  const openEditContact = contact => {
    setEditingContactId(contact.ID);
    setContactForm({ fullname: contact.Fullname, relationship: contact.Relationship ?? '', phone: contact.Phone ?? '' });
    setContactError('');
  };

  const handleSaveContact = async e => {
    e.preventDefault();
    setContactError('');
    setSavingContact(true);
    try {
      if (editingContactId) {
        await updateContact(id, editingContactId, contactForm);
      } else {
        await addContact(id, contactForm);
      }
      const c = await listContacts(id);
      setContacts(c.data ?? []);
      setEditingContactId(null);
      setContactForm({ fullname: '', relationship: '', phone: '' });
    } catch (err) {
      setContactError(resolveError(err));
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async contact => {
    if (!(await confirm(`Xóa người liên hệ "${contact.Fullname}"?`))) return;
    try {
      await deleteContact(id, contact.ID);
      const c = await listContacts(id);
      setContacts(c.data ?? []);
    } catch (err) {
      setContactError(resolveError(err));
    }
  };

  const handleUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAttachmentError('');
    try {
      await uploadAttachment(id, file);
      const a = await listAttachments(id);
      setAttachments(a.data ?? []);
    } catch (err) {
      setAttachmentError(resolveError(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async attachment => {
    if (!(await confirm(`Xóa tệp "${attachment.FileName}"?`))) return;
    try {
      await deleteAttachment(id, attachment.ID);
      const a = await listAttachments(id);
      setAttachments(a.data ?? []);
    } catch (err) {
      setAttachmentError(resolveError(err));
    }
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>;
  }
  if (error || !patient) {
    return <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error || 'Không tìm thấy bệnh nhân.'}</div>;
  }

  return (
    <>
      <Link to="/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#307bc4', textDecoration: 'none', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
        <Icon icon="fa6-solid:arrow-left" style={{ fontSize: '12px' }} /> Danh sách bệnh nhân
      </Link>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#274760', margin: 0 }}>{patient.Fullname}</h1>
            <p style={{ color: '#6c757d', margin: '4px 0 0', fontSize: '14px' }}>MRN: {patient.MRN}</p>
          </div>
          <button onClick={openEdit} style={secondaryBtnStyle}>
            <Icon icon="fa6-solid:pen" style={{ fontSize: '12px', marginRight: '6px' }} />Sửa
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <Field label="Giới tính" value={genderLabel(patient.Gender)} />
          <Field label="Ngày sinh" value={patient.DateOfBirth ? toDateInput(patient.DateOfBirth) : '—'} />
          <Field label="SĐT" value={patient.Phone || '—'} />
          <Field label="CCCD" value={patient.CCCD || '—'} />
          <Field label="Địa chỉ" value={patient.Address || '—'} />
          <Field label="Số BHYT" value={patient.InsuranceNumber || '—'} />
          <Field label="Dị ứng" value={patient.Allergies || 'Không ghi nhận'} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Người liên hệ</h2>
          {contacts.length === 0 ? (
            <p style={{ color: '#6c757d', fontSize: '14px' }}>Chưa có người liên hệ.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
              {contacts.map(c => (
                <li key={c.ID} style={listItemStyle}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#274760' }}>{c.Fullname}</div>
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>{c.Relationship || '—'} · {c.Phone || '—'}</div>
                  </div>
                  <div>
                    <button onClick={() => openEditContact(c)} style={iconBtnStyle} title="Sửa"><Icon icon="fa6-solid:pen" style={{ fontSize: '12px' }} /></button>
                    <button onClick={() => handleDeleteContact(c)} style={{ ...iconBtnStyle, marginLeft: '6px', color: '#dc3545' }} title="Xóa"><Icon icon="fa6-solid:xmark" style={{ fontSize: '12px' }} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleSaveContact} style={{ borderTop: '1px solid #f0f4f8', paddingTop: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input required placeholder="Họ tên" value={contactForm.fullname} onChange={e => setContactForm({ ...contactForm, fullname: e.target.value })} style={smallInputStyle} />
              <input placeholder="Quan hệ" value={contactForm.relationship} onChange={e => setContactForm({ ...contactForm, relationship: e.target.value })} style={smallInputStyle} />
            </div>
            <input placeholder="SĐT" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} style={{ ...smallInputStyle, marginTop: '10px', width: '100%' }} />
            {contactError && <div style={{ ...errorBoxStyle, marginTop: '10px' }}>{contactError}</div>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button type="submit" disabled={savingContact} style={primaryBtnStyle}>
                {editingContactId ? 'Cập nhật' : 'Thêm liên hệ'}
              </button>
              {editingContactId && (
                <button type="button" onClick={openAddContact} style={secondaryBtnStyle}>Hủy sửa</button>
              )}
            </div>
          </form>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Tệp đính kèm</h2>
          {attachments.length === 0 ? (
            <p style={{ color: '#6c757d', fontSize: '14px' }}>Chưa có tệp đính kèm.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
              {attachments.map(a => (
                <li key={a.ID} style={listItemStyle}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#274760', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.FileName}</div>
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>
                      {a.ContentType || 'file'} · {a.FileSize ? `${(a.FileSize / 1024).toFixed(0)} KB` : ''}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteAttachment(a)} style={{ ...iconBtnStyle, color: '#dc3545', flexShrink: 0 }} title="Xóa"><Icon icon="fa6-solid:xmark" style={{ fontSize: '12px' }} /></button>
                </li>
              ))}
            </ul>
          )}
          {attachmentError && <div style={{ ...errorBoxStyle, marginBottom: '10px' }}>{attachmentError}</div>}
          <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={uploading} style={{ fontSize: '14px' }} />
          {uploading && <span style={{ marginLeft: '10px', fontSize: '13px', color: '#6c757d' }}>Đang tải lên…</span>}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '20px' }}>
        <h2 style={sectionTitleStyle}>Lịch sử khám</h2>
        <HistorySubsection title="Lượt khám" empty="Chưa có lượt khám nào.">
          {(history?.encounters ?? []).map(e => (
            <li key={e.ID} style={listItemStyle}>
              <div>
                <div style={{ fontWeight: '600', color: '#274760' }}>{e.Department?.Name ?? `Khoa #${e.DepartmentID}`} · {encounterTypeLabel(e.Type)}</div>
                <div style={{ fontSize: '13px', color: '#6c757d' }}>{new Date(e.CreatedAt).toLocaleString('vi-VN')}</div>
              </div>
              <span style={badgeStyle}>{encounterStatusLabel(e.Status)}</span>
            </li>
          ))}
        </HistorySubsection>
        <HistorySubsection title="Đơn thuốc" empty="Chưa có đơn thuốc nào.">
          {(history?.prescriptions ?? []).map(p => (
            <li key={p.ID} style={listItemStyle}>
              <div>
                <div style={{ fontWeight: '600', color: '#274760' }}>Đơn #{p.ID} ({(p.Items ?? []).length} thuốc)</div>
                <div style={{ fontSize: '13px', color: '#6c757d' }}>{new Date(p.CreatedAt).toLocaleString('vi-VN')}</div>
              </div>
              <span style={badgeStyle}>{prescriptionStatusLabel(p.Status)}</span>
            </li>
          ))}
        </HistorySubsection>
        <HistorySubsection title="Chỉ định CLS" empty="Chưa có chỉ định nào." last>
          {(history?.orders ?? []).map(o => (
            <li key={o.ID} style={listItemStyle}>
              <div>
                <div style={{ fontWeight: '600', color: '#274760' }}>{o.Name} ({orderTypeLabel(o.Type)})</div>
                <div style={{ fontSize: '13px', color: '#6c757d' }}>{new Date(o.CreatedAt).toLocaleString('vi-VN')}</div>
              </div>
              <span style={badgeStyle}>{orderStatusLabel(o.Status)}</span>
            </li>
          ))}
        </HistorySubsection>
      </div>

      {editOpen && form && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) !saving && setEditOpen(false); }}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#274760' }}>Sửa thông tin bệnh nhân</h2>
            <form onSubmit={handleSaveEdit}>
              <label style={labelStyle}>Họ tên *</label>
              <input required value={form.fullname} onChange={e => setForm({ ...form, fullname: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Giới tính *</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
                {GENDERS.map(g => <option key={g} value={g}>{genderLabel(g)}</option>)}
              </select>

              <label style={labelStyle}>Ngày sinh</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Số điện thoại</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>CCCD</label>
              <input value={form.cccd} onChange={e => setForm({ ...form, cccd: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Địa chỉ</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Số BHYT</label>
              <input value={form.insurance_number} onChange={e => setForm({ ...form, insurance_number: e.target.value })} style={inputStyle} />

              <label style={labelStyle}>Tiền sử dị ứng</label>
              <textarea value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setEditOpen(false)} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', color: '#274760' }}>{value}</div>
    </div>
  );
}

function HistorySubsection({ title, empty, children, last }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);
  return (
    <div style={{ marginBottom: last ? 0 : '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#274760', margin: '0 0 10px' }}>{title}</h3>
      {hasItems ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{children}</ul>
      ) : (
        <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>{empty}</p>
      )}
    </div>
  );
}

const cardStyle = { background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', padding: '24px' };
const sectionTitleStyle = { fontSize: '17px', fontWeight: '700', color: '#274760', margin: '0 0 16px' };
const listItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f4f8', gap: '10px' };
const badgeStyle = { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: 'rgba(48,123,196,0.1)', color: '#307bc4', flexShrink: 0 };
const iconBtnStyle = { width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #e8edf2', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6c757d' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const secondaryBtnStyle = { padding: '10px 18px', borderRadius: '25px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(39,71,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBoxStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8', fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const smallInputStyle = { padding: '9px 12px', borderRadius: '10px', border: '1px solid #dde2e8', fontSize: '14px', color: '#274760', outline: 'none', boxSizing: 'border-box' };
