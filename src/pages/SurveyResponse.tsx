import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getSurvey, submitSurvey } from '@/api/survey';
import { resolveError } from '@/utils/errorMessages';
import { submitSurveySchema, type SubmitSurveyFormValues } from '@/schemas/survey';

interface SurveyPublicView {
  patient_name: string;
  department_name: string;
  responded: boolean;
}

const RATING_VALUES = [1, 2, 3, 4, 5];

export default function SurveyResponse() {
  const { token = '' } = useParams();
  const [survey, setSurvey] = useState<SurveyPublicView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const {
    handleSubmit, setValue, watch, formState: { errors },
  } = useForm<SubmitSurveyFormValues>({
    resolver: zodResolver(submitSurveySchema),
    defaultValues: { rating: 0, comment: '' },
  });
  const rating = watch('rating');

  const fetchSurvey = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getSurvey(token);
      setSurvey(result.data);
    } catch (err) {
      setLoadError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const handleFormSubmit = handleSubmit(async values => {
    setSubmitError('');
    setSubmitting(true);
    try {
      await submitSurvey(token, { rating: values.rating, comment: values.comment.trim() });
      setDone(true);
    } catch (err) {
      setSubmitError(resolveError(err));
    } finally {
      setSubmitting(false);
    }
  });

  const showThankYou = done || survey?.responded;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fa] p-5">
      <div className="w-full max-w-[460px] rounded-[20px] bg-white p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        {loading ? (
          <p className="text-[#6c757d]">Đang tải khảo sát…</p>
        ) : loadError ? (
          <>
            <Icon icon="fa6-solid:circle-exclamation" className="mx-auto mb-4 text-[40px] text-[#dc3545]" />
            <h1 className="mb-2 text-xl font-bold text-[#1c3a52]">Không thể tải khảo sát</h1>
            <p className="text-[#6c757d]">{loadError}</p>
          </>
        ) : showThankYou ? (
          <>
            <Icon icon="fa6-solid:circle-check" className="mx-auto mb-4 text-[40px] text-[#28a745]" />
            <h1 className="mb-2 text-xl font-bold text-[#1c3a52]">Cảm ơn bạn đã đánh giá!</h1>
            <p className="text-[#6c757d]">Phản hồi của bạn giúp SmartClinic cải thiện chất lượng phục vụ.</p>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold text-[#1c3a52]">Khảo sát mức độ hài lòng</h1>
            <p className="mb-7 text-[#6c757d]">
              Xin chào {survey?.patient_name}, bạn cảm thấy thế nào về lượt khám tại {survey?.department_name}?
            </p>

            <form onSubmit={handleFormSubmit} noValidate className="text-left">
              <div className="flex justify-center gap-2">
                {RATING_VALUES.map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} sao`}
                    onClick={() => setValue('rating', value, { shouldValidate: true })}
                    className="cursor-pointer border-none bg-transparent p-1"
                  >
                    <Icon
                      icon={value <= rating ? 'fa6-solid:star' : 'fa6-regular:star'}
                      className={`text-[32px] ${value <= rating ? 'text-[#ffc107]' : 'text-[#dde2e8]'}`}
                    />
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className="mt-1 text-center text-[13px] font-medium text-[#dc3545]">{errors.rating.message}</p>
              )}

              <label className="mt-6 mb-1.5 block text-sm font-semibold text-[#274760]">Góp ý thêm (không bắt buộc)</label>
              <Textarea
                onChange={e => setValue('comment', e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn…"
                className="min-h-[100px] rounded-xl border-[#dde2e8] px-3.5 py-2.5 text-sm text-[#274760]"
              />

              {submitError && <ErrorAlert variant="plain" className="mt-4">{submitError}</ErrorAlert>}

              <Button
                type="submit"
                disabled={submitting}
                size="cta-block-lg"
                className="mt-6"
              >
                {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
