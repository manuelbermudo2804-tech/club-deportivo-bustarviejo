import React, { useMemo } from "react";

// Renderiza los datos de una LandingSubmission de forma legible:
// - Usa las etiquetas reales del formulario (en vez de IDs internos).
// - Agrupa los sub-campos de los campos "lista_jugadores" en bloques por jugador.
// - Omite los campos técnicos (_count) y los duplicados con la cabecera (nombre/email/teléfono).
export default function SubmissionDataView({ datos, campos }) {
  const { camposSimples, listas } = useMemo(() => buildSchema(campos), [campos]);

  if (!datos || Object.keys(datos).length === 0) {
    return <p className="text-sm text-slate-400 italic">Sin datos.</p>;
  }

  const HIDDEN = new Set(["nombre", "email", "telefono", "responsable", "nombre_equipo"]);

  // 1) Campos simples (excluyendo sub-campos de listas, que se renderizan aparte)
  const filasSimples = [];
  Object.entries(datos).forEach(([key, value]) => {
    if (HIDDEN.has(key)) return;
    if (key.endsWith("_count")) return;
    // Sub-campos de listas tienen formato {listaId}__{idx}__{subId}
    if (key.includes("__")) return;

    const meta = camposSimples[key];
    const label = meta?.etiqueta || prettifyKey(key);
    filasSimples.push({ key, label, value, tipo: meta?.tipo });
  });

  // 2) Bloques de listas (lista_jugadores)
  const bloquesListas = Object.entries(listas).map(([listaId, lista]) => {
    const count = parseInt(datos[`${listaId}_count`]) || inferCount(datos, listaId);
    const items = [];
    for (let i = 0; i < count; i++) {
      const item = lista.sub_campos.map((sc) => {
        const v = datos[`${listaId}__${i}__${sc.id}`];
        return { label: sc.etiqueta || prettifyKey(sc.id), value: v, tipo: sc.tipo };
      }).filter((x) => x.value !== undefined && x.value !== null && x.value !== "");
      if (item.length > 0) items.push(item);
    }
    return { listaId, etiqueta: lista.etiqueta, count: items.length, items };
  });

  return (
    <div className="space-y-4">
      {filasSimples.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 divide-y divide-slate-200/70">
          {filasSimples.map((f) => (
            <div key={f.key} className="grid grid-cols-3 gap-3 py-2 text-sm first:pt-0 last:pb-0">
              <div className="text-slate-500 col-span-1 break-words">{f.label}</div>
              <div className="text-slate-900 col-span-2 break-words font-medium">
                {renderValue(f.value, f.tipo)}
              </div>
            </div>
          ))}
        </div>
      )}

      {bloquesListas.map((bloque) =>
        bloque.items.length === 0 ? null : (
          <div key={bloque.listaId}>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              👥 {bloque.etiqueta} <span className="text-slate-400 font-normal normal-case">({bloque.items.length})</span>
            </div>
            <div className="space-y-2">
              {bloque.items.map((sub, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-xs font-bold text-orange-600 mb-2">Jugador {i + 1}</div>
                  <div className="divide-y divide-slate-200/70">
                    {sub.map((f, j) => (
                      <div key={j} className="grid grid-cols-3 gap-3 py-1.5 text-sm first:pt-0 last:pb-0">
                        <div className="text-slate-500 col-span-1 break-words">{f.label}</div>
                        <div className="text-slate-900 col-span-2 break-words font-medium">
                          {renderValue(f.value, f.tipo)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function buildSchema(campos) {
  const camposSimples = {};
  const listas = {};
  (campos || []).forEach((c) => {
    if (c.tipo === "lista_jugadores") {
      listas[c.id] = { etiqueta: c.etiqueta || "Jugadores", sub_campos: c.sub_campos || [] };
    } else {
      camposSimples[c.id] = c;
    }
  });
  return { camposSimples, listas };
}

function inferCount(datos, listaId) {
  // Fallback si no existe el _count: deducir del mayor índice presente
  const re = new RegExp(`^${escapeRegExp(listaId)}__(\\d+)__`);
  let max = -1;
  Object.keys(datos).forEach((k) => {
    const m = k.match(re);
    if (m) max = Math.max(max, parseInt(m[1]));
  });
  return max + 1;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function prettifyKey(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function renderValue(v, tipo) {
  if (typeof v === "boolean") return v ? "✅ Sí" : "❌ No";
  if (v === null || v === undefined || v === "") return "—";
  if (tipo === "fecha" && typeof v === "string") {
    try { return new Date(v).toLocaleDateString("es-ES"); } catch { return v; }
  }
  return String(v);
}