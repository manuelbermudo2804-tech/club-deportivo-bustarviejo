import React, { useState } from "react";

const cleanDni = v => String(v || "").replace(/[\s.-]/g, "").toUpperCase();

export default function CampusSalidaPanel({ p, busy, onPickup, onAutonoma, onClose }) {
  const [person, setPerson] = useState(null);
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const confirm = () => {
    if (cleanDni(person.dni) !== cleanDni(dni)) { setError("⛔ NO AUTORIZADO: el DNI/NIE no coincide con el de " + person.nombre + ". No entregues al menor."); return; }
    setError(""); onPickup(person, cleanDni(dni));
  };
  return (
    <div className="mt-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between"><p className="text-sm font-black text-slate-900">Salida de {p.nombre}</p><button onClick={onClose} className="rounded-lg border bg-white px-2 py-1 text-xs">Cerrar</button></div>
      {p.salida_autonoma && <button disabled={busy} onClick={onAutonoma} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-40">🚶 Sale solo (autorizado por la familia)</button>}
      {!person ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">¿Quién viene a recogerlo?</p>
          {(p.autorizado_recogida || []).map((a, i) => <button key={i} onClick={() => setPerson(a)} className="w-full rounded-xl border bg-white px-3 py-3 text-left text-sm font-bold text-slate-800">{a.nombre} <span className="font-normal text-slate-500">· {a.parentesco || "Autorizado"}</span></button>)}
          {!(p.autorizado_recogida || []).length && !p.salida_autonoma && <p className="rounded-lg bg-red-50 p-2 text-xs font-bold text-red-800">No hay ninguna persona autorizada registrada. Avisa a coordinación antes de entregar al menor.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold">{person.nombre} <button onClick={() => { setPerson(null); setDni(""); setError(""); }} className="ml-1 text-xs text-orange-700 underline">Cambiar</button></p>
          <input autoFocus value={dni} onChange={e => setDni(e.target.value)} onKeyDown={e => e.key === "Enter" && dni.trim() && confirm()} placeholder="Pide y escribe su DNI / NIE" autoComplete="off" className="h-12 w-full rounded-xl border px-3 text-base uppercase" />
          <button disabled={!dni.trim() || busy} onClick={confirm} className="w-full rounded-xl bg-green-600 py-3 text-sm font-black text-white disabled:opacity-40">Verificar y entregar</button>
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-bold text-red-800">{error}</div>}
    </div>
  );
}