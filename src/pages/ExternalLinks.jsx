import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Copy, Check, Globe, Users, CreditCard, Trophy, Megaphone, QrCode, Target, Handshake, Sparkles, ArrowRight, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PropuestaGenerator from "@/components/external-links/PropuestaGenerator";

const getBaseUrl = () => {
  const url = window.location.origin;
  // En preview usar la URL actual, en producción usar el dominio real
  return url;
};

const EXTERNAL_PAGES = [
  {
    id: "member-card",
    nombre: "Carnet de Socio Público",
    descripcion: "Página pública donde los socios pueden ver su carnet digital con descuentos. Requiere token en la URL.",
    path: "/PublicMemberCard",
    icon: CreditCard,
    color: "bg-blue-500",
    nota: "Necesita ?token=... en la URL para funcionar",
  },
  {
    id: "family-presentation",
    nombre: "Presentación para Familias",
    descripcion: "Presentación interactiva con slides sobre el club, la app y el proceso de inscripción.",
    path: "/FamilyPresentation",
    icon: Users,
    color: "bg-green-500",
  },
  {
    id: "access-request",
    nombre: "Solicitar Acceso",
    descripcion: "Formulario público para que nuevas familias soliciten un código de acceso a la app.",
    path: "/SolicitarAcceso",
    icon: Globe,
    color: "bg-orange-500",
  },
  {
    id: "instalar-app",
    nombre: "Cómo instalar la app",
    descripcion: "Página pública con los pasos para instalar la app en iPhone y Android. Ideal para compartir por WhatsApp con las familias.",
    path: "/InstalarApp",
    icon: Smartphone,
    color: "bg-cyan-500",
  },
  {
    id: "sponsors",
    nombre: "Patrocinadores",
    descripcion: "Landing page pública con información de patrocinio, paquetes disponibles y formulario de interés. Incluye campaña de Torneos (Pádel + Fútbol Sala) que se activa desde Configuración de Temporada.",
    path: "/Patrocinadores",
    icon: Megaphone,
    color: "bg-purple-500",
    nota: "Activa la campaña de torneos y edita fechas/plazas ocupadas en: Gestión de Temporada → Patrocinios de Torneos",
  },
  {
    id: "san-isidro",
    nombre: "Inscripción San Isidro 2026",
    descripcion: "Formulario de inscripción para los torneos de las fiestas de San Isidro (Fútbol Chapa y 3 para 3).",
    path: "/SanIsidro",
    icon: Trophy,
    color: "bg-red-500",
    nota: "Abierta del 19 abril al 15 mayo 2026",
  },
  {
    id: "porra",
    nombre: "Porra Mundial 2026",
    descripcion: "Landing pública de la Porra del Mundial 2026. Apunta tu equipo, paga la inscripción y compite por el bote.",
    path: "/Porra",
    icon: Target,
    color: "bg-yellow-500",
  },
  {
    id: "colabora",
    nombre: "Colabora (Pago Online)",
    descripcion: "Página pública para que comercios colaboren: eligen importe, suben su logo y pagan con tarjeta en 1 minuto. El registro queda pendiente de tu aprobación.",
    path: "/Colabora",
    icon: Handshake,
    color: "bg-emerald-500",
    nota: "Compártela por WhatsApp para captar comercios fácilmente",
  },
  {
    id: "propuesta-gvc",
    nombre: "Propuesta GVC Gaesco",
    descripcion: "Propuesta de patrocinio personalizable. Por defecto se renderiza para GVC Gaesco — usa el generador de abajo para crear versiones para otras empresas.",
    path: "/PropuestaGVCGaesco",
    icon: Handshake,
    color: "bg-rose-500",
    nota: "Personalizable con ?empresa=X&logo=URL",
  },
];

function LinkCard({ page }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${getBaseUrl()}${page.path}`;
  const Icon = page.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("URL copiada al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(fullUrl, "_blank");
  };

  const handleWhatsApp = () => {
    const text = page.id === "colabora"
      ? `⚽ ¡Apoya al CD Bustarviejo y dale visibilidad a tu negocio! 💪\n\nCon tu colaboración ayudas al deporte base del pueblo y tu comercio aparece en nuestra web, app y redes sociales. 🟠🟢\n\n✅ Eliges el importe\n✅ Subes tu logo y el enlace a tu página web\n✅ Pagas online en 1 minuto — rápido y sencillo\n\n👉 ${fullUrl}\n\n¡Gracias por ser parte del club! 🙌`
      : `${page.nombre} — CD Bustarviejo: ${fullUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className={`${page.color} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-base">{page.nombre}</h3>
          <p className="text-sm text-slate-500 mt-1">{page.descripcion}</p>
          {page.nota && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mt-2 inline-block">
              ⚠️ {page.nota}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 bg-slate-50 rounded-lg px-3 py-2">
            <code className="text-xs text-slate-600 truncate flex-1">{page.path}</code>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiada" : "Copiar URL"}
        </Button>
        <Button size="sm" className="flex-1 gap-2 bg-slate-800 hover:bg-slate-700" onClick={handleOpen}>
          <ExternalLink className="w-4 h-4" />
          Abrir
        </Button>
        <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={handleWhatsApp}>
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ExternalLinks() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-md sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14">
            <ExternalLink className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300 sm:text-xs">Acceso público y difusión</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Páginas externas</h1>
            <p className="mt-1 text-sm text-slate-300">Enlaces públicos de la aplicación, listos para abrir, copiar y compartir</p>
          </div>
        </div>
      </div>

      {/* CTA — Constructor de páginas */}
      <button
        onClick={() => navigate("/PageBuilder")}
        className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-4 text-left text-white shadow-md transition-shadow hover:shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-start gap-3 sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-400/30 sm:h-14 sm:w-14">
            <Sparkles className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex rounded-full bg-orange-500/15 px-2 py-1 text-[10px] font-bold tracking-wider text-orange-300">HERRAMIENTA</div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">Constructor de páginas</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">Crea páginas públicas con formularios, enlaces únicos y gestión de inscritos.</p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-orange-300 transition-transform group-hover:translate-x-1 sm:mt-0 sm:h-6 sm:w-6" />
        </div>
      </button>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Páginas fijas del sistema</h2>
            <p className="text-sm text-slate-500">Accesos directos a las páginas que puedes compartir sin iniciar sesión.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{EXTERNAL_PAGES.length} enlaces disponibles</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EXTERNAL_PAGES.map((page) => (
            <LinkCard key={page.id} page={page} />
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-900">Generador de propuestas</h2>
          <p className="mt-1 text-sm text-slate-500">Prepara textos para compartir las páginas con familias y contactos.</p>
        </div>
        <div className="border-t border-slate-100 p-3 sm:p-5">
          <PropuestaGenerator />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-relaxed text-slate-700">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <p><strong className="text-slate-900">Consejo:</strong> estas páginas son públicas. Antes de compartir un enlace, comprueba que corresponde al formulario o trámite adecuado; el enlace de «Solicitar acceso» es útil para nuevas familias.</p>
      </div>
    </div>
  );
}