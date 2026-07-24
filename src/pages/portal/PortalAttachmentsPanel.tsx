import { attachmentCategoryLabel } from '@/utils/labels';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Attachment } from './types';

export default function PortalAttachmentsPanel({
  attachments,
  loading,
  error,
  openingAttachmentId,
  onView,
}: {
  attachments: Attachment[] | null;
  loading: boolean;
  error: string;
  openingAttachmentId: number | string | null;
  onView: (attachment: Attachment) => void;
}) {
  return (
    <div className="mt-5">
      <h2 className="m-0 mb-4 text-lg font-bold text-[#134e48]">Tệp đính kèm của tôi</h2>
      {error && <ErrorAlert className="mb-4">{error}</ErrorAlert>}
      {loading ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Đang tải…</Card>
      ) : !attachments || attachments.length === 0 ? (
        <Card className="rounded-2xl border-[#d1fae5] p-5 text-center text-[#6c757d]">Chưa có tệp đính kèm nào.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {attachments.map(a => (
            <Card key={a.ID} className="rounded-2xl border-[#d1fae5] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="overflow-hidden font-bold text-ellipsis whitespace-nowrap text-[#134e48]">{a.FileName}</div>
                  <div className="mt-1 text-[13px] text-[#6c757d]">
                    <span className="inline-block rounded-full bg-[#0d9488]/10 px-2 py-0.5 text-xs font-semibold text-[#0d9488]">{attachmentCategoryLabel(a.Category)}</span>
                    {' · '}{new Date(a.CreatedAt).toLocaleDateString('vi-VN')}
                    {a.FileSize ? ` · ${(a.FileSize / 1024).toFixed(0)} KB` : ''}
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={openingAttachmentId === a.ID}
                  onClick={() => onView(a)}
                  className="h-auto shrink-0 rounded-xl bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d9488]/90"
                >
                  {openingAttachmentId === a.ID ? 'Đang mở…' : 'Xem'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
