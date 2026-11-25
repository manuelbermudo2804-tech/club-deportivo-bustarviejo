import React,{useEffect,useMemo,useState} from "react";
import {base44} from "@/api/base44Client";
import {CheckCircle2,Clock3,LogIn,LogOut,ShieldCheck,RefreshCw,CalendarDays,ChevronLeft} from "lucide-react";

const WEEKS=[{key:"S1",label:"Semana 1"},{key:"S2",label:"Semana 2"},{key:"S3",label:"Semana 3"},{key:"S4",label:"Semana 4"},{key:"S5",label:"Semana 5"}];
const dateForWeek=(start,i)=>{const d=new Date((start||"2027-06-28")+"T12:00:00");d.setDate(d.getDate()+i*7);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const nowTime=()=>new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",hour12:false});
const cleanDni=v=>String(v||"").replace(/[\s.-]/g,"").toUpperCase();
const dayLabel=date=>new Date(date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"2-digit"});
const statusLabel=status=>status==="presente"?"Presente":status==="ausente"?"Ausente":"Pendiente";

export default function CampusAttendance({season,settings}){
 const [week,setWeek]=useState("S1"),[date,setDate]=useState(()=>dateForWeek(settings?.fecha_inicio,0));
 const [dates,setDates]=useState([]),[roster,setRoster]=useState([]),[records,setRecords]=useState([]);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[monitor,setMonitor]=useState("");
 const [selected,setSelected]=useState(null);
 const invoke=async(action,extra={})=>{const res=await base44.functions.invoke("campusAttendanceGateway",{action,temporada:String(season),semana:week,fecha:date,...extra});const data=res?.data||res;if(data?.error)throw new Error(data.error);return data;};
 const load=async()=>{setLoading(true);setError("");try{const d=await invoke("weekRoster");setRoster(d.roster||[]);setRecords(d.records||[]);setDates(d.dates||[]);setMonitor(d.monitor?.nombre||"");if(d.dates?.length&&!d.dates.includes(date))setDate(d.dates[0]);}catch(e){setError(e.message||"No se pudo cargar la asistencia.");setRoster([]);setRecords([]);setDates([]);}finally{setLoading(false);}};
 useEffect(()=>{if(settings?.fecha_inicio){const first=dateForWeek(settings.fecha_inicio,WEEKS.findIndex(x=>x.key===week));setDate(first);}},[settings?.fecha_inicio,season]);
 useEffect(()=>{load();},[season,week]);
 const recordFor=(participantId,day)=>records.find(r=>r.participant_id===participantId&&r.fecha===day);
 const save=async(p,patch,accion,detalle)=>{setBusy(p.id);setError("");setNotice("");try{await invoke("saveAttendance",{fecha:date,participant_id:p.id,patch,audit:{accion,detalle}});await load();setNotice("Registro guardado: "+p.nombre);}catch(e){setError(e.message||"No se pudo guardar.");}finally{setBusy("");}};
 const markPickup=async p=>{const name=window.prompt("Nombre y apellidos de la persona que recoge a "+p.nombre+":");if(!name?.trim())return;const dni=window.prompt("DNI/NIE de la persona que recoge:");if(!dni?.trim())return;
  const authorized=(p.autorizado_recogida||[]).some(a=>a.nombre.trim().toLocaleLowerCase("es")===name.trim().toLocaleLowerCase("es")&&cleanDni(a.dni)===cleanDni(dni))||(p.responsable?.nombre||"").trim().toLocaleLowerCase("es")===name.trim().toLocaleLowerCase("es")&&cleanDni(p.responsable?.dni)===cleanDni(dni);
  if(!authorized){setError("RECOGIDA RECHAZADA: nombre y DNI no coinciden con una persona autorizada. No entregues al menor; consulta al responsable legal.");return;}
  const t=nowTime();await save(p,{estado:"presente",recogida_verificada:true,persona_recoge:name.trim(),dni_recoge:cleanDni(dni),hora_salida:t},"recogida_verificada","Recogida verificada por "+name.trim()+" a las "+t);
 };
 const selectedParticipant=useMemo(()=>roster.find(p=>p.id===selected?.participantId)||null,[roster,selected]);
 const selectedRecord=selectedParticipant&&selected?recordFor(selectedParticipant.id,selected.date):null;
 const presentForDay=day=>records.filter(r=>r.fecha===day&&r.estado==="presente").length;
 const absentForDay=day=>records.filter(r=>r.fecha===day&&r.estado==="ausente").length;
 const chooseWeek=w=>{setWeek(w);setDate(dateForWeek(settings?.fecha_inicio,WEEKS.findIndex(x=>x.key===w)));setSelected(null);};
 const openDay=(p,day)=>{setDate(day);setSelected({participantId:p.id,date:day});setError("");setNotice("");};
 return <section className="space-y-5">
  <div className="rounded-3xl border bg-white p-5 md:p-6 shadow-sm">
   <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Operativa semanal</p>
   <h2 className="mt-1 text-2xl font-black text-slate-950">Control de asistencia del Campus</h2>
   <p className="mt-1 text-sm text-slate-600">Vista semanal de lunes a viernes. Pulsa sobre un día para abrir la ficha del menor.</p>
   <div className="mt-4 flex flex-wrap gap-2">{WEEKS.map(w=><button key={w.key} onClick={()=>chooseWeek(w.key)} className={"rounded-xl px-4 py-2 text-sm font-bold "+(week===w.key?"bg-slate-950 text-white":"border bg-white text-slate-700")}>{w.label}</button>)}</div>
   {monitor&&<p className="mt-3 text-xs text-slate-500">Sesión de {monitor} · Acceso limitado a tus semanas autorizadas</p>}
  </div>
  {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
  {notice&&<div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
  <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-lg">Resumen de la semana</h3><p className="text-xs text-slate-500">{roster.length} menores inscritos en esta semana</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4"/>Actualizar</button></div>
  {loading?<p className="rounded-2xl bg-white p-8 text-center text-slate-500">Cargando semana…</p>:roster.length===0?<p className="rounded-2xl bg-white p-8 text-center text-slate-500">No hay menores en tu lista para esta semana o no tienes permiso asignado.</p>:<>
   <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
    <table className="w-full min-w-[760px] border-collapse text-sm">
     <thead><tr className="bg-slate-950 text-white"><th className="sticky left-0 z-10 bg-slate-950 px-4 py-3 text-left">Participante</th>{dates.map(day=><th key={day} className="px-3 py-3 text-center"><div className="capitalize">{dayLabel(day)}</div><div className="mt-1 text-[10px] font-medium text-slate-300">{presentForDay(day)} presentes · {absentForDay(day)} ausentes</div></th>)}</tr></thead>
     <tbody>{roster.map((p,i)=><React.Fragment key={p.id}>
      <tr className={i%2?"bg-slate-50":"bg-white"}>
       <td className="sticky left-0 z-[1] border-t bg-inherit px-4 py-3 font-bold text-slate-900">{p.nombre}</td>
       {dates.map(day=>{const r=recordFor(p.id,day);const active=selected?.participantId===p.id&&selected?.date===day;return <td key={day} className={"border-t px-2 py-2 text-center "+(active?"bg-orange-50":"")}><button onClick={()=>active?setSelected(null):openDay(p,day)} className={"w-full rounded-xl border px-2 py-2 text-xs font-black transition hover:ring-2 hover:ring-orange-300 "+(active?"border-orange-400 bg-orange-100 text-orange-900":r?.estado==="presente"?"border-green-200 bg-green-50 text-green-800":r?.estado==="ausente"?"border-red-200 bg-red-50 text-red-800":"border-amber-200 bg-amber-50 text-amber-800")}><span className="block">{statusLabel(r?.estado)}</span><span className="mt-1 block text-[10px] font-medium">{r?.hora_entrada||"Sin entrada"}{r?.hora_salida?" · "+r.hora_salida:""}</span></button></td>})}
      </tr>
      {selected?.participantId===p.id&&<tr className="bg-orange-50"><td colSpan={dates.length+1} className="border-y border-orange-200 p-3">
       <div className="rounded-xl border border-orange-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-wider text-orange-600">Ficha rápida · {dayLabel(selected.date)}</p><p className="font-black text-slate-900">{p.nombre} <span className="ml-2 text-xs font-semibold text-slate-500">{statusLabel(recordFor(p.id,selected.date)?.estado)}</span></p></div><button onClick={()=>setSelected(null)} className="rounded-lg border px-2 py-1 text-xs font-bold text-slate-500">Cerrar ×</button></div>
        <div className="mt-2 flex flex-wrap gap-2">
         <button disabled={busy===p.id} onClick={()=>save(p,{estado:"presente"},"asistencia","Marcado presente")} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Presente</button>
         <button disabled={busy===p.id} onClick={()=>save(p,{estado:"ausente"},"asistencia","Marcado ausente")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Ausente</button>
         <button disabled={busy===p.id} onClick={()=>save(p,{hora_entrada:nowTime(),estado:"presente"},"entrada","Entrada registrada a las "+nowTime())} className="rounded-lg border px-3 py-2 text-xs font-bold">Entrada {recordFor(p.id,selected.date)?.hora_entrada||""}</button>
         <button disabled={busy===p.id||!!recordFor(p.id,selected.date)?.recogida_verificada} onClick={()=>markPickup(p)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40">Salida y recogida</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600"><span>Responsable: <b>{p.responsable?.nombre||"No indicado"}</b></span><span>Entrada: <b>{recordFor(p.id,selected.date)?.hora_entrada||"—"}</b></span><span>Salida: <b>{recordFor(p.id,selected.date)?.hora_salida||"—"}</b></span><span>Recogida: <b>{recordFor(p.id,selected.date)?.recogida_verificada?"Verificada":"Pendiente"}</b></span></div>
        <details className="mt-2 text-xs"><summary className="cursor-pointer font-bold text-slate-600">Personas autorizadas ({p.autorizado_recogida?.length||0}) · Historial</summary>
         {p.autorizado_recogida?.length?<ul className="mt-1 space-y-1">{p.autorizado_recogida.map((a,j)=><li key={j}>{a.nombre} · DNI {a.dni} · {a.telefono||"Sin teléfono"}</li>)}</ul>:<p className="mt-1 text-red-700">No hay personas adicionales registradas. Solo podrá recoger el responsable legal verificado.</p>}
         {recordFor(p.id,selected.date)?.historial?.length>0&&<ul className="mt-2 space-y-1 border-t pt-2">{[...recordFor(p.id,selected.date).historial].reverse().map((h,j)=><li key={j}>{new Date(h.fecha_hora).toLocaleString("es-ES")} · {h.usuario} · {h.detalle}</li>)}</ul>}
        </details>
       </div>
      </td></tr>}
     </React.Fragment>)}</tbody>
    </table>
   </div>
   <p className="text-xs text-slate-500">Pendiente = todavía no se ha marcado la asistencia. Los cambios se guardan con usuario, fecha y hora.</p>
  </>}

 </section>;
}