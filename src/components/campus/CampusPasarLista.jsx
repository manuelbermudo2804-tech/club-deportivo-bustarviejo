import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, CalendarDays } from "lucide-react";
import CampusAlumnoFila, { estadoDia } from "@/components/campus/CampusAlumnoFila";
import CampusSalenSolos from "@/components/campus/CampusSalenSolos";
import CampusSalidaFiltros from "@/components/campus/CampusSalidaFiltros";

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const dayLabel = d => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" });
const nowTime = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const FILTROS_ENTRADA = [["pendiente", "Por llegar"], ["dentro", "Han llegado"], ["ausente", "Faltan"], ["todos", "Todos"]];

export default function CampusPasarLista({ roster, records, dates, busy, save }) {
  const [day, setDay] = useState("");
  const [q, setQ] = useState("");
  const [filtroEntrada, setFiltroEntrada] = useState("pendiente");
  const [filtroSalida, setFiltroSalida] = useState("solos");
  const [modo, setModo] = useState("entrada");
  const inputRef = useRef(null);

  // Al abrir: hoy si es uno de los días del Campus; antes de empezar, el lunes 28.
  // Al cambiar de semana: hoy si pertenece a ella; si no, su primer día (lunes).
  useEffect(() => {
    if (!dates.length) return;
    setDay(current => dates.includes(current) ? current : dates.includes(today()) ? today() : dates[0]);
  }, [dates]);

  const rec = id => records.find(r => r.participant_id === id && r.fecha === day);
  const counts = useMemo(() => {
    const c = { pendiente: 0, dentro: 0, ausente: 0, todos: roster.length };
    roster.forEach(p => {
      const e = estadoDia(records.find(r => r.participant_id === p.id && r.fecha === day));
      if (e === "salido") c.dentro++;
      else c[e]++;
    });
    return c;
  }, [roster, records, day]);

  const salidaLists = useMemo(() => {
    const c = { solos: [], recogen: [], salido: [] };
    roster.forEach(p => {
      const e = estadoDia(records.find(r => r.participant_id === p.id && r.fecha === day));
      if (e === "salido") c.salido.push(p);
      else if (e === "dentro" && p.salida_autonoma) c.solos.push(p);
      else if (e === "dentro") c.recogen.push(p);
    });
    return c;
  }, [roster, records, day]);
  const salidaCounts = { solos: salidaLists.solos.length, recogen: salidaLists.recogen.length, salido: salidaLists.salido.length };
  const darSalidaTodos = async () => {
    const pendientes = salidaLists.solos;
    const t = nowTime();
    for (const p of pendientes) {
      const ok = await save(p, { salida_autonoma: true, hora_salida: t }, "salida_autonoma", "Salida autónoma autorizada por la familia a las " + t, day);
      if (!ok) return false;
    }
    return true;
  };

  const lista = roster.filter(p => {
    const e = estadoDia(rec(p.id));
    const matchesSearch = !q || norm(p.nombre).includes(norm(q));
    if (!matchesSearch) return false;
    // Una búsqueda por nombre debe encontrar al menor aunque esté en otro filtro.
    if (q) return true;
    if (modo === "entrada") return filtroEntrada === "todos" || e === filtroEntrada || (filtroEntrada === "dentro" && e === "salido");
    if (filtroSalida === "salido") return e === "salido";
    if (filtroSalida === "solos") return e === "dentro" && !!p.salida_autonoma;
    return e === "dentro" && !p.salida_autonoma;
  });

  const after = ok => { if (ok && q) { setQ(""); inputRef.current?.focus(); } };
  const llega = async p => {
    const t = nowTime();
    after(await save(p, { estado: "presente", hora_entrada: t }, "asistencia", "Llegada registrada a las " + t, day));
  };
  const onEnter = e => {
    if (modo === "entrada" && e.key === "Enter" && lista.length === 1 && estadoDia(rec(lista[0].id)) === "pendiente") llega(lista[0]);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white p-2 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <CalendarDays className="h-4 w-4 text-orange-600" /> Día de control
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {dates.map(d => (
            <button key={d} onClick={() => { setDay(d); setQ(""); }}
              className={"shrink-0 rounded-lg px-3 py-2.5 text-xs font-bold capitalize " + (d === day ? "bg-orange-600 text-white shadow-sm" : "border bg-slate-50 text-slate-700")}>
              {new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" })}
              {d === today() ? " · hoy" : ""}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] capitalize text-slate-500">{day ? dayLabel(day) : "Selecciona un día"}</p>
      </div>

      <div className="sticky top-[100px] z-20 space-y-2 rounded-2xl border bg-white/95 p-3 shadow-sm backdrop-blur lg:top-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {[["entrada", "🌅 Entrada"], ["salida", "🏁 Salida"]].map(([k, label]) => (
            <button key={k} onClick={() => { setModo(k); setQ(""); }}
              className={"rounded-lg py-3 text-sm font-black " + (modo === k ? "bg-white text-slate-900 shadow" : "text-slate-500")}>{label}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onEnter}
            placeholder="Buscar menor por nombre…" autoComplete="off"
            className="h-12 w-full rounded-xl border-2 border-slate-200 pl-10 pr-10 text-base focus:border-orange-500" />
          {q && <button onClick={() => { setQ(""); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-5 w-5" /></button>}
        </div>
        {modo === "entrada" ? (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {FILTROS_ENTRADA.map(([k, label]) => (
              <button key={k} onClick={() => { setFiltroEntrada(k); setQ(""); }}
                className={"rounded-xl px-2 py-2 text-xs font-bold " + (!q && filtroEntrada === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>
                <span className="block text-lg font-black">{counts[k]}</span>{label}
              </button>
            ))}
          </div>
        ) : (
          <CampusSalidaFiltros value={filtroSalida} onChange={k => { setFiltroSalida(k); setQ(""); }} counts={salidaCounts} />
        )}
      </div>

      {modo === "salida" && filtroSalida === "solos" &&
        <CampusSalenSolos lista={lista} onTodos={darSalidaTodos} />}
      {modo === "entrada" && counts.pendiente === 0 && roster.length > 0 &&
        <p className="rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-800">Todos están registrados: ya han llegado, faltan o tienen su asistencia anotada.</p>}
      {modo === "salida" && filtroSalida === "recogen" &&
        <p className="rounded-xl bg-orange-50 p-3 text-xs font-semibold text-orange-900">Estos menores deben salir con una persona autorizada. Selecciona quién viene a recogerlo y verifica su DNI/NIE antes de entregarlo.</p>}

      {lista.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">{q ? "Nadie coincide con «" + q + "»." : "No hay menores en este apartado."}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {lista.map(p => (
            <CampusAlumnoFila key={p.id} p={p} r={rec(p.id)} busy={busy === p.id} modoSalida={modo === "salida"}
              onLlega={() => llega(p)}
              onFalta={async () => after(await save(p, { estado: "ausente" }, "asistencia", "Marcado ausente", day))}
              onDeshacer={() => save(p, { estado: "pendiente", hora_entrada: "", hora_salida: "", persona_recoge: "", dni_recoge: "", recogida_verificada: false }, "correccion", "Registro del día reiniciado por el monitor", day)}
              onAutonoma={() => {
                const t = nowTime();
                save(p, { salida_autonoma: true, hora_salida: t }, "salida_autonoma", "Salida autónoma autorizada por la familia a las " + t, day);
              }}
              onPickup={(person, dni, dniComprobado) => {
                const t = nowTime();
                const patch = { estado: "presente", persona_recoge: person.nombre, hora_salida: t };
                if (dniComprobado) {
                  patch.recogida_verificada = true;
                  patch.dni_recoge = dni;
                } else {
                  patch.recogida_autorizada = true;
                }
                save(p, patch, dniComprobado ? "recogida_verificada" : "recogida_autorizada", (dniComprobado ? "Identidad comprobada por DNI de " : "Persona autorizada seleccionada: ") + person.nombre + " a las " + t, day);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
