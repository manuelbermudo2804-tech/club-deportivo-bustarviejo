import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

export default function SponsorBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

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
      } catch (error) {
        console.error("Error cargando patrocinadores:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const getDisplayTime = (sponsor) => {
    const times = { "Principal": 8000, "Oro": 6000, "Plata": 4000, "Bronce": 3000, "Colaborador": 3000 };
    return times[sponsor?.nivel_patrocinio] || 3000;
  };

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const currentSponsor = sponsors[currentIndex];
    const displayTime = getDisplayTime(currentSponsor);
    const timeout = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % sponsors.length);
    }, displayTime);
    return () => clearTimeout(timeout);
  }, [sponsors.length, currentIndex, sponsors]);

  if (sponsors.length === 0) return null;

  const nivelColors = {
    "Principal": "from-yellow-500 to-amber-600",
    "Oro": "from-yellow-400 to-yellow-500",
    "Plata": "from-slate-400 to-slate-500",
    "Bronce": "from-orange-500 to-orange-600",
    "Colaborador": "from-blue-500 to-blue-600"
  };

  const sponsor = sponsors[currentIndex];
  if (!sponsor) return null;

  const isPremium = ["Principal", "Oro"].includes(sponsor.nivel_patrocinio);
  const logoSize = isPremium ? "h-7" : "h-5";
  const textSize = isPremium ? "text-xs font-bold" : "text-[11px] font-medium";
  const bgStyle = isPremium
    ? `bg-gradient-to-r ${nivelColors[sponsor.nivel_patrocinio]}`
    : "bg-white/10";

  const content = (
    <div className={`flex items-center gap-2 ${bgStyle} rounded-md px-3 py-1 transition-all`}>
      {sponsor.logo_url ? (
        <img
          src={sponsor.logo_url}
          alt={sponsor.nombre}
          className={`${logoSize} w-auto object-contain ${isPremium ? 'drop-shadow-md' : ''}`}
        />
      ) : (
        <div className={`${isPremium ? 'w-7 h-7' : 'w-5 h-5'} rounded bg-white/20 flex items-center justify-center`}>
          <Building2 className={`${isPremium ? 'w-4 h-4' : 'w-3 h-3'} text-white`} />
        </div>
      )}
      <span className={`${textSize} text-white`}>{sponsor.nombre}</span>
    </div>
  );

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700">
      <div className="py-1.5 px-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold hidden sm:inline">
            Patrocinador
          </span>
          {sponsor.website_url ? (
            <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          ) : (
            content
          )}
          {sponsors.length > 1 && (
            <div className="flex gap-0.5 ml-2">
              {sponsors.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`rounded-full transition-all ${
                    idx === currentIndex ? 'bg-orange-500 w-2.5 h-1.5' : 'bg-slate-600 w-1.5 h-1.5'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}