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
        // SOLO mostrar patrocinadores ACTIVOS con monto > 0 (pagados)
        return all
          .filter(s => s.estado === "Activo" && (s.monto || 0) > 0)
          .sort((a, b) => {
            const order = { "Principal": 0, "Oro": 1, "Plata": 2, "Bronce": 3, "Colaborador": 4 };
            return (order[a.nivel_patrocinio] || 5) - (order[b.nivel_patrocinio] || 5);
          });
      } catch (error) {
        console.error("Error cargando patrocinadores:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Refrescar cada 5 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Los patrocinadores principales aparecen más tiempo
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

  // Siempre rotar si hay más de 1 patrocinador
  const showMultiple = false;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700">
      <div className="py-3 px-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Patrocinadores Oficiales
          </span>
        </div>
        
        {showMultiple ? (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {visibleSponsors.map((sponsor) => {
              const content = (
                <div 
                  className={`flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 hover:bg-white/20 transition-all ${sponsor.website_url ? 'cursor-pointer' : ''}`}
                >
                  {sponsor.logo_url ? (
                    <img 
                      src={sponsor.logo_url} 
                      alt={sponsor.nombre}
                      className="h-6 w-auto object-contain"
                    />
                  ) : (
                    <div className={`w-6 h-6 rounded bg-gradient-to-r ${nivelColors[sponsor.nivel_patrocinio]} flex items-center justify-center`}>
                      <Building2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-white font-medium">{sponsor.nombre}</span>
                </div>
              );
              
              return sponsor.website_url ? (
                <a 
                  key={sponsor.id}
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content}
                </a>
              ) : (
                <div key={sponsor.id}>{content}</div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {(() => {
              const sponsor = sponsors[currentIndex];
              if (!sponsor) return null;
              
              const isPremium = ["Principal", "Oro"].includes(sponsor.nivel_patrocinio);
              const logoSize = isPremium ? "h-12" : "h-8";
              const textSize = isPremium ? "text-base font-bold" : "text-sm font-medium";
              const bgStyle = isPremium 
                ? `bg-gradient-to-r ${nivelColors[sponsor.nivel_patrocinio]} shadow-lg` 
                : "bg-white/10";
              
              const content = (
                <div className={`flex items-center gap-3 ${bgStyle} rounded-lg px-4 py-2 transition-all animate-fade-in hover:scale-105`}>
                  {sponsor.logo_url ? (
                    <img 
                      src={sponsor.logo_url} 
                      alt={sponsor.nombre}
                      className={`${logoSize} w-auto object-contain ${isPremium ? 'drop-shadow-lg' : ''}`}
                    />
                  ) : (
                    <div className={`${isPremium ? 'w-12 h-12' : 'w-8 h-8'} rounded bg-white/20 flex items-center justify-center`}>
                      <Building2 className={`${isPremium ? 'w-6 h-6' : 'w-4 h-4'} text-white`} />
                    </div>
                  )}
                  <span className={`${textSize} text-white`}>{sponsor.nombre}</span>
                </div>
              );
              
              return sponsor.website_url ? (
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={sponsor.id}
                >
                  {content}
                </a>
              ) : (
                <div key={sponsor.id}>{content}</div>
              );
            })()}
            
            {/* Dots indicator */}
            <div className="flex gap-1 ml-4">
              {sponsors.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-orange-500 w-3' : 'bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}