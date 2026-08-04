import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { VisuallyHidden } from 'radix-ui';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title?: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmState {
  message: string;
  title: string | null;
  danger: boolean;
  confirmLabel: string;
  cancelLabel: string;
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

export default function useConfirm(): [ConfirmFn, ReactNode] {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options = {}) => {
    setState({
      message,
      title: options.title ?? null,
      danger: options.danger ?? true,
      confirmLabel: options.confirmLabel ?? 'Xác nhận',
      cancelLabel: options.cancelLabel ?? 'Hủy',
    });
    return new Promise(resolve => {
      resolver.current = resolve;
    });
  }, []);

  const handleChoice = (choice: boolean) => {
    setState(null);
    resolver.current?.(choice);
    resolver.current = null;
  };

  const ConfirmDialog = (
    <Dialog open={!!state} onOpenChange={open => { if (!open) handleChoice(false); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[480px] rounded-2xl p-6">
        {state && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: state.danger ? 'rgba(220,53,69,0.1)' : 'rgba(48,123,196,0.1)' }}
                >
                  <Icon
                    icon="fa6-solid:triangle-exclamation"
                    style={{ fontSize: '12px', color: state.danger ? '#dc3545' : '#307bc4' }}
                  />
                </div>
                <div className="min-w-0">
                  {state.title ? (
                    <DialogTitle className="mb-1 text-base font-bold text-[#274760]">{state.title}</DialogTitle>
                  ) : (
                    <VisuallyHidden.Root asChild>
                      <DialogTitle>Xác nhận</DialogTitle>
                    </VisuallyHidden.Root>
                  )}
                  <p className="m-0 text-[15px] leading-relaxed text-[#274760]">{state.message}</p>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="mx-0 mb-0 justify-end gap-3 rounded-none border-t-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleChoice(false)}
                className="h-auto rounded-xl border-[#dde2e8] px-5 py-2.5 text-sm font-medium text-[#274760]"
              >
                {state.cancelLabel}
              </Button>
              <Button
                type="button"
                onClick={() => handleChoice(true)}
                className="h-auto rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: state.danger ? '#dc3545' : '#307bc4' }}
              >
                {state.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  return [confirm, ConfirmDialog];
}
