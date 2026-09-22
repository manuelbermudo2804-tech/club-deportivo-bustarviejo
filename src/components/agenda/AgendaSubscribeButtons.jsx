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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-500 mr-0.5">Llévatelo a tu calendario:</span>
      <a href={google} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
          Google
        </Button>
      </a>
      <a href={webcal}>
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <Smartphone className="w-3.5 h-3.5 mr-1.5" />
          iPhone
        </Button>
      </a>
      <Button size="sm" variant="outline" onClick={copiar} className="h-8 text-xs">
        {copiado ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
        Copiar enlace
      </Button>
    </div>
  );
}