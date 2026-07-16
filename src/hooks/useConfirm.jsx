import { useCallback, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export default function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    setState({ message, danger: options.danger ?? true, confirmLabel: options.confirmLabel ?? 'Xác nhận' });
    return new Promise(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const handleChoice = choice => {
    setState(null);
    resolver.current?.(choice);
    resolver.current = null;
  };

  const ConfirmDialog = state ? (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(39,71,96,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleChoice(false); }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '400px',
        padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '22px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
            background: state.danger ? 'rgba(220,53,69,0.1)' : 'rgba(48,123,196,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon
              icon="fa6-solid:triangle-exclamation"
              style={{ fontSize: '18px', color: state.danger ? '#dc3545' : '#307bc4' }}
            />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#274760', lineHeight: '1.5' }}>
            {state.message}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => handleChoice(false)}
            style={{
              padding: '10px 22px', borderRadius: '25px', border: '1px solid #dde2e8',
              background: '#fff', color: '#274760', cursor: 'pointer',
              fontSize: '14px', fontWeight: '500',
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => handleChoice(true)}
            style={{
              padding: '10px 22px', borderRadius: '25px', border: 'none',
              background: state.danger ? '#dc3545' : '#307bc4', color: '#fff', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600',
            }}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [confirm, ConfirmDialog];
}
