import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Share2, Copy, Check, UserPlus, Users, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";

const ALL_SHARE_LINKS = [
  {
    id: "inscripcion",
    icon: UserPlus,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "Inscripción de jugadores",
    desc: "Formulario externo para captar nuevos jugadores",
    url: "https://alta-socio.vercel.app/jugadores.html",
    whatsappText: "📋 Formulario de Inscripción - CD Bustarviejo",
  },
  {
    id: "socios",
    icon: Users,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "Hacerse socio del club",
    desc: "Página web para nuevos socios",
    url: "https://alta-socio.vercel.app/socios.html",
    whatsappText: "🤝 Hazte Socio del CD Bustarviejo",
  },
  {
    id: "presentacion",
    icon: Monitor,
    color: "text-purple-600",
    bg: "bg-purple-50",
    label: "Presentación para familias",
    desc: "Presentación con toda la info del club y la app",
    getUrl: () => `${window.location.origin}/FamilyPresentation`,
    whatsappText: "📱 Presentación del CD Bustarviejo para familias",
  },
  {
    id: "acceso",
    icon: Smartphone,
    color: "text-orange-600",
    bg: "bg-orange-50",
    label: "Solicitar acceso a la app",
    desc: "Para que nuevas familias pidan su código de acceso",
    getUrl: () => `${window.location.origin}/SolicitarAcceso`,
    whatsappText: "📲 Solicita tu acceso a la App del CD Bustarviejo",
  },
];

function LinkCard({ link }) {
  const [copied, setCopied] = useState(false);
  const url = link.url || link.getUrl();
  const Icon = link.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const message = `${link.whatsappText}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className={`${link.bg} rounded-xl p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${link.color} flex-shrink-0`} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{link.label}</p>
          <p className="text-xs text-slate-500">{link.desc}</p>
        </div>
      </div>
      <div className="bg-white/70 rounded-lg px-2.5 py-1.5">
        <p className="text-xs text-slate-600 break-all font-mono leading-relaxed">{url}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1 gap-1.5 h-8 text-xs">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button onClick={handleWhatsApp} size="sm" className="flex-1 gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </Button>
      </div>
    </div>
  );
}

export default function ShareFormButton() {
  const [open, setOpen] = useState(false);
  const links = ALL_SHARE_LINKS;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-1 border-blue-500 text-blue-700 hover:bg-blue-50 h-8 px-2.5 text-xs"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Compartir</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <div className="space-y-3 p-2">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Share2 className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Compartir enlaces</h2>
              <p className="text-xs text-slate-500 mt-1">Envía estos enlaces a familias y jugadores</p>
            </div>

            {links.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}