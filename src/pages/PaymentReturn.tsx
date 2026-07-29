import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getGatewayReturn } from '@/api/billing';
import { resolveError } from '@/utils/errorMessages';

interface ReturnResult {
  txn_ref?: string;
  response_code?: string;
  message: string;
}

function resolveEncounterId(): string | null {
  try {
    const raw = sessionStorage.getItem('vnpay_return_context');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.encounterId) return String(parsed.encounterId);
    }
  } catch {
    // ignore malformed sessionStorage entry, fall through to query fallback
  }
  return new URLSearchParams(window.location.search).get('encounter_id');
}

export default function PaymentReturn() {
  const { gateway = 'vnpay' } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [returnEncounterId, setReturnEncounterId] = useState<string | null>(null);

  useEffect(() => {
    getGatewayReturn(gateway, window.location.search)
      .then(res => setResult(res.data))
      .catch(err => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [gateway]);

  useEffect(() => {
    if (loading) return;
    const encounterId = resolveEncounterId();
    sessionStorage.removeItem('vnpay_return_context');
    if (!encounterId) return;
    setReturnEncounterId(encounterId);
    const timer = setTimeout(() => {
      navigate(`/consultation/${encounterId}?openInvoice=1&from=vnpay`, { replace: true });
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, navigate]);

  const succeeded = result?.response_code === '00';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fa] p-5">
      <div className="w-full max-w-[440px] rounded-[20px] bg-white p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        {loading ? (
          <p className="text-[#6c757d]">Đang xác nhận kết quả thanh toán…</p>
        ) : error ? (
          <>
            <Icon icon="fa6-solid:circle-exclamation" className="mx-auto mb-4 text-[40px] text-[#dc3545]" />
            <h1 className="mb-2 text-xl font-bold text-[#1c3a52]">Không thể xác nhận</h1>
            <p className="text-[#6c757d]">{error}</p>
          </>
        ) : (
          <>
            <Icon
              icon={succeeded ? 'fa6-solid:circle-check' : 'fa6-solid:circle-info'}
              className={`mx-auto mb-4 text-[40px] ${succeeded ? 'text-[#28a745]' : 'text-[#307bc4]'}`}
            />
            <h1 className="mb-2 text-xl font-bold text-[#1c3a52]">
              {succeeded ? 'Đã ghi nhận thanh toán' : 'Đang xử lý thanh toán'}
            </h1>
            <p className="text-[#6c757d]">{result?.message}</p>
            {result?.txn_ref && (
              <p className="mt-2 text-xs text-[#adb5bd]">Mã giao dịch: {result.txn_ref}</p>
            )}
            {returnEncounterId && (
              <p className="mt-3 text-sm text-[#307bc4]">Đang quay lại màn hình làm việc…</p>
            )}
          </>
        )}

        <Link
          to={returnEncounterId ? `/consultation/${returnEncounterId}?openInvoice=1&from=vnpay` : '/'}
          className="mt-7 inline-block rounded-xl bg-[#307bc4] px-5 py-2.75 text-sm font-semibold text-white"
        >
          {returnEncounterId ? 'Quay lại lượt khám' : 'Về trang chủ'}
        </Link>
      </div>
    </div>
  );
}
