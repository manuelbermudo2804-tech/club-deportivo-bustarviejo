import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Building2, ExternalLink } from "lucide-react";

export default function SponsorBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: sponsors = [] } = useQuery({
    queryKey: ['activeSponsors'],
    queryFn: async () => {
      const all = await base44.entities.Sponsor.list();
      return all.filter(s => s.estado === "Activo").sort((a, b) => {
        const order = { "Principal": 0, "Oro": 1, "Plata": 2, "Bronce": 3, "Colaborador": 4 };
        return (order[a.nivel_patrocinio] || 5) - (order[b.nivel_patrocinio] || 5);
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % sponsors.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [sponsors.length]);

  if (sponsors.length === 0) return null;

  const nivelColors = {
    "Principal": "from-yellow-500 to-amber-600",
    "Oro": "from-yellow-400 to-yellow-500",
    "Plata": "from-slate-400 to-slate-500",
    "Bronce": "from-orange-500 to-orange-600",
    "Colaborador": "from-blue-500 to-blue-600"
  };

  const currentSponsor = sponsors[currentIndex];
  if (!currentSponsor) return null;

  const SponsorContent = () => (
    <div className="flex items-center gap-3">
      {currentSponsor.logo_url ? (
        <img 
          src={currentSponsor.logo_url} 
          alt={currentSponsor.nombre}
          className="h-8 w-auto object-contain"
        />
      ) : (
        <div className={`w-8 h-8 rounded bg-gradient-to-r ${nivelColors[currentSponsor.nivel_patrocinio]} flex items-center justify-center`}>
          <Building2 className="w-4 h-4 text-white" />
        </div>
      )}
      <div>
        <span className="text-sm text-white font-medium block">{currentSponsor.nombre}</span>
        <span className={`text-[10px] bg-gradient-to-r ${nivelColors[currentSponsor.nivel_patrocinio]} text-white px-1.5 py-0.5 rounded`}>
          {currentSponsor.nivel_patrocinio}
        </span>
      </div>
      {currentSponsor.website_url && (
        <ExternalLink className="w-4 h-4 text-slate-400" />
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700">
      <div className="py-3 px-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Patrocinadores Oficiales
          </span>
        </div>
        
        <div className="flex items-center justify-center">
          {currentSponsor.website_url ? (
            <a
              href={currentSponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 transition-all hover:bg-white/20 cursor-pointer"
            >
              <SponsorContent />
            </a>
          ) : (
            <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2">
              <SponsorContent />
            </div>
          )}
          
          {/* Dots indicator */}
          {sponsors.length > 1 && (
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
          )}
        </div>
      </div>
    </div>
  );
}