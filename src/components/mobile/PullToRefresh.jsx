import React, { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

export default function PullToRefresh({ children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const queryClient = useQueryClient();

  const THRESHOLD = 70;

  const canPull = () => window.scrollY <= 0;

  const handleTouchStart = useCallback((e) => {
    if (!isMobile() || !canPull() || refreshing) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing || !isMobile()) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && canPull()) {
      setPullDistance(Math.min(diff * 0.4, 100));
    } else {
      setPullDistance(0);
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      // Solo invalidar queries de la página actual, no todas (evita ráfaga masiva en móviles lentos)
      try {
        await queryClient.invalidateQueries({ refetchType: 'active' });
      } catch {}
      await new Promise(r => setTimeout(r, 400));
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, queryClient]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center pointer-events-none safe-area-top"
          style={{
            height: refreshing ? 44 : pullDistance,
            transition: refreshing ? 'height 0.2s ease' : pulling ? 'none' : 'height 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <Loader2
            className={`w-5 h-5 text-orange-600 ${refreshing ? 'animate-spin' : ''}`}
            style={{
              opacity: progress,
              transform: `rotate(${progress * 360}deg)`,
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}