import React, { useState } from "react";
import { ExternalLink, Copy, Check, Globe, Users, CreditCard, Trophy, Megaphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    id: "sponsors",
    nombre: "Patrocinadores",
    descripcion: "Landing page pública con información de patrocinio, paquetes disponibles y formulario de interés.",
    path: "/Patrocinadores",
    icon: Megaphone,
    color: "bg-purple-500",
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
      </div>
    </div>
  );
}

export default function ExternalLinks() {
  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">🌐 Páginas Externas</h1>
        <p className="text-slate-500 mt-1">
          Todas las páginas públicas de la app que no requieren login. Puedes copiar la URL o abrirlas directamente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {EXTERNAL_PAGES.map((page) => (
          <LinkCard key={page.id} page={page} />
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>💡 Tip:</strong> Estas páginas son accesibles sin iniciar sesión. Compártelas con quien necesites — por ejemplo, el enlace de "Solicitar Acceso" es ideal para enviar a nuevas familias.
        </p>
      </div>
    </div>
  );
}