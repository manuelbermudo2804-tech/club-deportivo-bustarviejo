import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartHandshake, Plus, CalendarDays, CheckCircle2, Clock3, Archive, Trash2, Pencil, Eye, X, Save, Ribbon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = { titulo:"", categoria:"salud", simbolo:"🎗️", mensaje:"", detalle:"", color:"rosa", fecha_inicio:new Date().toISOString().slice(0,10), fecha_fin:new Date().toISOString().slice(0,10), estado:"borrador", mostrar_inicio:true, notas_internas:"" };
const CATEGORIAS = { salud:"Salud y sensibilización", inclusion:"Inclusión y diversidad", solidaridad:"Solidaridad", duelo:"Duelo y homenaje", convivencia:"Convivencia y respeto", otro:"Otra campaña" };
const COLORES = { rosa:"from-pink-100 to-rose-50 border-pink-200 text-rose-900", amarillo:"from-amber-100 to-yellow-50 border-amber-200 text-amber-950", azul:"from-sky-100 to-blue-50 border-sky-200 text-blue-950", verde:"from-emerald-100 to-green-50 border-emerald-200 text-emerald-950", morado:"from-violet-100 to-purple-50 border-violet-200 text-violet-950", negro:"from-slate-200 to-slate-50 border-slate-300 text-slate-900", naranja:"from-orange-100 to-amber-50 border-orange-200 text-orange-950", rojo:"from-red-100 to-rose-50 border-red-200 text-red-950", neutro:"from-slate-100 to-white border-slate-200 text-slate-800" };
const ESTADOS = { borrador:"Borrador", pendiente_aprobacion:"Pendiente de aprobación", aprobada:"Aprobada · programada", publicada:"Publicada", archivada:"Archivada" };
const BlackRibbon = () => <svg viewBox="0 0 40 40" className="h-10 w-10 shrink-0" aria-label="Lazo negro de duelo" role="img"><path d="M10 4 C2 10 4 21 12 25 L20 30 L28 25 C36 21 38 10 30 4 C25 1 21 4 20 10 C19 4 15 1 10 4 Z" fill="#111827" stroke="#000" strokeWidth="1.5"/><path d="M14 24 L9 38 L19 33 L21 29 Z M26 24 L31 38 L21 33 L19 29 Z" fill="#111827" stroke="#000" strokeWidth="1"/></svg>;
const CALENDARIO_BASE = [
 {clave:"cancer",titulo:"Día Mundial contra el Cáncer",mes:2,dia:4,categoria:"salud",simbolo:"🎗️",color:"naranja",mensaje:"Hoy nos unimos a las personas que conviven con el cáncer, a sus familias y a quienes las acompañan. Desde el C.D. Bustarviejo enviamos todo nuestro apoyo.",detalle:"La prevención, la investigación y el acompañamiento importan. Juntos somos más fuertes."},
 {clave:"mujer",titulo:"Día Internacional de la Mujer",mes:3,dia:8,categoria:"convivencia",simbolo:"💜",color:"morado",mensaje:"El deporte también es igualdad, respeto y oportunidades para todas. Seguimos trabajando para que cada niña y mujer tenga su lugar en el deporte.",detalle:"C.D. Bustarviejo · Igualdad dentro y fuera del campo."},
 {clave:"down",titulo:"Día Mundial del Síndrome de Down",mes:3,dia:21,categoria:"inclusion",simbolo:"🧦🧦",color:"azul",mensaje:"La diversidad nos enriquece. Celebramos las capacidades, la participación y el derecho de todas las personas a formar parte del equipo.",detalle:"Diferentes calcetines, mismo equipo."},
 {clave:"autismo",titulo:"Día Mundial de Concienciación sobre el Autismo",mes:4,dia:2,categoria:"inclusion",simbolo:"🧩",color:"azul",mensaje:"Cada persona vive y percibe el mundo de una manera única. Construyamos espacios deportivos accesibles, respetuosos y comprensivos.",detalle:"La inclusión se demuestra con comprensión y oportunidades."},
 {clave:"deporte_paz",titulo:"Día Internacional del Deporte para el Desarrollo y la Paz",mes:4,dia:6,categoria:"convivencia",simbolo:"🤝",color:"verde",mensaje:"El deporte une, enseña a cooperar y nos ayuda a convivir. Hoy celebramos el poder del juego limpio y del respeto.",detalle:"Competir sí; respetar siempre."},
 {clave:"familias",titulo:"Día Internacional de las Familias",mes:5,dia:15,categoria:"solidaridad",simbolo:"🧡",color:"naranja",mensaje:"Gracias a todas las familias que forman parte del C.D. Bustarviejo. Vuestra confianza, apoyo y esfuerzo hacen posible que nuestros equipos crezcan.",detalle:"Somos un club, somos una comunidad."},
 {clave:"orgullo",titulo:"Día del Orgullo LGTBIQ+",mes:6,dia:28,categoria:"inclusion",simbolo:"🏳️‍🌈",color:"morado",mensaje:"En nuestro club todas las personas merecen respeto, seguridad y la libertad de ser ellas mismas. En el deporte no hay sitio para la discriminación.",detalle:"Respeto en cada equipo, dentro y fuera del campo."},
 {clave:"cancer_mama",titulo:"Día Mundial contra el Cáncer de Mama",mes:10,dia:19,categoria:"salud",simbolo:"🎀",color:"rosa",mensaje:"Hoy mostramos nuestro apoyo a quienes afrontan o han afrontado un cáncer de mama, a sus familias y a quienes cuidan e investigan.",detalle:"Acompañamiento, prevención e investigación. No estáis solas."},
 {clave:"infancia",titulo:"Día Mundial de la Infancia",mes:11,dia:20,categoria:"inclusion",simbolo:"🧒",color:"azul",mensaje:"La infancia merece crecer con seguridad, respeto, juego y oportunidades. Cuidar a nuestros niños y niñas es responsabilidad de toda la comunidad.",detalle:"El bienestar de los menores está por encima de cualquier resultado."},
 {clave:"violencia_mujer",titulo:"Día Internacional para la Eliminación de la Violencia contra las Mujeres",mes:11,dia:25,categoria:"convivencia",simbolo:"🟣",color:"morado",mensaje:"Rechazamos toda forma de violencia contra las mujeres. Promovemos un deporte basado en el respeto, la igualdad y la convivencia.",detalle:"Ni una menos. Tolerancia cero ante la violencia."},
 {clave:"discapacidad",titulo:"Día Internacional de las Personas con Discapacidad",mes:12,dia:3,categoria:"inclusion",simbolo:"♿",color:"verde",mensaje:"Un deporte más accesible e inclusivo es mejor para todos. Trabajemos para eliminar barreras y garantizar que cada persona pueda participar.",detalle:"La inclusión no es un gesto puntual: es un compromiso."},
 {clave:"derechos",titulo:"Día de los Derechos Humanos",mes:12,dia:10,categoria:"convivencia",simbolo:"🤝",color:"neutro",mensaje:"Dignidad, igualdad y respeto son valores esenciales también en el deporte. Defendámoslos cada día, en cada entrenamiento y en cada partido.",detalle:"El respeto es la base de cualquier equipo."}
];

