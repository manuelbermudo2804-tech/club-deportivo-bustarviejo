import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";

const WEEKS = [{key:"S1",label:"Semana 1"},{key:"S2",label:"Semana 2"},{key:"S3",label:"Semana 3"},{key:"S4",label:"Semana 4"},{key:"S5",label:"Semana 5"}];
const GROUPS = {"6-8":"6–8 años","9-11":"9–11 años","12-16":"12–16 años"};
export default function CampusWaitlistManager({season="2027"}) {
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[filter,setFilter]=useState("todas"),[saving,setSaving]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try { const data=await base44.entities.CampusWaitlistEntry.list("created_date",2000); setRows((data||[]).filter(x=>String(x.temporada||"2027")===String(season))); }
  catch(e){setError(e?.message||"No se ha podido cargar la lista de espera.");}
  finally{setLoading(false);}
 },[season]);
 useEffect(()=>{load();},[load]);
 const ordered=useMemo(()=>{
  const byWeek={};
  rows.filter(r=>r.estado!=="descartado"&&r.estado!=="inscrito").sort((a,b)=>new Date(a.created_date)-new Date(b.created_date)).forEach(r=>{
   byWeek[r.semana]??=[];byWeek[r.semana].push(r);
  });
  return byWeek;
 },[rows]);
 const changeStatus=async(row,status)=>{
  setSaving(row.id);setError("");
  try{await base44.entities.CampusWaitlistEntry.update(row.id,{estado:status});await load();}
  catch(e){setError(e?.message||"No se pudo actualizar el estado.");}
  finally{setSaving("");}
 };
 const visible=rows.filter(r=>filter==="todas"||r.semana===filter);
 return <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Campus {season}</p><h2 className="mt-1 text-2xl font-black text-slate-950">Lista de espera</h2><p className="mt-1 text-sm text-slate-500">{rows.length} solicitudes de menor y semana</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Actualizar</button></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{WEEKS.map(w=><div key={w.key} className="rounded-xl border bg-slate-50 p-3"><div className="text-xs font-bold text-slate-500">{w.label}</div><div className="text-2xl font-black">{(ordered[w.key]||[]).length}</div><div className="text-[11px] text-slate-500">en espera activa</div></div>)}</div>
  <div className="flex flex-wrap gap-2"><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="todas">Todas las semanas</option>{WEEKS.map(w=><option key={w.key} value={w.key}>{w.label}</option>)}</select></div>
  {error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {loading?<p className="py-8 text-center text-sm text-slate-500">Cargando lista de espera…</p>:visible.length===0?<p className="py-8 text-center text-sm text-slate-500">Todavía no hay solicitudes para esta edición.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="p-3">Posición</th><th className="p-3">Semana</th><th className="p-3">Menor</th><th className="p-3">Edad / grupo</th><th className="p-3">Adulto responsable</th><th className="p-3">Teléfono</th><th className="p-3">Estado</th><th className="p-3">Solicitud</th></tr></thead><tbody>{visible.sort((a,b)=>new Date(a.created_date)-new Date(b.created_date)).map(r=>{const active=(ordered[r.semana]||[]);const position=active.findIndex(x=>x.id===r.id)+1;return <tr key={r.id} className="border-b last:border-0"><td className="p-3 font-black">{position||"—"}</td><td className="p-3 font-semibold">{WEEKS.find(w=>w.key===r.semana)?.label||r.semana}</td><td className="p-3 font-bold">{r.menor_nombre}</td><td className="p-3">{r.edad} · {GROUPS[r.grupo_edad]||r.grupo_edad}</td><td className="p-3">{r.adulto_nombre}</td><td className="p-3">{r.adulto_telefono}</td><td className="p-3"><select value={r.estado||"pendiente"} disabled={saving===r.id} onChange={e=>changeStatus(r,e.target.value)} className="rounded-lg border px-2 py-1.5 text-xs"><option value="pendiente">Pendiente</option><option value="contactado">Contactado</option><option value="inscrito">Inscrito</option><option value="descartado">Descartado</option></select></td><td className="p-3 font-mono text-xs">{String(r.solicitud_id||"").slice(0,8)}</td></tr>})}</tbody></table></div>}
  <p className="text-xs text-slate-500">La posición se calcula por orden de llegada dentro de cada semana. Las solicitudes marcadas como inscritas o descartadas dejan de ocupar posición activa. No se reserva ni confirma plaza automáticamente.</p>
 </section>;
}