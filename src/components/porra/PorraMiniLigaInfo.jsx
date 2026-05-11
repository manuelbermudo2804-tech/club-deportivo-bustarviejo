import React, { useState } from "react";
import { ChevronDown, ChevronUp, Users, Lightbulb } from "lucide-react";

// Desplegable explicativo del código de mini-liga en el formulario de creación
export default function PorraMiniLigaInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border border-purple-200 bg-purple-50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-purple-900 hover:bg-purple-100"
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          ¿Qué es una mini-liga? ¿Cómo funciona?
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-purple-900 leading-relaxed space-y-2">
          <p>
            <Users className="w-3 h-3 inline mr-1" />
            Una <strong>mini-liga</strong> es un grupo privado dentro de la porra grande para competir <strong>solo con tus amigos, familia o compañeros de curro</strong>, además de competir en el ranking global.
          </p>
          <p>
            <strong>¿Cómo se usa?</strong>
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Si <strong>alguien ya creó una mini-liga</strong> (amigo, peña...), pídele su <strong>código de 6 caracteres</strong> y pégalo aquí. Te apuntarás a esa mini-liga al crear tu porra.</li>
            <li>Si <strong>no tienes código todavía</strong>, déjalo en blanco. Una vez creada tu porra, podrás <strong>crear tu propia mini-liga</strong> desde "Mi Porra → Ligas" y compartir tu código por WhatsApp.</li>
            <li>Puedes estar en <strong>varias mini-ligas a la vez</strong>. ¡Tendrás un ranking distinto en cada una!</li>
          </ul>
          <p className="text-[11px] text-purple-700 italic">
            👉 Las mini-ligas no afectan al ranking global ni al bote de premios — son solo para picarse entre amigos.
          </p>
        </div>
      )}
    </div>
  );
}