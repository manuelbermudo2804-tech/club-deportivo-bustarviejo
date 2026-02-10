import React from "react";

export default function PullToRefresh({ children, onRefresh, threshold = 70, enabled = true }) {
  const containerRef = React.useRef(null);
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startYRef = React.useRef(null);
  const pullingRef = React.useRef(false);

  const handleTouchStart = (e) => {
    if (!enabled || refreshing) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = containerRef.current ? containerRef.current.scrollTop <= 0 : true;
  };

  const handleTouchMove = (e) => {
    if (!enabled || refreshing) return;
    if (!pullingRef.current) return;
    const currentY = e.touches[0].clientY;
    const dy = currentY - (startYRef.current || 0);
    if (dy > 0) {
      e.preventDefault(); // evita el refresco nativo
      setPull(Math.min(dy * 0.6, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (!enabled || refreshing) { setPull(0); return; }
    if (pull >= threshold) {
      try {
        setRefreshing(true);
        await (onRefresh ? onRefresh() : Promise.resolve());
      } finally {
        setRefreshing(false);
      }
    }
    setPull(0);
  };

  return (
    <div
      ref={containerRef}
      className="relative swipeable"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="pointer-events-none absolute top-0 left-0 right-0 flex justify-center" style={{ height: threshold }}>
        <div
          className={`mt-2 transition-all ${refreshing ? 'opacity-100' : pull > 5 ? 'opacity-100' : 'opacity-0'}`}
          style={{ transform: `translateY(${Math.min(pull, threshold) - 20}px)` }}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-orange-500 to-green-500 shadow-lg flex items-center justify-center text-white text-xs font-bold">
            {refreshing ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" />
              </svg>
            ) : (
              <span>↓</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ transform: `translateY(${pull}px)`, transition: refreshing ? 'transform .2s ease' : 'none' }}>
        {children}
      </div>
    </div>
  );
}