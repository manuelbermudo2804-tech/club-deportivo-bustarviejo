import React,{useEffect,useState} from "react";
import {base44} from "@/api/base44Client";
import {RefreshCw} from "lucide-react";

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
 const save=async(p,patch,accion,detalle,day=selected?.date||date)=>{
  setBusy(p.id);setError("");setNotice("");
  try{
   const result=await invoke("saveAttendance",{fecha:day,participant_id:p.id,patch,audit:{accion,detalle}});
   if(result?.ok!==true||!result?.record)throw new Error("El servidor no ha confirmado el guardado. No se ha marcado como guardado.");
   setRecords(prev=>{const rest=prev.filter(r=>!(r.participant_id===p.id&&r.fecha===day));return [...rest,result.record];});
   setNotice("Guardado y confirmado · "+p.nombre+" · "+dayLabel(day));
   setSelected(null);
  }catch(e){setError(e.message||"No se pudo guardar.");}
  finally{setBusy("");}
 };
 const markPickup=async p=>{
  const name=window.prompt("Nombre y apellidos de la persona que recoge a "+p.nombre+":");if(!name?.trim())return;
  const dni=window.prompt("DNI/NIE de la persona que recoge:");if(!dni?.trim())return;
  const authorized=(p.autorizado_recogida||[]).some(a=>a.nombre.trim().toLocaleLowerCase("es")===name.trim().toLocaleLowerCase("es")&&cleanDni(a.dni)===cleanDni(dni))||((p.responsable?.nombre||"").trim().toLocaleLowerCase("es")===name.trim().toLocaleLowerCase("es")&&cleanDni(p.responsable?.dni)===cleanDni(dni));
  if(!authorized){setError("RECOGIDA RECHAZADA: nombre y DNI no coinciden con una persona autorizada. No entregues al menor; consulta al responsable legal.");return;}
  const t=nowTime();await save(p,{estado:"presente",recogida_verificada:true,persona_recoge:name.trim(),dni_recoge:cleanDni(dni),hora_salida:t},"recogida_verificada","Recogida verificada por "+name.trim()+" a las "+t,selected?.date||date);
 };
 const presentForDay=day=>records.filter(r=>r.fecha===day&&r.estado==="presente").length;
 const absentForDay=day=>records.filter(r=>r.fecha===day&&r.estado==="ausente").length;
 const chooseWeek=w=>{setWeek(w);setDate(dateForWeek(settings?.fecha_inicio,WEEKS.findIndex(x=>x.key===w)));setSelected(null);setError("");setNotice("");};
 const openDay=(p,day)=>{setDate(day);setSelected({participantId:p.id,date:day});setError("");setNotice("");};
 return <section className="space-y-4">
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
   <p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-600">Operativa semanal</p>
   <h2 className="mt-1 text-xl font-black text-slate-950">Control de asistencia del Campus</h2>
   <div className="mt-3 flex flex-wrap gap-1.5">{WEEKS.map(w=><button key={w.key} onClick={()=>chooseWeek(w.key)} className={"rounded-lg px-3 py-1.5 text-xs font-bold "+(week===w.key?"bg-slate-950 text-white":"border bg-white text-slate-700")}>{w.label}</button>)}</div>
   {monitor&&<p className="mt-2 text-[11px] text-slate-500">Sesión de {monitor} · Acceso limitado a tus semanas autorizadas</p>}
  </div>
  {error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</div>}
  {notice&&<div className="rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs font-semibold text-green-800">{notice}</div>}
  <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-black">Asistencia semanal</h3><p className="text-[11px] text-slate-500">{roster.length} menores inscritos · Pulsa una casilla para editarla</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 "+(loading?"animate-spin":"")}/>Actualizar</button></div>
  {loading?<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Cargando semana…</p>:roster.length===0?<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No hay menores en tu lista para esta semana o no tienes permiso asignado.</p>:<>
   <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
    <table className="w-full min-w-[700px] border-collapse">
     <thead><tr className="bg-slate-800 text-white"><th className="sticky left-0 z-20 min-w-[145px] border-r border-slate-700 bg-slate-800 px-2 py-2 text-left text-[11px]">Participante</th>{dates.map(day=><th key={day} className="min-w-[105px] border-r border-slate-700 px-1 py-2 text-center"><div className="text-[10px] capitalize font-bold">{dayLabel(day)}</div><div className="mt-0.5 text-[9px] font-medium text-slate-300">{presentForDay(day)} P · {absentForDay(day)} A</div></th>)}</tr></thead>
     <tbody>{roster.map((p,i)=><tr key={p.id} className={i%2?"bg-slate-50":"bg-white"}>
      <td className={"sticky left-0 z-10 border-t border-r border-slate-200 bg-inherit px-2 py-2 text-[11px] font-semibold text-slate-900"}>{p.nombre}</td>
      {dates.map(day=>{
       const r=recordFor(p.id,day),active=selected?.participantId===p.id&&selected?.date===day,isBusy=busy===p.id;
       return <td key={day} className={"border-t border-r border-slate-200 px-1 py-1 text-center "+(active?"bg-orange-50":"")}>
        {active? <div className="flex min-h-7 flex-wrap items-center justify-center gap-1">
          <button title="Marcar presente" disabled={isBusy} onClick={()=>save(p,{estado:"presente"},"asistencia","Marcado presente",day)} className="h-6 min-w-7 rounded bg-green-600 px-1.5 text-[10px] font-black text-white disabled:opacity-40">P</button>
          <button title="Marcar ausente" disabled={isBusy} onClick={()=>save(p,{estado:"ausente"},"asistencia","Marcado ausente",day)} className="h-6 min-w-7 rounded bg-red-600 px-1.5 text-[10px] font-black text-white disabled:opacity-40">A</button>
          <button title="Registrar hora de entrada" disabled={isBusy} onClick={()=>save(p,{hora_entrada:nowTime(),estado:"presente"},"entrada","Entrada registrada a las "+nowTime(),day)} className="h-6 rounded border border-blue-300 bg-blue-50 px-1.5 text-[10px] font-bold text-blue-800 disabled:opacity-40">Ent.</button>
          <button title="Registrar salida y verificar recogida" disabled={isBusy||!!r?.recogida_verificada} onClick={()=>markPickup(p)} className="h-6 rounded border border-slate-300 bg-white px-1.5 text-[10px] font-bold text-slate-700 disabled:opacity-40">Rec.</button>
          {isBusy&&<span className="text-[9px] text-slate-500">Guardando…</span>}
        </div>:<button onClick={()=>openDay(p,day)} className={"w-full rounded-md border px-1 py-1.5 text-left transition hover:ring-1 hover:ring-orange-300 "+(r?.estado==="presente"?"border-green-200 bg-green-50":r?.estado==="ausente"?"border-red-200 bg-red-50":"border-amber-200 bg-amber-50")}>
          <span className={"block text-center text-[10px] font-bold "+(r?.estado==="presente"?"text-green-800":r?.estado==="ausente"?"text-red-800":"text-amber-800")}>{statusLabel(r?.estado)}</span>
          <span className="mt-0.5 block text-center text-[9px] text-slate-500">{r?.hora_entrada||"—"}{r?.hora_salida?" · "+r.hora_salida:""}</span>
        </button>}
       </td>;
      })}
     </tr>)}</tbody>
    </table>
   </div>
   <p className="text-[10px] text-slate-500">P = presente · A = ausente · Ent. = entrada · Rec. = salida con verificación de la persona autorizada. Los cambios solo se dan por guardados cuando el servidor confirma el registro.</p>
  </>}
 </section>;
}
