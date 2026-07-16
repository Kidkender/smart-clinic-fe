import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../api/department';
import { resolveError } from '../utils/errorMessages';
import useConfirm from '../hooks/useConfirm';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, ConfirmDialog] = useConfirm();

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getDepartments();
      setDepartments(result.data ?? []);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreate = () => {
    setName('');
    setDescription('');
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = department => {
    setName(department.Name);
    setDescription(department.Description ?? '');
    setFormError('');
    setModal({ mode: 'edit', department });
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await createDepartment(name.trim(), description.trim());
      } else {
        await updateDepartment(modal.department.ID, name.trim(), description.trim());
      }
      await fetchDepartments();
      setModal(null);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async department => {
    if (!(await confirm(`Xóa khoa/phòng "${department.Name}"?`, { confirmLabel: 'Xóa' }))) return;
    try {
      await deleteDepartment(department.ID);
      await fetchDepartments();
    } catch (err) {
      setError(resolveError(err));
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#274760', margin: 0 }}>Khoa/Phòng</h1>
          <p style={{ color: '#6c757d', marginTop: '4px', marginBottom: 0, fontSize: '15px' }}>
            Quản lý danh mục khoa lâm sàng
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Icon icon="fa6-solid:plus" style={{ fontSize: '14px' }} />
          <span>Thêm khoa/phòng</span>
        </button>
      </div>

      {error && <div style={errorBoxStyle}><Icon icon="fa6-solid:circle-exclamation" />{error}</div>}

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8edf2', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>Đang tải…</div>
        ) : departments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>
            <Icon icon="fa6-solid:sitemap" style={{ fontSize: '48px', color: '#307bc4', opacity: 0.4, marginBottom: '16px' }} />
            <h3 style={{ color: '#274760', marginBottom: '8px' }}>Chưa có khoa/phòng nào</h3>
            <button onClick={openCreate} style={primaryBtnStyle}>Tạo khoa/phòng đầu tiên</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa' }}>
                <th style={thStyle}>Tên</th>
                <th style={thStyle}>Mô tả</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.ID} style={{ borderTop: '1px solid #f0f4f8' }}>
                  <td style={tdStyle}>{d.Name}</td>
                  <td style={tdStyle}>{d.Description}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(d)} style={iconBtnStyle} title="Sửa">
                      <Icon icon="fa6-solid:pen" style={{ fontSize: '13px' }} />
                    </button>
                    <button onClick={() => handleDelete(d)} style={{ ...iconBtnStyle, marginLeft: '8px', color: '#dc3545' }} title="Xóa">
                      <Icon icon="fa6-solid:trash" style={{ fontSize: '13px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={modalBoxStyle}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: '#274760' }}>
              {modal.mode === 'create' ? 'Thêm khoa/phòng' : 'Sửa khoa/phòng'}
            </h2>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Tên khoa/phòng *</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="VD: Nội tổng quát" />
              <label style={labelStyle}>Mô tả</label>
              <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />

              {formError && <div style={{ ...errorBoxStyle, marginTop: '16px' }}>{formError}</div>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={closeModal} disabled={saving} style={secondaryBtnStyle}>Hủy</button>
                <button type="submit" disabled={saving} style={primaryBtnStyle}>
                  {saving ? 'Đang lưu…' : modal.mode === 'create' ? 'Tạo' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </>
  );
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#274760' };
const iconBtnStyle = { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #e8edf2', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6c757d' };
const primaryBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '25px', border: 'none', background: '#307bc4', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
const secondaryBtnStyle = { padding: '11px 20px', borderRadius: '25px', border: '1px solid #dde2e8', background: '#fff', color: '#274760', cursor: 'pointer', fontSize: '14px', fontWeight: '500' };
const errorBoxStyle = { background: 'rgba(220,53,69,0.08)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', padding: '14px 18px', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' };
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(39,71,96,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBoxStyle = { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#274760', marginBottom: '6px', marginTop: '16px' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dde2e8', fontSize: '15px', color: '#274760', outline: 'none', boxSizing: 'border-box' };
