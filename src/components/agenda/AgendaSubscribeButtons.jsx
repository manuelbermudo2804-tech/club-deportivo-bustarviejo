import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus, Smartphone, Copy, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Tres botones pequeños para llevarse la agenda al calendario del móvil.
 * Si hay un equipo filtrado, el enlace sólo trae ese equipo.
 */
export default function AgendaSubscribeButtons({ categoria }) {
  const [copiado, setCopiado] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/functions/calendarioFeed${categoria ? `?cat=${encodeURIComponent(categoria)}` : ""}`;
  const webcal = url.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(url)}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm min-w-0">
      <span className="col-span-2 sm:col-span-1 text-sm font-semibold text-slate-600">Llévatelo a tu calendario</span>
      <a className="min-w-0" href={google} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="outline" className="w-full min-w-0 h-10 px-3 text-sm">
          <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
          Google
        </Button>
      </a>
      <a className="min-w-0" href={webcal}>
        <Button size="sm" variant="outline" className="w-full min-w-0 h-10 px-3 text-sm">
          <Smartphone className="w-3.5 h-3.5 mr-1.5" />
          iPhone
        </Button>
      </a>
      <Button size="sm" variant="outline" onClick={copiar} className="w-full min-w-0 h-10 px-3 text-sm">
        {copiado ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
        Copiar enlace
      </Button>
    </div>
  );
}