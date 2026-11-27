import React, { useState } from "react";

const cleanDni = v => String(v || "").replace(/[\s.-]/g, "").toUpperCase();

export default function CampusSalidaPanel({ p, busy, onPickup, onAutonoma, onClose }) {
  const [person, setPerson] = useState(null);
  const [dniMode, setDniMode] = useState(false);
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const confirmDni = () => {
    if (cleanDni(person.dni) !== cleanDni(dni)) {
      setError("⛔ El DNI/NIE no coincide. No entregues al menor y consulta con coordinación.");
      return;
    }
    setError("");
    onPickup(person, cleanDni(dni), true);
  };
  const choose = a => { setPerson(a); setDniMode(false); setDni(""); setError(""); };
  return (
    <div className="mt-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between"><p className="text-sm font-black text-slate-900">Salida de {p.nombre}</p><button onClick={onClose} className="rounded-lg border bg-white px-2 py-1 text-xs">Cerrar</button></div>
      {p.salida_autonoma && <button disabled={busy} onClick={onAutonoma} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-40">🚶 Sale solo (autorizado por la familia)</button>}
      {!person ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-600">Selecciona quién viene a recogerle:</p>
          {(p.autorizado_recogida || []).map((a, i) => <button key={i} onClick={() => choose(a)} className="w-full rounded-xl border bg-white px-3 py-3 text-left text-sm font-bold text-slate-800">{a.nombre} <span className="font-normal text-slate-500">· {a.parentesco || "Autorizado"}</span></button>)}
          {!(p.autorizado_recogida || []).length && !p.salida_autonoma && <p className="rounded-lg bg-red-50 p-2 text-xs font-bold text-red-800">No hay ninguna persona autorizada registrada. Avisa a coordinación antes de entregar al menor.</p>}
        </div>
      ) : !dniMode ? (
        <div className="space-y-2">
          <p className="text-sm font-bold">Recoge: {person.nombre} <span className="font-normal text-slate-500">· {person.parentesco || "Autorizado"}</span></p>
          <button disabled={busy} onClick={() => onPickup(person, "", false)} className="w-full rounded-xl bg-green-600 py-3 text-sm font-black text-white disabled:opacity-40">✓ Confirmar salida</button>
          <button onClick={() => { setDniMode(true); setError(""); }} className="w-full rounded-xl border bg-white py-2.5 text-xs font-bold text-slate-700">No estoy seguro · Comprobar DNI/NIE</button>
          <button onClick={() => choose(null)} className="w-full py-1 text-xs text-orange-700 underline">Cambiar persona</button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold">{person.nombre} · Comprobación de identidad</p>
          <input autoFocus value={dni} onChange={e => setDni(e.target.value)} onKeyDown={e => e.key === "Enter" && dni.trim() && confirmDni()} placeholder="Introduce el DNI / NIE" autoComplete="off" className="h-12 w-full rounded-xl border px-3 text-base uppercase" />
          <button disabled={!dni.trim() || busy} onClick={confirmDni} className="w-full rounded-xl bg-green-600 py-3 text-sm font-black text-white disabled:opacity-40">Verificar y confirmar salida</button>
          <button onClick={() => { setDniMode(false); setDni(""); setError(""); }} className="w-full py-1 text-xs text-orange-700 underline">Volver</button>
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs font-bold text-red-800">{error}</div>}
    </div>
  );
}