import React, { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollText, AlertCircle, Shield, Users, Scale, ChevronRight } from "lucide-react";
import { DERECHOS_TEXT, DEBERES_TEXT, PADRES_TEXT, DISCIPLINA_TEXT } from "./reglamentoTexts";

const SECTIONS = [
  { id: "derechos", label: "Derechos y Deberes del Jugador", icon: Shield, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", texts: [DERECHOS_TEXT, DEBERES_TEXT] },
  { id: "padres", label: "Obligaciones de Padres/Tutores", icon: Users, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", texts: [PADRES_TEXT] },
  { id: "disciplina", label: "Régimen Disciplinario", icon: Scale, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", texts: [DISCIPLINA_TEXT] },
];

function SectionContent({ texts }) {
  return (
    <div className="space-y-1">
      {texts.map((text, ti) => (
        <div key={ti}>
          {ti > 0 && <hr className="my-4 border-slate-200" />}
          {text.split("\n").map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} className="h-2" />;
            if (trimmed.startsWith("ARTÍCULO") || trimmed.startsWith("RÉGIMEN")) return <h3 key={i} className="text-base font-bold text-slate-900 mt-4 mb-1">{trimmed}</h3>;
            if (trimmed.startsWith("Son faltas")) return <p key={i} className="font-bold text-slate-800 mt-3 mb-1">{trimmed}</p>;
            if (trimmed.startsWith("Por faltas")) return <p key={i} className="font-bold text-slate-800 mt-3 mb-1">{trimmed}</p>;
            if (trimmed.startsWith("•") || trimmed.startsWith("-")) return <p key={i} className="pl-4 text-slate-700">{trimmed}</p>;
            if (/^\d+\./.test(trimmed)) return <p key={i} className="pl-4 text-slate-700">{trimmed}</p>;
            const parts = trimmed.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={i} className="text-slate-700">
                {parts.map((part, j) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={j} className="text-slate-900">{part.replace(/\*\*/g, "")}</strong>
                    : part
                )}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function StepNormativa({ currentPlayer, setCurrentPlayer, fieldErrors, setFieldErrors }) {
  const [activeSection, setActiveSection] = useState(0);
  const [sectionsRead, setSectionsRead] = useState({ 0: false, 1: false, 2: false });
  const scrollRef = useRef(null);

  // Track scroll to bottom per section
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Reset scroll position when switching sections
    el.scrollTop = 0;

    const checkBottom = () => {
      const threshold = 40;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      if (atBottom) {
        setSectionsRead(prev => ({ ...prev, [activeSection]: true }));
      }
    };

    // Check if content is short enough
    setTimeout(() => {
      if (el.scrollHeight <= el.clientHeight + 40) {
        setSectionsRead(prev => ({ ...prev, [activeSection]: true }));
      }
    }, 100);

    el.addEventListener("scroll", checkBottom);
    return () => el.removeEventListener("scroll", checkBottom);
  }, [activeSection]);

  const allSectionsRead = sectionsRead[0] && sectionsRead[1] && sectionsRead[2];
  const accepted = currentPlayer.acepta_normativa === true;
  const section = SECTIONS[activeSection];
  const Icon = section.icon;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-orange-600" />
        Reglamento de Régimen Interno
      </h3>
      <p className="text-sm text-slate-600">
        Lee las 3 secciones del reglamento completo. Debes desplazarte hasta el final de cada una.
      </p>

      {/* Section tabs */}
      <div className="flex flex-col sm:flex-row gap-2">
        {SECTIONS.map((s, idx) => {
          const SIcon = s.icon;
          const isActive = idx === activeSection;
          const isRead = sectionsRead[idx];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(idx)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border flex-1 text-left
                ${isActive ? `${s.bg} ${s.border} ${s.color} border-2` : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
              `}
            >
              <SIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? s.color : 'text-slate-400'}`} />
              <span className="flex-1 line-clamp-1">{s.label}</span>
              {isRead && <span className="text-green-500 text-xs font-bold">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Active section header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${section.bg} ${section.border} border`}>
        <Icon className={`w-5 h-5 ${section.color}`} />
        <span className={`font-semibold text-sm ${section.color}`}>{section.label}</span>
        {!sectionsRead[activeSection] && (
          <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
            Desplázate hasta el final <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="bg-white border-2 border-slate-300 rounded-xl p-4 text-sm max-h-[320px] overflow-y-auto leading-relaxed"
      >
        <SectionContent texts={section.texts} />
      </div>

      {/* Progress indicator */}
      {!allSectionsRead && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            {!sectionsRead[activeSection]
              ? "Desplázate hasta el final de esta sección para marcarla como leída."
              : `Sección leída ✓ — Te faltan ${Object.values(sectionsRead).filter(v => !v).length} secciones por leer.`
            }
          </span>
        </div>
      )}

      {allSectionsRead && !accepted && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
          <span>✅ Has leído las 3 secciones. Ya puedes aceptar el reglamento.</span>
        </div>
      )}

      {/* Acceptance checkbox */}
      <div className={`border-2 rounded-xl p-4 ${fieldErrors?.acepta_normativa ? 'border-red-500 bg-red-50' : accepted ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
        <div className="flex items-start gap-3">
          <Checkbox
            id="wiz-normativa"
            checked={accepted}
            disabled={!allSectionsRead}
            onCheckedChange={(c) => {
              setCurrentPlayer(prev => ({ ...prev, acepta_normativa: c }));
              if (fieldErrors?.acepta_normativa) setFieldErrors(prev => ({ ...prev, acepta_normativa: null }));
            }}
          />
          <label
            htmlFor="wiz-normativa"
            className={`text-sm font-semibold cursor-pointer ${!allSectionsRead ? 'text-slate-400' : fieldErrors?.acepta_normativa ? 'text-red-600' : 'text-slate-900'}`}
          >
            ✅ HE LEÍDO Y ACEPTO EL REGLAMENTO DE RÉGIMEN INTERNO DEL CD BUSTARVIEJO
            {fieldErrors?.acepta_normativa && <span className="block text-xs text-red-500 mt-1">⚠️ Debes aceptar el reglamento</span>}
            {!allSectionsRead && <span className="block text-xs text-slate-400 mt-1">Debes leer las 3 secciones para poder aceptar</span>}
          </label>
        </div>
      </div>
    </div>
  );
}