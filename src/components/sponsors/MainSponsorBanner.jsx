import React, { useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Crown, ExternalLink } from "lucide-react";

/**
 * Banner destacado del Patrocinador Principal.
 * Se muestra SOLO si existe un Sponsor con:
 *   - nivel_patrocinio === "Principal"
 *   - activo === true
 * Si no hay ninguno, no renderiza nada (return null).
 */
export default function MainSponsorBanner() {
  const { data: principal } = useQuery({
    queryKey: ['mainSponsorPrincipal'],
    queryFn: async () => {
      try {
        const all = await base44.entities.Sponsor.list();
        const found = all.find(
          (s) => s.activo === true && s.nivel_patrocinio === "Principal"
        );
        return found || null;
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
        ubicacion: 'main_banner_home',
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
    ? {
        href: principal.website_url,
        target: '_blank',
        rel: 'noopener noreferrer',
        onClick: handleClick,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="block relative overflow-hidden rounded-2xl shadow-2xl border-2 border-amber-400/60 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 hover:scale-[1.01] active:scale-[0.99] transition-transform"
    >
      {/* Glow decorativo */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-4 lg:p-5 flex items-center gap-4">
        {/* Logo */}
        {principal.logo_url ? (
          <div className="flex-shrink-0 bg-white rounded-xl p-2 shadow-lg">
            <img
              src={principal.logo_url}
              alt={principal.nombre}
              className="h-14 lg:h-16 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-amber-300">
              Patrocinador Principal
            </span>
          </div>
          <p className="text-white font-black text-lg lg:text-xl truncate">
            {principal.nombre}
          </p>
          {principal.beneficios_acordados && (
            <p className="text-purple-200 text-xs lg:text-sm truncate hidden sm:block">
              {principal.beneficios_acordados}
            </p>
          )}
        </div>

        {/* Flecha */}
        {principal.website_url && (
          <ExternalLink className="w-5 h-5 text-amber-300 flex-shrink-0" />
        )}
      </div>
    </Wrapper>
  );
}