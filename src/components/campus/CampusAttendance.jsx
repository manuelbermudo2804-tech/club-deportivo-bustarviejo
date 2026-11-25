import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Clock3, LogIn, LogOut, ShieldCheck, RefreshCw } from "lucide-react";

const WEEKS = [{key:"S1",label:"Semana 1"},{key:"S2",label:"Semana 2"},{key:"S3",label:"Semana 3"},{key:"S4",label:"Semana 4"},{key:"S5",label:"Semana 5"}];
const localDate = (d) => { const x = new Date(d); return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const today = () => localDate(new Date());
const nowTime = () => new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",hour12:false});
const dayForWeek = (start, weekIndex, dayIndex=0) => {
  if (!start) return today();
  const d = new Date(start+"T12:00:00"); d.setDate(d.getDate()+weekIndex*7+dayIndex); return localDate(d);
};

export default function CampusAttendance({ season, participants, registrations, settings }) {
  const [week,setWeek] = useState("S1");
  const [date,setDate] = useState(()=>dayForWeek(settings?.fecha_inicio,0));
  const [records,setRecords] = useState([]);
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(false);
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  useEffect(()=>{ base44.auth.me().then(setUser).catch(()=>{}); },[]);
  const roster = useMemo(()=>participants.filter(p=>(p.semanas_ocupadas||[]).includes(week)).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es")),[participants,week]);
  const load = async () => {
    setLoading(true); setError("");
    try { const rows = await base44.entities.CampusAttendance.filter({temporada:String(season),fecha:date}, "-updated_date", 1000); setRecords(rows||[]); }
    catch(e) { setError(e?.message||"No se pudo cargar la asistencia."); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[season,date]);
  const registrationFor = (p) => registrations.find(r=>r.id===p.registration_id);
  const recordFor = (p) => records.find(r=>r.participant_id===p.id);
  const audit = (old, action, detail) => [...(old?.historial||[]),{accion:action,detalle:detail,usuario:user?.full_name||user?.email||"Usuario del club",fecha_hora:new Date().toISOString()}];
  const save = async (p, patch, action, detail) => {
    const key=p.id; setBusy(key); setError(""); setNotice("");
    try {
      const old=recordFor(p);
      const payload={temporada:String(season),participant_id:p.id,registration_id:p.registration_id,semana:week,fecha:date,estado:old?.estado||"pendiente",...patch,historial:audit(old,action,detail),actualizado_por:user?.full_name||user?.email||"Usuario del club",actualizado_en:new Date().toISOString()};
      if(old?.id) await base44.entities.CampusAttendance.update(old.id,payload);
      else await base44.entities.CampusAttendance.create(payload);
      await load(); setNotice("Registro guardado: "+p.nombre);
    } catch(e) { setError(e?.message||"No se pudo guardar el registro."); }
    finally { setBusy(""); }
  };
  const markPickup = async (p) => {
    const name=window.prompt("Nombre y apellidos de la persona que recoge a "+p.nombre+":");
    if(!name?.trim()) return;
    const dni=window.prompt("DNI/NIE de la persona que recoge:");
    if(!dni?.trim()) return;
    const guardian=registrationFor(p);\n    const normalizedDni=(value)=>String(value||"").replace(/[\\s-]/g,"").toUpperCase();\n    const authorized=(p.autorizados_recogida||[]).some(a=>String(a.nombre||"").trim().toLocaleLowerCase("es")===name.trim().toLocaleLowerCase("es") && normalizedDni(a.dni)===normalizedDni(dni)) || (String(guardian?.adulto_nombre||"").trim().toLocaleLowerCase("es")===name.trim().toLocaleLowerCase("es") && normalizedDni(guardian?.adulto_dni)===normalizedDni(dni));
    if(!authorized) { setError("RECOGIDA NO VERIFICADA. El nombre y DNI no coinciden con una persona autorizada. No entregues al menor sin comprobarlo con el responsable legal."); return; }
    await save(p,{persona_recoge:name.trim(),dni_recoge:dni.trim().toUpperCase(),recogida_verificada:true,hora_salida:nowTime(),estado:"presente"},"recogida_verificada","Recogida autorizada por "+name.trim()+" a las "+nowTime());
  };
  return <section className="space-y-5">
    <div className="rounded-3xl border bg-white p-5 md:p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Operativa diaria</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Control de asistencia del Campus</h2>
      <p className="mt-1 text-sm text-slate-600">Selecciona semana y fecha. Solo aparecen los menores inscritos en esa semana.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">Semana<select value={week} onChange={e=>{setWeek(e.target.value);setDate(dayForWeek(settings?.fecha_inicio,WEEKS.findIndex(w=>w.key===e.target.value)));}} className="mt-1 w-full rounded-xl border p-3 bg-white">{WEEKS.map(w=><option key={w.key} value={w.key}>{w.label}</option>)}</select></label>
        <label className="text-sm font-bold">Día de control<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
        <div className="rounded-xl bg-slate-950 p-3 text-white"><div className="text-xs text-slate-300">Menores de esta semana</div><div className="text-3xl font-black">{roster.length}</div><div className="text-xs text-slate-300">{records.filter(r=>r.estado==="presente").length} presentes · {records.filter(r=>r.estado==="ausente").length} ausentes</div></div>
      </div>
    </div>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice&&<div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{date} · {roster.length} menores</p><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4"/>Actualizar</button></div>
    {loading?<p className="p-8 text-center text-slate-500">Cargando…</p>:roster.length===0?<p className="rounded-2xl bg-white p-8 text-center text-slate-500">No hay menores inscritos en esta semana.</p>:<div className="space-y-3">{roster.map(p=>{
      const r=recordFor(p), reg=registrationFor(p), auth=p.autorizados_recogida||[];
      return <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-black text-lg text-slate-950">{p.nombre}</h3><p className="text-xs text-slate-500">{reg?.adulto_nombre||"Responsable no indicado"} · {reg?.adulto_telefono||"Sin teléfono"}</p></div><span className={"rounded-full px-3 py-1 text-xs font-black "+(r?.estado==="presente"?"bg-green-100 text-green-800":r?.estado==="ausente"?"bg-red-100 text-red-800":"bg-amber-100 text-amber-800")}>{r?.estado||"Pendiente"}</span></div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={busy===p.id} onClick={()=>save(p,{estado:"presente"},"asistencia","Marcado presente")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Presente</button>
          <button disabled={busy===p.id} onClick={()=>save(p,{estado:"ausente"},"asistencia","Marcado ausente")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Ausente</button>
          <button disabled={busy===p.id} onClick={()=>save(p,{hora_entrada:nowTime(),estado:"presente"},"entrada","Entrada registrada a las "+nowTime())} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><LogIn className="h-4 w-4"/>Entrada</button>
          <button disabled={busy===p.id||!!r?.recogida_verificada} onClick={()=>markPickup(p)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-40"><LogOut className="h-4 w-4"/>Registrar salida y recogida</button>
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-2"><Clock3 className="mr-1 inline h-4 w-4"/>Entrada: <b>{r?.hora_entrada||"—"}</b> · Salida: <b>{r?.hora_salida||"—"}</b></div><div className="rounded-lg bg-slate-50 p-2"><ShieldCheck className="mr-1 inline h-4 w-4"/>Recogida: <b>{r?.recogida_verificada?"Verificada":"Pendiente"}</b>{r?.persona_recoge?" · "+r.persona_recoge:""}</div></div>
        <details className="mt-3 rounded-lg border p-3"><summary className="cursor-pointer text-sm font-bold">Personas autorizadas ({auth.length})</summary>{auth.length?<ul className="mt-2 space-y-1 text-xs">{auth.map((a,i)=><li key={i}>{a.nombre} · DNI {a.dni} · {a.telefono||"Sin teléfono"}</li>)}</ul>:<p className="mt-2 text-xs text-red-700">No hay personas adicionales registradas. Confirma con el responsable legal antes de entregar.</p>}<button disabled={busy===p.id||(!auth.length&&!registrationFor(p)?.adulto_dni)} onClick={()=>markPickup(p)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4"/>Verificar persona y registrar recogida</button></details>
        {r?.historial?.length>0&&<details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-slate-600">Historial de cambios ({r.historial.length})</summary><ul className="mt-2 space-y-1">{[...r.historial].reverse().map((h,i)=><li key={i} className="border-l-2 border-orange-300 pl-2">{new Date(h.fecha_hora).toLocaleString("es-ES")} · {h.usuario} · {h.detalle}</li>)}</ul></details>}
      </article>;
    })}</div>}
  </section>;
}
