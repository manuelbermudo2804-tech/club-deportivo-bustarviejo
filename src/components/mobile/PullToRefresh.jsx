import React, { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function PullToRefresh({ children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);
  const queryClient = useQueryClient();

  const THRESHOLD = 80;

  const canPull = () => {
    return window.scrollY <= 0;
  };

  const handleTouchStart = useCallback((e) => {
    if (!canPull() || refreshing) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && canPull()) {
      // Dampen the pull distance
      const dampened = Math.min(diff * 0.4, 120);
      setPullDistance(dampened);
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
      try {
        await queryClient.invalidateQueries();
        // Small delay so user sees the spinner
        await new Promise(r => setTimeout(r, 600));
      } catch {}
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, queryClient]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-center justify-center pointer-events-none"
          style={{
            height: refreshing ? 48 : pullDistance,
            transition: refreshing ? 'height 0.2s ease' : pulling ? 'none' : 'height 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              opacity: progress,
              transform: `rotate(${progress * 360}deg)`,
              transition: refreshing ? 'none' : 'transform 0.1s linear',
            }}
          >
            <Loader2
              className={`w-6 h-6 text-orange-600 ${refreshing ? 'animate-spin' : ''}`}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}