export default function CampanasSolidarias() {
 const qc = useQueryClient();
 const [editing, setEditing] = useState(null);
 const [saving, setSaving] = useState(false);
 const [filter, setFilter] = useState("activas");
 const [installing, setInstalling] = useState(false);
 const { data: campaigns = [], isLoading } = useQuery({ queryKey:["campanasClub"], queryFn:()=>base44.entities.CampanaClub.list("-created_date",200) });
 const visibles = useMemo(()=>campaigns.filter(c => filter==="todas" ? true : filter==="activas" ? !["archivada","publicada"].includes(c.estado) : c.estado===filter),[campaigns,filter]);
 const refresh=async()=>{await Promise.all([qc.invalidateQueries({queryKey:["campanasClub"]}),qc.invalidateQueries({queryKey:["campanasActivasBanner"]})]);};
 const installCalendar=async()=>{
  const existing=new Set(campaigns.map(c=>c.clave_calendario).filter(Boolean));
  const missing=CALENDARIO_BASE.filter(t=>!existing.has(t.clave));
  if(!missing.length){toast.info("El calendario base ya está cargado.");return;}
  if(!window.confirm(`Se van a preparar ${missing.length} campañas con fechas, símbolos y textos. Quedarán como borradores: no se publicará nada sin aprobación. ¿Continuar?`))return;
  setInstalling(true);
  try{
   const me=await base44.auth.me();
   const today=new Date();
   for(const t of missing){
    let year=today.getFullYear();
    const date=new Date(year,t.mes-1,t.dia);
    if(date<new Date(today.getFullYear(),today.getMonth(),today.getDate()))year++;
    const start=new Date(year,t.mes-1,t.dia);
    const end=new Date(year,t.mes-1,t.dia);
    const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    await base44.entities.CampanaClub.create({titulo:t.titulo,categoria:t.categoria,simbolo:t.simbolo,color:t.color,mensaje:t.mensaje,detalle:t.detalle,fecha_inicio:fmt(start),fecha_fin:fmt(end),estado:"borrador",mostrar_inicio:true,creado_por:me.email,clave_calendario:t.clave});
   }
   toast.success(`Calendario preparado: ${missing.length} campañas listas para revisar.`);
   await refresh();setFilter("activas");
  }catch(e){toast.error("Se ha interrumpido la carga. Actualiza la lista antes de volver a intentarlo.");console.error(e);}finally{setInstalling(false);}
 };
 const save=async()=>{
  if(!editing?.titulo?.trim()||!editing?.mensaje?.trim()||!editing?.fecha_inicio||!editing?.fecha_fin){toast.error("Completa el título, mensaje y las fechas.");return;}
  if(editing.fecha_fin<editing.fecha_inicio){toast.error("La fecha final no puede ser anterior a la inicial.");return;}
  setSaving(true);
  try{
   const me=await base44.auth.me();
   const payload={...editing,titulo:editing.titulo.trim(),mensaje:editing.mensaje.trim(),creado_por:editing.creado_por||me.email};
   if(editing.id) await base44.entities.CampanaClub.update(editing.id,payload);
   else await base44.entities.CampanaClub.create(payload);
   toast.success("Campaña guardada");setEditing(null);await refresh();
  }catch(e){toast.error("No se pudo guardar la campaña.");console.error(e);}finally{setSaving(false);}
 };
 const setState=async(c,estado)=>{
  try{
   const me=await base44.auth.me();
   const payload={estado};
   if(estado==="borrador"||estado==="archivada"){payload.mostrar_inicio=false;}
   if(estado==="aprobada"||estado==="publicada"){payload.aprobado_por=me.email;payload.fecha_aprobacion=new Date().toISOString();}
   await base44.entities.CampanaClub.update(c.id,payload);
   toast.success(estado==="pendiente_aprobacion"?"Enviada para aprobación":estado==="aprobada"?"Campaña aprobada":estado==="publicada"?"Campaña publicada":"Campaña actualizada");
   await refresh();
  }catch(e){toast.error("No se pudo actualizar la campaña.");console.error(e);}
 };
 const remove=async(c)=>{if(!window.confirm("¿Eliminar esta campaña definitivamente?"))return;try{await base44.entities.CampanaClub.delete(c.id);await Promise.all([qc.invalidateQueries({queryKey:["campanasClub"]}),qc.invalidateQueries({queryKey:["campanasActivasBanner"]})]);toast.success("Campaña eliminada");}catch(e){toast.error("No se pudo eliminar.");}};
 const today=new Date().toISOString().slice(0,10);
 return <div className="mx-auto w-full max-w-[1500px] space-y-5 p-3 sm:p-5 lg:p-6">
  <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 p-5 text-white shadow-md sm:p-6">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10"><HeartHandshake className="h-6 w-6 text-rose-300"/></div><div><p className="text-xs font-bold uppercase tracking-widest text-rose-200">Comunicación del club</p><h1 className="text-2xl font-black sm:text-3xl">Campañas solidarias</h1><p className="mt-1 text-sm text-slate-300">Sensibilización, lazos, homenajes y días especiales.</p></div></div>
    <div className="flex flex-wrap gap-2"><Button onClick={installCalendar} disabled={installing} variant="outline" className="gap-2 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"><Sparkles className="h-4 w-4"/>{installing?"Preparando calendario…":"Cargar calendario completo"}</Button><Button onClick={()=>setEditing({...EMPTY})} className="gap-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700"><Plus className="h-4 w-4"/> Nueva campaña</Button><Button onClick={()=>setEditing({...EMPTY,titulo:"Comunicado urgente del C.D. Bustarviejo",categoria:"duelo",simbolo:"🎗️",color:"negro",mensaje:"Desde el C.D. Bustarviejo queremos expresar nuestro cariño y apoyo a todas las personas afectadas. Nos unimos al dolor y enviamos un abrazo solidario en estos momentos difíciles.",detalle:"",fecha_inicio:new Date().toISOString().slice(0,10),fecha_fin:new Date().toISOString().slice(0,10),estado:"borrador",mostrar_inicio:true})} variant="outline" className="gap-2 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20"><HeartHandshake className="h-4 w-4"/> Homenaje urgente</Button></div>
   </div>
  </header>
  <div className="grid gap-3 sm:grid-cols-3">
   {[["Total de campañas",campaigns.length,Ribbon],["Pendientes de aprobación",campaigns.filter(c=>c.estado==="pendiente_aprobacion").length,Clock3],["Aprobadas o publicadas",campaigns.filter(c=>["aprobada","publicada"].includes(c.estado)).length,CheckCircle2]].map(([label,value,Icon])=><div key={label} className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"><div className="rounded-lg bg-rose-50 p-2 text-rose-700"><Icon className="h-5 w-5"/></div><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p></div></div>)}
  </div>
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Calendario listo en un clic:</strong> carga 12 campañas anuales con mensajes, símbolos, colores y fechas. Se guardan como borradores para que la Junta las revise antes de publicarlas. Las campañas de duelo y homenajes se podrán crear aparte cuando sean necesarias.</div>
  <div className="flex flex-wrap gap-2">{[["activas","Pendientes y borradores"],["pendiente_aprobacion","Por aprobar"],["aprobada","Aprobadas"],["publicada","Publicadas"],["archivada","Archivadas"],["todas","Todas"]].map(([v,label])=><Button key={v} size="sm" variant={filter===v?"default":"outline"} onClick={()=>setFilter(v)} className={filter===v?"bg-slate-900":""}>{label}</Button>)}</div>
  {isLoading?<div className="py-12 text-center text-slate-500">Cargando campañas…</div>:visibles.length===0?<div className="rounded-2xl border border-dashed bg-white p-10 text-center"><Ribbon className="mx-auto mb-3 h-9 w-9 text-slate-300"/><p className="font-semibold text-slate-800">No hay campañas en esta sección</p><p className="mt-1 text-sm text-slate-500">Crea una campaña para preparar el primer mensaje solidario del club.</p></div>:<div className="grid gap-4 lg:grid-cols-2">{visibles.map(c=>{const live=c.estado==="publicada"&&c.fecha_inicio<=today&&c.fecha_fin>=today;return <article key={c.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className={`border-b bg-gradient-to-r p-4 ${COLORES[c.color]||COLORES.neutro}`}><div className="flex items-start gap-3">{c.categoria==="duelo"||c.color==="negro"?<BlackRibbon/>:<span className="text-4xl" aria-hidden>{c.simbolo||"🎗️"}</span>}<div className="min-w-0 flex-1"><h2 className="font-extrabold">{c.titulo}</h2><p className="mt-1 text-xs opacity-80">{CATEGORIAS[c.categoria]||"Campaña"} · {c.fecha_inicio} → {c.fecha_fin}</p></div>{live&&<span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">EN VIVO</span>}</div></div><div className="space-y-3 p-4"><p className="whitespace-pre-line text-sm font-semibold text-slate-800">{c.mensaje}</p>{c.detalle&&<p className="whitespace-pre-line text-sm text-slate-600">{c.detalle}</p>}<div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ESTADOS[c.estado]||c.estado}</span><span className="text-xs text-slate-500">{c.mostrar_inicio===false?"No mostrar en inicio":"Mostrar en inicio"}</span></div><div className="flex flex-wrap gap-2 border-t pt-3">{c.estado==="borrador"&&<Button size="sm" onClick={()=>setState(c,"pendiente_aprobacion")} className="gap-1"><Eye className="h-4 w-4"/> Enviar a aprobación</Button>}{c.estado==="pendiente_aprobacion"&&<Button size="sm" onClick={()=>setState(c,"aprobada")} className="gap-1 bg-emerald-700 hover:bg-emerald-800"><CheckCircle2 className="h-4 w-4"/> Aprobar</Button>}{c.estado==="aprobada"&&<Button size="sm" onClick={()=>setState(c,"publicada")} className="gap-1 bg-rose-700 hover:bg-rose-800"><Ribbon className="h-4 w-4"/> Publicar</Button>}{["publicada","aprobada","pendiente_aprobacion"].includes(c.estado)&&<Button size="sm" variant="outline" onClick={()=>setState(c,"borrador")}>Volver a borrador</Button>}<Button size="sm" variant="outline" onClick={()=>setEditing({...c})} className="gap-1"><Pencil className="h-4 w-4"/> Editar</Button><Button size="sm" variant="outline" onClick={()=>setState(c,"archivada")} className="gap-1"><Archive className="h-4 w-4"/> Archivar</Button><Button size="icon" variant="ghost" aria-label="Eliminar campaña" onClick={()=>remove(c)} className="text-red-600"><Trash2 className="h-4 w-4"/></Button></div></div></article>})}</div>}
  {editing&&<div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Editar campaña"><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-black">{editing.id?"Editar campaña":"Nueva campaña"}</h2><p className="text-sm text-slate-500">Prepara el mensaje antes de enviarlo a aprobación.</p></div><Button variant="ghost" size="icon" onClick={()=>setEditing(null)}><X className="h-5 w-5"/></Button></div><div className="grid gap-4 sm:grid-cols-2">
   <div className="space-y-1 sm:col-span-2"><Label>Título *</Label><Input value={editing.titulo||""} onChange={e=>setEditing({...editing,titulo:e.target.value})} placeholder="Ej. Día Mundial contra el Cáncer"/><div className="mt-2 flex flex-wrap gap-2">{[{label:"Luto · lazo negro",simbolo:"🎗️",categoria:"duelo",color:"negro"},{label:"Solidaridad · lazo amarillo",simbolo:"🎗️",categoria:"solidaridad",color:"amarillo"},{label:"Apoyo · lazo morado",simbolo:"💜",categoria:"solidaridad",color:"morado"}].map(p=><Button key={p.label} type="button" size="sm" variant="outline" onClick={()=>setEditing({...editing,...p})}>{p.label}</Button>)}</div></div>
   <div className="space-y-1"><Label>Categoría</Label><Select value={editing.categoria||"salud"} onValueChange={v=>setEditing({...editing,categoria:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(CATEGORIAS).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
   <div className="space-y-1"><Label>Símbolo / lazo (emoji)</Label><Input value={editing.simbolo||""} onChange={e=>setEditing({...editing,simbolo:e.target.value})} placeholder="🎗️"/></div>
   <div className="space-y-1"><Label>Estilo visual</Label><Select value={editing.color||"rosa"} onValueChange={v=>setEditing({...editing,color:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.keys(COLORES).map(v=><SelectItem key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</SelectItem>)}</SelectContent></Select></div>
   <div className="space-y-1"><Label>Fecha de inicio *</Label><Input type="date" value={editing.fecha_inicio||""} onChange={e=>setEditing({...editing,fecha_inicio:e.target.value})}/></div>
   <div className="space-y-1"><Label>Fecha de fin *</Label><Input type="date" value={editing.fecha_fin||""} onChange={e=>setEditing({...editing,fecha_fin:e.target.value})}/></div>
   <div className="space-y-1 sm:col-span-2"><Label>Mensaje principal *</Label><Textarea rows={3} value={editing.mensaje||""} onChange={e=>setEditing({...editing,mensaje:e.target.value})} placeholder="Mensaje breve que aparecerá en la app."/></div>
   <div className="space-y-1 sm:col-span-2"><Label>Texto complementario (opcional)</Label><Textarea rows={3} value={editing.detalle||""} onChange={e=>setEditing({...editing,detalle:e.target.value})} placeholder="Información adicional, homenaje o llamada a la acción."/></div>
   <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={editing.mostrar_inicio!==false} onChange={e=>setEditing({...editing,mostrar_inicio:e.target.checked})} className="h-4 w-4"/> Mostrar en la pantalla de inicio de la app</label>
   <div className="space-y-1 sm:col-span-2"><Label>Notas internas (no se muestran a las familias)</Label><Textarea rows={2} value={editing.notas_internas||""} onChange={e=>setEditing({...editing,notas_internas:e.target.value})}/></div>
  </div><div className="mt-5 flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={()=>setEditing(null)}>Cancelar</Button><Button disabled={saving} onClick={save} className="gap-2 bg-slate-900"><Save className="h-4 w-4"/>{saving?"Guardando…":"Guardar borrador"}</Button></div></div></div>}
 </div>;
}
