import React, { useState } from "react";

// Menores autorizados a salir solos: no se verifican uno a uno, se da la salida a todos de un toque
export default function CampusSalenSolos({ lista, onTodos }) {
  const [busy, setBusy] = useState(false);
  if (!lista.length) return null;
  const run = async () => { setBusy(true); await onTodos(); setBusy(false); };
  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-blue-900">🚶 {lista.length} salen solos (autorizados por su familia)</p>
          <p className="text-xs text-blue-800">No hay que pedir DNI. Pulsa al terminar para dejar constancia de la hora de salida.</p>
        </div>
        <button disabled={busy} onClick={run} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? "Registrando…" : "Dar salida a todos"}</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{lista.map(p => <span key={p.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-900">{p.nombre}</span>)}</div>
    </div>
  );
}