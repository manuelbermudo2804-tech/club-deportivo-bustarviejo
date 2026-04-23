import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

export default function SponsorBanner() {
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const speedRef = useRef(0.5);

  const { data: sponsors = [] } = useQuery({
    queryKey: ['activeSponsors'],
    queryFn: async () => {
      try {
        const all = await base44.entities.Sponsor.list();
        return all
          .filter(s => s.activo === true)
          .sort((a, b) => {
            const order = { "Principal": 0, "Oro": 1, "Plata": 2, "Bronce": 3, "Colaborador": 4 };
            return (order[a.nivel_patrocinio] || 5) - (order[b.nivel_patrocinio] || 5);
          });
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Infinite scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || sponsors.length === 0) return;

    let pos = 0;
    const animate = () => {
      pos += speedRef.current;
      // When we've scrolled past the first set, reset seamlessly
      const half = el.scrollWidth / 2;
      if (pos >= half) pos = 0;
      el.scrollLeft = pos;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [sponsors.length]);

  // Pause on touch
  const handleTouchStart = () => { speedRef.current = 0; };
  const handleTouchEnd = () => { speedRef.current = 0.5; };

  // Track click on sponsor logo
  const handleSponsorClick = useCallback((sponsor) => {
    try {
      base44.entities.SponsorImpression.create({
        sponsor_id: sponsor.id,
        sponsor_nombre: sponsor.nombre,
        ubicacion: 'banner',
        tipo: 'click',
        pagina: window.location.pathname
      });
      // Also increment counter on sponsor
      base44.entities.Sponsor.update(sponsor.id, {
        clicks_totales: (sponsor.clicks_totales || 0) + 1
      });
    } catch {}
  }, []);

  if (sponsors.length === 0) return null;

  const nivelColors = {
    "Principal": "from-amber-500 to-yellow-600",
    "Oro": "from-yellow-400 to-amber-500",
    "Plata": "from-slate-300 to-slate-400",
    "Bronce": "from-orange-400 to-orange-500",
    "Colaborador": "from-blue-400 to-blue-500"
  };

  // Estilos visuales por nivel (badge + color texto)
  const nivelStyles = {
    "Principal": {
      badge: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm",
      text: "text-amber-700 font-bold text-sm",
      logoSize: "h-10",
      glow: "drop-shadow(0 0 6px rgba(255,200,0,0.5))"
    },
    "Oro": {
      badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm",
      text: "text-amber-700 font-bold text-sm",
      logoSize: "h-9",
      glow: "drop-shadow(0 0 4px rgba(255,200,0,0.4))"
    },
    "Plata": {
      badge: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 shadow-sm",
      text: "text-slate-700 font-semibold text-sm",
      logoSize: "h-8",
      glow: "drop-shadow(0 0 3px rgba(148,163,184,0.4))"
    },
    "Bronce": {
      badge: "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-sm",
      text: "text-orange-700 font-semibold text-sm",
      logoSize: "h-8",
      glow: "drop-shadow(0 0 3px rgba(251,146,60,0.4))"
    },
    "Colaborador": {
      badge: "",
      text: "text-slate-600 font-medium text-xs",
      logoSize: "h-7",
      glow: "none"
    }
  };

  // Duplicate items for seamless infinite loop
  const items = [...sponsors, ...sponsors];

  return (
    <div className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-t border-slate-300/60">
      <div className="flex items-center h-14 overflow-hidden">
        {/* Label */}
        <div className="flex-shrink-0 px-2.5 border-r border-slate-300/50 h-full flex items-center">
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold leading-tight text-center">
            SPONSOR<br/>OFICIAL
          </span>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-hidden flex items-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={() => { speedRef.current = 0; }}
          onMouseLeave={() => { speedRef.current = 0.5; }}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center px-4 whitespace-nowrap">
            {items.map((sponsor, idx) => {
              const style = nivelStyles[sponsor.nivel_patrocinio] || nivelStyles["Colaborador"];
              const showBadge = ["Principal", "Oro", "Plata", "Bronce"].includes(sponsor.nivel_patrocinio);

              const inner = (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.nombre}
                      className={`${style.logoSize} w-auto object-contain`}
                      style={{ filter: style.glow !== 'none' ? style.glow : 'none' }}
                    />
                  ) : (
                    <div className={`${style.logoSize} aspect-square rounded bg-gradient-to-r ${nivelColors[sponsor.nivel_patrocinio]} flex items-center justify-center`}>
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className={style.text}>
                    {sponsor.nombre}
                  </span>
                  {showBadge && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${style.badge}`}>
                      {sponsor.nivel_patrocinio}
                    </span>
                  )}
                </div>
              );

              const separator = (
                <span key={`sep-${idx}`} className="text-slate-300 mx-3 flex-shrink-0 select-none" aria-hidden="true">•</span>
              );

              const item = sponsor.website_url ? (
                <a key={`${sponsor.id}-${idx}`} href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" onClick={() => handleSponsorClick(sponsor)}>
                  {inner}
                </a>
              ) : (
                <div key={`${sponsor.id}-${idx}`} className="flex-shrink-0">{inner}</div>
              );

              return (
                <React.Fragment key={`frag-${sponsor.id}-${idx}`}>
                  {item}
                  {separator}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}