import React from "react";
import { Check, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Doble check estilo WhatsApp para mensajes propios.
// "Leído" = alguien DISTINTO del autor aparece en leido_por (en grupo el autor
// siempre se incluye a sí mismo, así que no cuenta para el doble check azul).
// En grupos, al pulsar los ticks se ve la lista de quién lo ha leído.
export default function ReadTicks({ message, senderEmail, read, lightOnDark = false }) {
  const leidoPor = message?.leido_por || [];
  const lectores = leidoPor.filter(lp => lp.email && lp.email !== senderEmail);
  const leidoPorOtro = read === true || lectores.length > 0;

  const icon = leidoPorOtro
    ? <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
    : <Check className={`w-3.5 h-3.5 ${lightOnDark ? 'text-white opacity-60' : 'opacity-50'}`} />;

  // Chats 1 a 1 (prop `read`): solo el icono
  if (read !== undefined) return icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex p-0 min-h-0 min-w-0 bg-transparent" aria-label="Ver quién lo ha leído">
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <p className="text-xs font-semibold text-slate-700 mb-2">
          Leído por {lectores.length} {lectores.length === 1 ? "persona" : "personas"}
        </p>
        {lectores.length === 0 ? (
          <p className="text-xs text-slate-500">Todavía no lo ha leído nadie.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto space-y-1.5">
            {lectores.map((lp, i) => (
              <li key={`${lp.email}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-800">{lp.nombre || lp.email}</span>
                {lp.fecha && (
                  <span className="text-slate-400 shrink-0">
                    {new Date(lp.fecha).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}