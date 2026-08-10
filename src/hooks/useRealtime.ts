import { useEffect, useRef } from 'react';
import { realtimeClient, type RealtimeEnvelope } from '@/lib/realtime';

export function useRealtime(onMessage: (envelope: RealtimeEnvelope) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    return realtimeClient.subscribe(envelope => handlerRef.current(envelope));
  }, []);
}
