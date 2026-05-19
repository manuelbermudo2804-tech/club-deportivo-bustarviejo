import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicHero from "@/components/page-builder/PublicHero";
import PublicBlockRenderer from "@/components/page-builder/PublicBlockRenderer";
import PublicForm from "@/components/page-builder/PublicForm";

// Página pública renderizada desde la config de una LandingPage.
// Ruta: /l/:slug
export default function PublicLanding() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await base44.entities.LandingPage.filter({ slug });
        const found = results?.[0];
        if (cancelled) return;
        setPage(found || null);

        // Incrementa visitas (best-effort, no bloquear si falla)
        if (found && found.id) {
          base44.entities.LandingPage.update(found.id, {
            estadisticas: {
              ...(found.estadisticas || {}),
              visitas: (found.estadisticas?.visitas || 0) + 1,
            },
          }).catch(() => {});
        }

        // Meta tags básicos
        if (found?.config?.seo?.meta_titulo) {
          document.title = found.config.seo.meta_titulo;
        } else if (found?.nombre) {
          document.title = found.nombre;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const scrollToForm = () => {
    document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🔍</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Página no encontrada</h1>
          <p className="text-slate-600">No existe ninguna página con esta dirección.</p>
        </div>
      </div>
    );
  }

  if (page.estado === "borrador") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🚧</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Página en preparación</h1>
          <p className="text-slate-600">Esta página todavía no se ha publicado.</p>
        </div>
      </div>
    );
  }

  if (page.estado === "cerrada" || page.estado === "archivada") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-4">🔒</div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Inscripciones cerradas</h1>
          <p className="text-slate-600">
            {page.config?.limites?.mensaje_cerrado || "Esta página ya no acepta nuevas inscripciones."}
          </p>
        </div>
      </div>
    );
  }

  const cfg = page.config || {};
  const branding = cfg.branding || {};
  const bloques = cfg.bloques || [];

  return (
    <div className="min-h-screen bg-white" style={{ color: branding.color_texto || "#0f172a" }}>
      <PublicHero hero={cfg.hero} branding={branding} onCtaClick={scrollToForm} />

      {bloques.map((b) => (
        <PublicBlockRenderer key={b.id} bloque={b} branding={branding} />
      ))}

      {cfg.formulario && (
        <PublicForm
          landingId={page.id}
          landingSlug={page.slug}
          formulario={cfg.formulario}
          branding={branding}
        />
      )}

      {branding.mostrar_footer_club !== false && (
        <footer className="py-10 px-6 bg-slate-900 text-center">
          <p className="text-sm text-white/60">
            Organizado por <strong className="text-white">CD Bustarviejo</strong>
          </p>
        </footer>
      )}
    </div>
  );
}