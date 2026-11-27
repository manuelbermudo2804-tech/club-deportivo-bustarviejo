import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import CampusAlumnoFila, { estadoDia } from "@/components/campus/CampusAlumnoFila";
import CampusSalidaFiltros from "@/components/campus/CampusSalidaFiltros";

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const dayLabel = d => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" });
const nowTime = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const FILTROS = [["pendiente", "Por llegar"], ["dentro", "En el campus"], ["salido", "Han salido"], ["ausente", "Faltan"], ["todos", "Todos"]];

export default function CampusPasarLista({ roster, records, dates, busy, save }) {
  const [day, setDay] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("pendiente");
  const inputRef = useRef(null);
  useEffect(() => { if (dates.length && !dates.includes(day)) setDay(dates.includes(today()) ? today() : dates[0]); }, [dates]);
  const rec = id => records.find(r => r.participant_id === id && r.fecha === day);
  const counts = useMemo(() => {
    const c = { pendiente: 0, dentro: 0, salido: 0, ausente: 0, todos: roster.length };
    roster.forEach(p => c[estadoDia(records.find(r => r.participant_id === p.id && r.fecha === day))]++);
    return c;
  }, [roster, records, day]);
  const [modo, setModo] = useState("entrada");
  const [salidaTipo, setSalidaTipo] = useState("recogen");
  const salidaCounts = useMemo(() => {
    const c = { solos: 0, recogen: 0, salido: 0 };
    roster.forEach(p => { const e = estadoDia(records.find(r => r.participant_id === p.id && r.fecha === day)); if (e === "salido") c.salido++; else if (e === "dentro") c[p.salida_autonoma ? "solos" : "recogen"]++; });
    return c;
  }, [roster, records, day]);
  const enSalida = p => { const e = estadoDia(rec(p.id)); if (q) return e === "dentro" || e === "salido"; return salidaTipo === "salido" ? e === "salido" : e === "dentro" && (salidaTipo === "solos" ? !!p.salida_autonoma : !p.salida_autonoma); };
  const lista = roster.filter(p => modo === "salida" ? enSalida(p) && (!q || norm(p.nombre).includes(norm(q))) : (q ? norm(p.nombre).includes(norm(q)) : filtro === "todos" || estadoDia(rec(p.id)) === filtro));
  const after = ok => { if (ok && q) { setQ(""); inputRef.current?.focus(); } };
  const llega = async p => { const t = nowTime(); after(await save(p, { estado: "presente", hora_entrada: t }, "asistencia", "Llegada registrada a las " + t, day)); };
  const onEnter = e => { if (modo === "entrada" && e.key === "Enter" && lista.length === 1 && estadoDia(rec(lista[0].id)) === "pendiente") llega(lista[0]); };
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto">{dates.map(d => <button key={d} onClick={() => setDay(d)} className={"shrink-0 rounded-lg px-3 py-2 text-xs font-bold capitalize " + (d === day ? "bg-orange-600 text-white" : "border bg-white text-slate-700")}>{dayLabel(d)}{d === today() ? " · hoy" : ""}</button>)}</div>
      <div className="sticky top-[100px] z-20 space-y-2 rounded-2xl border bg-white/95 p-3 shadow-sm backdrop-blur lg:top-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">{[["entrada", "🌅 Entrada"], ["salida", "🏁 Salida"]].map(([k, l]) => <button key={k} onClick={() => { setModo(k); setQ(""); }} className={"rounded-lg py-2.5 text-sm font-black " + (modo === k ? "bg-white text-slate-900 shadow" : "text-slate-500")}>{l}</button>)}</div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onEnter} placeholder={modo === "salida" ? "Busca al menor que viene a salir…" : "Busca por nombre según vayan llegando…"} autoComplete="off" className="h-12 w-full rounded-xl border-2 border-slate-200 pl-10 pr-10 text-base focus:border-orange-500" />
          {q && <button onClick={() => { setQ(""); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-5 w-5" /></button>}
        </div>
        {modo === "entrada"
          ? <div className="flex gap-1.5 overflow-x-auto">{FILTROS.map(([k, l]) => <button key={k} onClick={() => { setFiltro(k); setQ(""); }} className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-bold " + (!q && filtro === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>{l} · {counts[k]}</button>)}</div>
          : <CampusSalidaFiltros value={q ? "" : salidaTipo} onChange={k => { setSalidaTipo(k); setQ(""); }} counts={salidaCounts} />}
      </div>
      {modo === "entrada" && counts.dentro > 0 && counts.pendiente === 0 && <p className="rounded-xl bg-blue-50 p-2.5 text-xs font-bold text-blue-800">Todos han llegado o están marcados. Quedan {counts.dentro} menores en el campus pendientes de salida.</p>}
      {lista.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">{q ? "Nadie coincide con «" + q + "» en la lista de esta semana." : "No hay menores en este apartado."}</p>
        : <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">{lista.map(p => <CampusAlumnoFila key={p.id} p={p} r={rec(p.id)} busy={busy === p.id} modoSalida={modo === "salida"}
          onLlega={() => llega(p)}
          onFalta={async () => after(await save(p, { estado: "ausente" }, "asistencia", "Marcado ausente", day))}
          onDeshacer={() => save(p, { estado: "pendiente", hora_entrada: "" }, "correccion", "Registro deshecho por el monitor", day)}
          onAutonoma={() => { const t = nowTime(); save(p, { salida_autonoma: true, hora_salida: t }, "salida_autonoma", "Salida autónoma autorizada por la familia a las " + t, day); }}
          onPickup={(person, dni) => { const t = nowTime(); save(p, { estado: "presente", recogida_verificada: true, persona_recoge: person.nombre, dni_recoge: dni, hora_salida: t }, "recogida_verificada", "Recogida verificada por " + person.nombre + " a las " + t, day); }}
        />)}</div>}
    </div>
  );
}