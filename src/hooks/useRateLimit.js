import { useState, useEffect, useRef } from "react";

// Detecta errores 429/rate-limit y pausa consultas temporalmente
export default function useRateLimit() {
  const [rateLimited, setRateLimited] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const onRateLimit = (e) => {
      try {
        const msg = (e?.reason?.message || e?.message || '').toString();
        if (/rate limit|429|too many requests/i.test(msg)) {
          if (timerRef.current) clearTimeout(timerRef.current);
          window.__BASE44_PAUSE_REALTIME__ = true;
          setRateLimited(true);
          timerRef.current = setTimeout(() => {
            window.__BASE44_PAUSE_REALTIME__ = false;
            setRateLimited(false);
          }, 25000);
        }
      } catch {}
    };
    window.addEventListener('unhandledrejection', onRateLimit);
    return () => window.removeEventListener('unhandledrejection', onRateLimit);
  }, []);

  return rateLimited;
}