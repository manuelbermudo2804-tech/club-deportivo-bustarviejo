import React,{useEffect,useState} from "react";
import {base44} from "@/api/base44Client";
import {RefreshCw,X,Search,Clock3} from "lucide-react";
import CampusPasarLista from "@/components/campus/CampusPasarLista";

const WEEKS=[{key:"S1",label:"Semana 1"},{key:"S2",label:"Semana 2"},{key:"S3",label:"Semana 3"},{key:"S4",label:"Semana 4"},{key:"S5",label:"Semana 5"}];
const dateForWeek=(start,i)=>{const d=new Date((start||"2027-06-28")+"T12:00:00");d.setDate(d.getDate()+i*7);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const defaultWeekIndex=start=>{const now=new Date();const todayLocal=new Date(now.getFullYear(),now.getMonth(),now.getDate());const first=new Date((start||"2027-06-28")+"T12:00:00");const diff=Math.floor((todayLocal-first)/86400000);return diff<0?0:Math.min(4,Math.floor(diff/7));};
const nowTime=()=>new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",hour12:false});
const cleanDni=v=>String(v||"").replace(/[\s.-]/g,"").toUpperCase();
const dayLabel=date=>new Date(date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"short",day:"2-digit",month:"2-digit"});
const statusLabel=status=>status==="presente"?"Presente":status==="ausente"?"Ausente":"Pendiente";
const formatAuditDate=value=>value?new Date(value).toLocaleString("es-ES",{timeZone:"Europe/Madrid",dateStyle:"short",timeStyle:"medium"}):"Fecha no disponible";

