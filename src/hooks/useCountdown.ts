import { useEffect, useRef, useState } from 'react';

interface UseCountdownResult {
  secondsLeft: number;
  isActive: boolean;
  start: (seconds: number) => void;
}

export function useCountdown(): UseCountdownResult {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const start = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(seconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return { secondsLeft, isActive: secondsLeft > 0, start };
}
