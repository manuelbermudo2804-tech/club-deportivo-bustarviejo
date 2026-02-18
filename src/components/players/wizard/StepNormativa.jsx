import React, { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollText, AlertCircle } from "lucide-react";

const NORMATIVA_TEXT = `# 📄 NORMATIVA DE FUNCIONAMIENTO

**Temporada 2026/2027 – Club Deportivo Bustarviejo**

---

## 1️⃣ Naturaleza del club

El Club Deportivo Bustarviejo es una entidad deportiva federada que participa en competiciones oficiales y desarrolla distintas disciplinas deportivas.

La inscripción implica compromiso con el equipo y con el club durante toda la temporada.

---

## 2️⃣ Participación, compromiso y seguimiento

El club tiene un objetivo claro:
**queremos que todos los jugadores participen, jueguen y disfruten del deporte.**

Especialmente en etapas formativas, fomentamos que todos tengan oportunidades reales de participación en competición.

A nivel de deportividad, todos los miembros del club deben recordar que representan al Club Deportivo Bustarviejo y al pueblo en cada entrenamiento y en cada partido.
Faltar a un partido sin causa justificada no solo afecta al propio equipo, sino también a los compañeros, al rival y al equipo arbitral, que realizan un esfuerzo para acudir y cumplir con la competición.

Para que esto sea posible, exigimos compromiso y responsabilidad:

• La asistencia regular a entrenamientos es obligatoria.
• La asistencia a partidos convocados es obligatoria salvo causa justificada.
• Las ausencias deben comunicarse con antelación suficiente al entrenador.

No presentarse a un entrenamiento o partido sin aviso previo afecta al grupo y podrá tener consecuencias deportivas.

La asistencia y la actitud se registran automáticamente en cada entrenamiento por parte de los entrenadores.

Estos registros forman parte del seguimiento deportivo del jugador y podrán influir en convocatorias y tiempo de juego.

Las familias que lo soliciten podrán recibir información sobre el seguimiento registrado.

La reiteración de ausencias sin aviso o conductas de falta de compromiso podrá dar lugar a medidas deportivas adoptadas por el cuerpo técnico dentro del marco común del club.

En categorías formativas se promueve una participación equilibrada dentro de un marco de compromiso.
En categorías competitivas, la asistencia y el rendimiento tendrán mayor peso en las decisiones técnicas.

---

## 3️⃣ Normativa económica

La inscripción en el Club Deportivo Bustarviejo es por **temporada completa**.

El club debe afrontar al inicio de la temporada gastos de gran volumen, entre ellos:

• Inscripciones federativas de los equipos
• Fichas de jugadores y entrenadores
• Seguro deportivo obligatorio
• Material deportivo y organización técnica

Estos costes son anuales y se generan al comienzo de la competición.

Por este motivo, **no existen cuotas mensuales**.

El club podrá establecer una cuota única o un sistema de pago fraccionado en varios plazos.
En caso de fraccionamiento, se trata únicamente de una facilidad de pago ofrecida por el club, manteniéndose en todo caso el compromiso por la totalidad de la temporada.

La devolución de recibos generará los gastos bancarios correspondientes.

El impago podrá suponer la suspensión temporal de la actividad deportiva hasta su regularización.

---

## 4️⃣ Equipación

La equipación oficial del club es obligatoria en competición.

Las decisiones relativas a marca o pack responden a criterios organizativos y estructurales del club.

---

## 5️⃣ Aceptación

La inscripción en la app implica la lectura y aceptación íntegra de la presente normativa.`;

export default function StepNormativa({ currentPlayer, setCurrentPlayer, fieldErrors, setFieldErrors }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const threshold = 30;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      if (atBottom) setHasScrolledToBottom(true);
    };
    el.addEventListener("scroll", handleScroll);
    // Check if content is short enough to not need scrolling
    if (el.scrollHeight <= el.clientHeight + 30) setHasScrolledToBottom(true);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const accepted = currentPlayer.acepta_normativa === true;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-orange-600" />
        Normativa de Funcionamiento
      </h3>
      <p className="text-sm text-slate-600">
        Es obligatorio leer la normativa completa y aceptarla para continuar con la inscripción.
      </p>

      {/* Scrollable normativa box */}
      <div
        ref={scrollRef}
        className="bg-white border-2 border-slate-300 rounded-xl p-4 text-sm text-slate-800 max-h-[350px] overflow-y-auto leading-relaxed whitespace-pre-line space-y-1"
      >
        {NORMATIVA_TEXT.split("\n").map((line, i) => {
          if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-extrabold text-slate-900 mt-2">{line.replace("# ", "")}</h2>;
          if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold text-slate-900 mt-4 mb-1">{line.replace("## ", "")}</h3>;
          if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-slate-900">{line.replace(/\*\*/g, "")}</p>;
          if (line === "---") return <hr key={i} className="my-3 border-slate-200" />;
          if (line.startsWith("•")) return <p key={i} className="pl-4">{line}</p>;
          if (line.trim() === "") return <div key={i} className="h-2" />;
          // Handle inline bold
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={i}>
              {parts.map((part, j) =>
                part.startsWith("**") && part.endsWith("**")
                  ? <strong key={j}>{part.replace(/\*\*/g, "")}</strong>
                  : part
              )}
            </p>
          );
        })}
      </div>

      {!hasScrolledToBottom && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Desplázate hasta el final del texto para poder aceptar.</span>
        </div>
      )}

      {/* Acceptance checkbox */}
      <div className={`border-2 rounded-xl p-4 ${fieldErrors?.acepta_normativa ? 'border-red-500 bg-red-50' : accepted ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
        <div className="flex items-start gap-3">
          <Checkbox
            id="wiz-normativa"
            checked={accepted}
            disabled={!hasScrolledToBottom}
            onCheckedChange={(c) => {
              setCurrentPlayer(prev => ({ ...prev, acepta_normativa: c }));
              if (fieldErrors?.acepta_normativa) setFieldErrors(prev => ({ ...prev, acepta_normativa: null }));
            }}
          />
          <label
            htmlFor="wiz-normativa"
            className={`text-sm font-semibold cursor-pointer ${!hasScrolledToBottom ? 'text-slate-400' : fieldErrors?.acepta_normativa ? 'text-red-600' : 'text-slate-900'}`}
          >
            ✅ HE LEÍDO Y ACEPTO LA NORMATIVA DE FUNCIONAMIENTO DEL CLUB
            {fieldErrors?.acepta_normativa && <span className="block text-xs text-red-500 mt-1">⚠️ Debes aceptar la normativa</span>}
          </label>
        </div>
      </div>
    </div>
  );
}