export default function CampusAttendance({season,settings,adminView=false}){
 const [week,setWeek]=useState("S1"),[date,setDate]=useState(()=>dateForWeek(settings?.fecha_inicio,0));
 const [dates,setDates]=useState([]),[roster,setRoster]=useState([]),[records,setRecords]=useState([]);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[monitor,setMonitor]=useState("");
 const [view,setView]=useState("lista");
 const [panel,setPanel]=useState("control");
 const [historyRecords,setHistoryRecords]=useState([]),[historyLoading,setHistoryLoading]=useState(false),[historyError,setHistoryError]=useState("");
 const [historySearch,setHistorySearch]=useState(""),[historyDate,setHistoryDate]=useState("");
 const [selected,setSelected]=useState(null),[expandedParticipant,setExpandedParticipant]=useState(""),[pickup,setPickup]=useState(null),[pickupError,setPickupError]=useState("");
 const invoke=async(action,extra={})=>{const res=await base44.functions.invoke("campusAttendanceGateway",{action,temporada:String(season),semana:week,fecha:date,...extra});const data=res?.data||res;if(data?.error)throw new Error(data.error);return data;};
 const load=async()=>{setLoading(true);setError("");try{const d=await invoke("weekRoster");setRoster(d.roster||[]);setRecords(d.records||[]);setDates(d.dates||[]);setMonitor(d.monitor?.nombre||"");if(d.dates?.length&&!d.dates.includes(date))setDate(d.dates[0]);}catch(e){setError(e.message||"No se pudo cargar la asistencia.");setRoster([]);setRecords([]);setDates([]);}finally{setLoading(false);}};
 const loadHistory=async()=>{if(!adminView)return;setHistoryLoading(true);setHistoryError("");try{const res=await base44.functions.invoke("campusAttendanceGateway",{action:"adminHistory",temporada:String(season),fecha:historyDate,buscar:historySearch});const data=res?.data||res;if(data?.error)throw new Error(data.error);setHistoryRecords(data.records||[]);}catch(e){setHistoryError(e?.response?.data?.error||e?.message||"No se pudo cargar el historial.");setHistoryRecords([]);}finally{setHistoryLoading(false);}};
 useEffect(()=>{if(adminView&&panel==="historial")loadHistory();},[adminView,panel,season]);
 useEffect(()=>{if(settings?.fecha_inicio){const index=defaultWeekIndex(settings.fecha_inicio);const selected=WEEKS[index].key;setWeek(selected);setDate(dateForWeek(settings.fecha_inicio,index));}},[settings?.fecha_inicio,season]);
 useEffect(()=>{load();},[season,week]);
 const recordFor=(participantId,day)=>records.find(r=>r.participant_id===participantId&&r.fecha===day);
 const save=async(p,patch,accion,detalle,day=selected?.date||date)=>{
  setBusy(p.id);setError("");setNotice("");
  try{
   const result=await invoke("saveAttendance",{fecha:day,participant_id:p.id,patch,audit:{accion,detalle}});
   if(result?.ok!==true||!result?.record)throw new Error("El servidor no ha confirmado el guardado. No se ha marcado como guardado.");
   setRecords(prev=>{const rest=prev.filter(r=>!(r.participant_id===p.id&&r.fecha===day));return [...rest,result.record];});
   setNotice("Guardado y confirmado · "+p.nombre+" · "+dayLabel(day));
   setSelected(null);setPickup(null);setPickupError("");
   return true;
  }catch(e){
   const message=e?.response?.data?.error||e?.data?.error||e?.message||"No se pudo guardar.";
   setError(message);
   return false;
  }finally{setBusy("");}
 };
 const confirmPickup=async p=>{
  const person=pickup?.person,dni=pickup?.dni||"";
  if(!person||!dni.trim()){setPickupError("Selecciona a la persona e introduce su DNI/NIE.");return;}
  if(cleanDni(person.dni)!==cleanDni(dni)){setPickupError("⛔ NO AUTORIZADO: el DNI/NIE no coincide con el de "+person.nombre+". No se ha registrado la salida.");return;}
  setPickupError("");
  const t=nowTime();
  await save(p,{estado:"presente",recogida_verificada:true,persona_recoge:person.nombre,dni_recoge:cleanDni(dni),hora_salida:t},"recogida_verificada","Recogida verificada por "+person.nombre+" a las "+t,pickup.date);
 };
 const presentForDay=day=>records.filter(r=>r.fecha===day&&r.estado==="presente").length;
 const absentForDay=day=>records.filter(r=>r.fecha===day&&r.estado==="ausente").length;
 const chooseWeek=w=>{setWeek(w);setDate(dateForWeek(settings?.fecha_inicio,WEEKS.findIndex(x=>x.key===w)));setSelected(null);setPickup(null);setPickupError("");setError("");setNotice("");};
 const openDay=(p,day)=>{setDate(day);setSelected({participantId:p.id,date:day});setPickup(null);setPickupError("");setError("");setNotice("");};
 return <section className="space-y-4">
  <div className="rounded-2xl border bg-white p-2 shadow-sm">
   <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Semana del Campus</p>
   <div className="grid grid-cols-5 gap-1">{WEEKS.map(w=><button key={w.key} onClick={()=>chooseWeek(w.key)} className={"rounded-lg px-2 py-3 text-xs font-black "+(week===w.key?"bg-orange-600 text-white":"bg-slate-50 text-slate-700")}>{w.key}</button>)}</div>
  </div>
  {error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</div>}
  {notice&&<div className="rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs font-semibold text-green-800">{notice}</div>}
  {view==="lista"?(loading?<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Cargando lista…</p>:roster.length===0?<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No hay menores en tu lista para esta semana o no tienes permiso asignado.</p>:<CampusPasarLista roster={roster} records={records} dates={dates} busy={busy} save={save}/>):<>
  <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-black">Asistencia semanal</h3><p className="text-[11px] text-slate-500">{roster.length} menores inscritos · Pulsa una casilla para editarla</p></div><button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 "+(loading?"animate-spin":"")}/>Actualizar</button></div>
  {loading?<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Cargando semana…</p>:roster.length===0?<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No hay menores en tu lista para esta semana o no tienes permiso asignado.</p>:<>
   <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
    <table className="w-full min-w-[520px] border-collapse">
     <thead><tr className="bg-slate-800 text-white"><th className="sticky left-0 z-20 min-w-[112px] border-r border-slate-700 bg-slate-800 px-1.5 py-1.5 text-left text-[10px]">Participante</th>{dates.map(day=><th key={day} className="min-w-[80px] border-r border-slate-700 px-0.5 py-1.5 text-center"><div className="text-[10px] capitalize font-bold">{dayLabel(day)}</div><div className="mt-0.5 text-[9px] font-medium text-slate-300">{presentForDay(day)} P · {absentForDay(day)} A</div></th>)}</tr></thead>
     <tbody>{roster.map((p,i)=><React.Fragment key={p.id}><tr className={i%2?"bg-slate-50":"bg-white"}>
      <td className={"sticky left-0 z-10 border-t border-r border-slate-200 bg-inherit px-2 py-1.5 text-[11px] font-semibold text-slate-900"}><button onClick={()=>setExpandedParticipant(v=>v===p.id?"":p.id)} className="w-full text-left leading-tight">{p.nombre}<span className="ml-1 text-[9px] font-normal text-orange-700">{expandedParticipant===p.id?"− ficha":"+ ficha"}</span></button></td>
      {dates.map(day=>{
       const r=recordFor(p.id,day),active=selected?.participantId===p.id&&selected?.date===day,isBusy=busy===p.id;
       return <td key={day} className={"border-t border-r border-slate-200 px-1 py-1 text-center "+(active?"bg-orange-50":"")}>
        {active? <div className="flex min-h-7 flex-wrap items-center justify-center gap-1">
          <button title="Marcar presente y registrar hora de entrada" disabled={isBusy} onClick={()=>{const t=nowTime();save(p,{estado:"presente",hora_entrada:t},"asistencia","Presente; entrada registrada a las "+t,day);}} className="h-6 min-w-7 rounded bg-green-600 px-1.5 text-[10px] font-black text-white disabled:opacity-40">P</button>
          <button title="Marcar ausente" disabled={isBusy} onClick={()=>save(p,{estado:"ausente"},"asistencia","Marcado ausente",day)} className="h-6 min-w-7 rounded bg-red-600 px-1.5 text-[10px] font-black text-white disabled:opacity-40">A</button>
          <button title="Registrar salida y verificar recogida" disabled={isBusy||!!r?.recogida_verificada} onClick={()=>{setPickupError("");setPickup({participantId:p.id,date:day,person:null,dni:""});}} className="h-6 rounded border border-slate-300 bg-white px-1.5 text-[10px] font-bold text-slate-700 disabled:opacity-40">Rec.</button>
          <button title="Cerrar opciones" onClick={()=>{setSelected(null);setPickup(null);setPickupError("");}} className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-300 bg-white text-slate-600"><X className="h-3.5 w-3.5"/></button>
          {pickup?.participantId===p.id&&pickup?.date===day&&<div className="mt-1 w-full basis-full rounded-md border border-slate-200 bg-white p-2 text-left">
           <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-700"><span>¿Quién recoge a {p.nombre}?</span><button onClick={()=>{setPickup(null);setPickupError("");}} className="rounded border px-1.5 py-0.5 text-slate-500">Cerrar ×</button></div>
           {!pickup.person?<div className="flex flex-col gap-1">{(p.autorizado_recogida||[]).map((person,i)=><button key={i} onClick={()=>setPickup(v=>({...v,person,dni:""}))} className="rounded border px-2 py-1.5 text-left text-[10px] font-semibold text-slate-800">{person.nombre}<span className="ml-1 font-normal text-slate-500">{person.parentesco||""}</span></button>)}</div>:<div className="space-y-1.5"><div className="text-[10px] font-semibold">{pickup.person.nombre} <button onClick={()=>setPickup(v=>({...v,person:null,dni:""}))} className="ml-1 text-orange-700 underline">Cambiar</button></div><input value={pickup.dni} onChange={e=>setPickup(v=>({...v,dni:e.target.value}))} placeholder="DNI / NIE" autoComplete="off" className="h-8 w-full rounded border px-2 text-xs uppercase"/><div className="flex gap-1"><button disabled={!pickup.dni.trim()||isBusy} onClick={()=>confirmPickup(p)} className="rounded bg-green-600 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">Verificar y registrar</button><button onClick={()=>setPickup(null)} className="rounded border px-2 py-1.5 text-[10px]">Cancelar</button></div></div>}
           {pickupError&&<div role="alert" className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-[10px] font-bold text-red-800">{pickupError}</div>}
          </div>}
          {isBusy&&<span className="text-[9px] text-slate-500">Guardando…</span>}
        </div>:<button onClick={()=>openDay(p,day)} className={"w-full rounded-md border px-1 py-1.5 text-left transition hover:ring-1 hover:ring-orange-300 "+(r?.estado==="presente"?"border-green-200 bg-green-50":r?.estado==="ausente"?"border-red-200 bg-red-50":"border-amber-200 bg-amber-50")}>
          <span className={"block text-center text-[10px] font-bold "+(r?.estado==="presente"?"text-green-800":r?.estado==="ausente"?"text-red-800":"text-amber-800")}>{statusLabel(r?.estado)}</span>
          <span className="mt-0.5 block text-center text-[9px] text-slate-500">{r?.hora_entrada||"—"}{r?.hora_salida?" · "+r.hora_salida:""}</span>
        </button>}
       </td>;
      })}
     </tr>
      {expandedParticipant===p.id&&<tr className="bg-orange-50/70"><td colSpan={dates.length+1} className="border-t border-orange-100 px-2 py-2">
       <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] leading-snug sm:grid-cols-3">
        <div><span className="text-slate-500">Edad</span><div className="font-bold text-slate-900">{p.fecha_nacimiento?(()=>{const b=new Date(p.fecha_nacimiento+"T12:00:00"),s=new Date((settings?.fecha_inicio||"2027-06-28")+"T12:00:00");let a=s.getFullYear()-b.getFullYear();if(s.getMonth()<b.getMonth()||(s.getMonth()===b.getMonth()&&s.getDate()<b.getDate()))a--;return a+" años";})():"No indicada"}</div></div>
        <div><span className="text-slate-500">Grupo</span><div className="font-bold text-slate-900">{p.grupo_edad||"—"}</div></div>
        <div><span className="text-slate-500">Alergias</span><div className="font-semibold text-slate-900">{p.alergias||"Ninguna indicada"}</div></div>
        <div><span className="text-slate-500">Intolerancias</span><div className="font-semibold text-slate-900">{p.intolerancias||"Ninguna indicada"}</div></div>
        <div><span className="text-slate-500">Medicación</span><div className="font-semibold text-slate-900">{p.medicacion||"Ninguna indicada"}</div></div>
        <div className="col-span-2 sm:col-span-3"><span className="text-slate-500">Observaciones médicas</span><div className="font-semibold text-slate-900">{p.observaciones_medicas||"Sin observaciones"}</div></div>
        <div><span className="text-slate-500">Contacto principal / emergencia</span><div className="font-semibold text-slate-900">{p.contacto_emergencia_nombre||p.responsable?.nombre||"Tutor legal"} · {p.contacto_emergencia_telefono||p.responsable?.telefono||"Teléfono no registrado"}</div></div>
        <div><span className="text-slate-500">Contacto de emergencia adicional</span><div className="font-semibold text-slate-900">{p.contacto_emergencia_2_nombre||"—"} · {p.contacto_emergencia_2_telefono||"—"}</div></div>
        <div className="col-span-2 sm:col-span-3"><span className="text-slate-500">Autorizados para recoger</span><div className="font-semibold text-slate-900">{(p.autorizado_recogida||[]).length?(p.autorizado_recogida||[]).map(a=>a.nombre+(a.parentesco?" · "+a.parentesco:"")).join(" / "):"Solo responsable legal registrado"}</div></div>
       </div>
      </td></tr>}
      </React.Fragment>)}</tbody>
    </table>
   </div>
   <p className="text-[10px] text-slate-500">P = presente · A = ausente · Ent. = entrada · Rec. = salida con verificación de la persona autorizada. Los cambios solo se dan por guardados cuando el servidor confirma el registro.</p>
  </>}
  </>}
 </section>;
}