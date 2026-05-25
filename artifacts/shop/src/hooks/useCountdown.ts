import { useState, useEffect } from "react";

export interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  expired: boolean;
}

export function useCountdown(endsAt: string | undefined): CountdownTime {
  const getRemaining = (): CountdownTime => {
    if (!endsAt) return { hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
    const total = new Date(endsAt).getTime() - Date.now();
    if (total <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
    const hours = Math.floor(total / 1000 / 3600);
    const minutes = Math.floor((total / 1000 % 3600) / 60);
    const seconds = Math.floor(total / 1000 % 60);
    return { hours, minutes, seconds, total, expired: false };
  };

  const [time, setTime] = useState<CountdownTime>(getRemaining);

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setTime(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return time;
}
