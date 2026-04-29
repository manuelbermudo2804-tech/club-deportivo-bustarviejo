import React, { useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";

/**
 * Badge compacto del Patrocinador Principal — diseñado para ir en la barra superior
 * junto a botones como "IA" o "Compartir".
 * Si no hay patrocinador Principal activo, no renderiza nada.
 */
export default function MainSponsorBadge() {
  const { data: principal } = useQuery({
    queryKey: ['mainSponsorPrincipalBadge'],
    queryFn: async () => {
      try {
        const all = await base44.entities.Sponsor.list();
        return all.find((s) => s.activo === true && s.nivel_patrocinio === "Principal") || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleClick = useCallback(() => {
    if (!principal) return;
    try {
      base44.entities.SponsorImpression.create({
        sponsor_id: principal.id,
        sponsor_nombre: principal.nombre,
        ubicacion: 'top_badge',
        tipo: 'click',
        pagina: window.location.pathname
      });
      base44.entities.Sponsor.update(principal.id, {
        clicks_totales: (principal.clicks_totales || 0) + 1
      });
    } catch {}
  }, [principal]);

  if (!principal) return null;

  const Wrapper = principal.website_url ? 'a' : 'div';
  const wrapperProps = principal.website_url
    ? { href: principal.website_url, target: '_blank', rel: 'noopener noreferrer', onClick: handleClick }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="flex items-center justify-center gap-1.5 h-8 w-full px-2 rounded-md bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 shadow-md border border-amber-300/60 transition-all active:scale-95 overflow-hidden"
      title={`Patrocinador Principal: ${principal.nombre}`}
    >
      <Crown className="w-3.5 h-3.5 text-white flex-shrink-0" />
      {principal.logo_url && (
        <div className="bg-white rounded px-1 py-0.5 flex items-center flex-shrink-0">
          <img
            src={principal.logo_url}
            alt={principal.nombre}
            className="h-5 w-auto object-contain"
          />
        </div>
      )}
      <span className="text-white font-bold text-[10px] uppercase tracking-wide truncate">
        {principal.nombre}
      </span>
    </Wrapper>
  );
}