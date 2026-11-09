import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

export default function SponsorBanner() {
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const speedRef = useRef(0.7);

  const { data: sponsors = [] } = useQuery({
    queryKey: ['activeSponsors'],
    queryFn: async () => {
      try {
        const all = await base44.entities.Sponsor.list();
        // Mezclar los patrocinadores en cada carga para repartir la visibilidad.
        // El nivel de patrocinio sigue reflejándose en el diseño de cada tarjeta.
        const activos = all.filter(s => s.activo === true);
        for (let i = activos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [activos[i], activos[j]] = [activos[j], activos[i]];
        }
        return activos;
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
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
  const handleTouchEnd = () => { speedRef.current = 0.7; };

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

  // Estilos visuales por nivel — cada nivel tiene tarjeta con fondo+borde distintivo
  const nivelStyles = {
    "Principal": {
      card: "bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border border-amber-400 shadow-md shadow-amber-200/50",
      badge: "bg-gradient-to-r from-amber-500 to-yellow-600 text-white",
      text: "text-amber-900 font-bold text-xs",
      logoFrame: "w-[230px] h-[54px]",
      icon: null
    },
    "Oro": {
      card: "bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 border border-yellow-400 shadow-md shadow-yellow-200/50",
      badge: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white",
      text: "text-amber-800 font-bold text-xs",
      logoFrame: "w-[220px] h-[54px]",
      icon: null
    },
    "Plata": {
      card: "bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 border border-slate-400 shadow-sm",
      badge: "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
      text: "text-slate-700 font-semibold text-xs",
      logoFrame: "w-[210px] h-[54px]",
      icon: null
    },
    "Bronce": {
      card: "bg-gradient-to-r from-orange-100 via-amber-50 to-orange-100 border border-orange-400 shadow-sm",
      badge: "bg-gradient-to-r from-orange-500 to-amber-600 text-white",
      text: "text-orange-800 font-semibold text-xs",
      logoFrame: "w-[200px] h-[54px]",
      icon: null
    },
    "Colaborador": {
      card: "",
      badge: "",
      text: "text-slate-600 font-medium text-[10px]",
      logoFrame: "w-[190px] h-[54px]",
      icon: null
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
          onMouseLeave={() => { speedRef.current = 0.7; }}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center px-4 whitespace-nowrap">
            {items.map((sponsor, idx) => {
              const style = nivelStyles[sponsor.nivel_patrocinio] || nivelStyles["Colaborador"];
              const showBadge = ["Principal", "Oro", "Plata", "Bronce"].includes(sponsor.nivel_patrocinio);
              const sponsorsWithName = [
                "FRUTAS FAUSTO, S.L.",
                "Allforpets",
                "La Mina Restaurante",
                "LA CANDALEA HERBOLARIO",
                "PAPELERIA FUENTENUEVA",
                "KIKO FISIO",
                "ALFER GESTION"
              ];
              const showSponsorName = sponsorsWithName.includes((sponsor.nombre || "").trim()) && !!sponsor.logo_url;
              const logoFrameClass = showSponsorName
                ? style.logoFrame.replace("h-[54px]", "h-[38px]")
                : style.logoFrame;

              const inner = (
                <div className={`flex ${showSponsorName ? "flex-col gap-0.5" : "flex-row gap-2"} items-center flex-shrink-0 ${showBadge ? `${style.card} rounded-lg px-1 py-0` : ''}`}>
                  {style.icon && (
                    <span className="text-sm leading-none flex-shrink-0">{style.icon}</span>
                  )}
                  {sponsor.logo_url ? (
                    <div className={`${logoFrameClass} flex-shrink-0 flex items-center justify-center overflow-hidden rounded-md bg-white p-0 shadow-sm ring-1 ring-slate-900/10`}>
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.nombre}
                        className="h-full w-full max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className={`${style.logoFrame} rounded-md bg-gradient-to-r ${nivelColors[sponsor.nivel_patrocinio]} flex items-center justify-center flex-shrink-0`}>
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {showSponsorName && (
                    <span className="max-w-[220px] truncate text-[9px] font-bold leading-none text-slate-800">
                      {sponsor.nombre.trim()}
                    </span>
                  )}
                  {!sponsor.logo_url && (
                    <div className="flex flex-col leading-tight">
                      <span className={style.text}>{sponsor.nombre}</span>
                      {showBadge && (
                        <span className={`text-[8px] font-bold uppercase tracking-wide ${style.text} opacity-70`}>
                          {sponsor.nivel_patrocinio}
                        </span>
                      )}
                    </div>
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

              return [
                React.cloneElement(item, { key: `item-${sponsor.id}-${idx}` }),
                React.cloneElement(separator, { key: `sep-${sponsor.id}-${idx}` })
              ];
            })}
          </div>
        </div>
      </div>
    </div>
  );
}