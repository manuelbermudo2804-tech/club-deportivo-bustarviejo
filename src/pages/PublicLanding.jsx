import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PublicHero from "@/components/page-builder/PublicHero";
import PublicBlockRenderer from "@/components/page-builder/PublicBlockRenderer";
import PublicForm from "@/components/page-builder/PublicForm";
import BackToWebsiteButton from "@/components/public/BackToWebsiteButton";
import { toast } from "sonner";

// Página pública renderizada desde la config de una LandingPage.
// Ruta: /l/:slug
export default function PublicLanding() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(null);
  const [plazasOcupadas, setPlazasOcupadas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Detectar retorno desde Stripe
  useEffect(() => {
    const pago = searchParams.get("pago");
    const sid = searchParams.get("sid");
    if (pago === "ok" && sid) {
      (async () => {
        try {
          const res = await base44.functions.invoke("landingPaymentConfirm", { session_id: sid });
          if (res?.data?.paid || res?.data?.already_paid) {
            setPaymentSuccess(true);
          } else {
            toast.error("No hemos podido confirmar el pago. Si te cobraron, contacta con nosotros.");
          }
        } catch {
          toast.error("Error confirmando el pago");
        } finally {
          // Limpiar parámetros de la URL
          searchParams.delete("pago");
          searchParams.delete("sid");
          setSearchParams(searchParams, { replace: true });
        }
      })();
    } else if (pago === "cancelado") {
      toast.info("Pago cancelado. Puedes intentarlo de nuevo cuando quieras.");
      searchParams.delete("pago");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('landingPublic', { action: 'get', slug });
        const found = res?.data?.page || null;
        if (cancelled) return;
        setPage(found);
        setPlazasOcupadas(res?.data?.plazas_ocupadas || 0);

        // Incrementa visitas (best-effort, no bloquear si falla)
        if (found && found.id) {
          base44.functions
            .invoke('landingPublic', { action: 'visit', page_id: found.id })
            .catch(() => {});
        }

        // Meta tags completos (title + description + Open Graph + Twitter)
        if (found) {
          const seo = found.config?.seo || {};
          const titulo = seo.meta_titulo || found.config?.hero?.titulo || found.nombre || "CD Bustarviejo";
          const descripcion = seo.meta_descripcion || found.config?.hero?.subtitulo || "";
          const imagen = seo.imagen_og || found.config?.hero?.imagen_url || "";

          document.title = titulo;

          const setMeta = (selector, attr, value) => {
            if (!value) return;
            let tag = document.querySelector(selector);
            if (!tag) {
              tag = document.createElement("meta");
              const [k, v] = selector.replace("meta[", "").replace("]", "").split("=");
              tag.setAttribute(k, v.replace(/"/g, ""));
              document.head.appendChild(tag);
            }
            tag.setAttribute(attr, value);
          };

          setMeta('meta[name="description"]', "content", descripcion);
          setMeta('meta[property="og:title"]', "content", titulo);
          setMeta('meta[property="og:description"]', "content", descripcion);
          setMeta('meta[property="og:image"]', "content", imagen);
          setMeta('meta[property="og:url"]', "content", window.location.href);
          setMeta('meta[property="og:type"]', "content", "website");
          setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
          setMeta('meta[name="twitter:title"]', "content", titulo);
          setMeta('meta[name="twitter:description"]', "content", descripcion);
          setMeta('meta[name="twitter:image"]', "content", imagen);
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
      {branding.mostrar_boton_web_club !== false && <BackToWebsiteButton />}
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
          limites={cfg.limites}
          pago={cfg.pago}
          plazasOcupadas={plazasOcupadas}
          paymentSuccess={paymentSuccess}
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