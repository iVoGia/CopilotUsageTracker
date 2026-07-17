'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './auth';

type RealtimeCtx = {
  lastEventAt: string | null;
  eventCount: number;
};

const Ctx = createContext<RealtimeCtx>({ lastEventAt: null, eventCount: 0 });

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(`${WS_URL}/realtime`, {
      auth: { token },
      transports: ['websocket'],
    });
    socket.on('usage.event.created', (payload: { occurredAt: string }) => {
      setLastEventAt(payload.occurredAt);
      setEventCount((c) => c + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, [token]);

  return <Ctx.Provider value={{ lastEventAt, eventCount }}>{children}</Ctx.Provider>;
}

export function useRealtime() {
  return useContext(Ctx);
}
