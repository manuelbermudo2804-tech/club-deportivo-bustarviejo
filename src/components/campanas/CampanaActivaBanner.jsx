import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp } from "lucide-react";

const STYLES={rosa:"border-pink-200 bg-pink-50 text-rose-900",amarillo:"border-amber-200 bg-amber-50 text-amber-950",azul:"border-sky-200 bg-sky-50 text-blue-950",verde:"border-emerald-200 bg-emerald-50 text-emerald-950",morado:"border-violet-200 bg-violet-50 text-violet-950",negro:"border-slate-300 bg-slate-100 text-slate-900",naranja:"border-orange-200 bg-orange-50 text-orange-950",rojo:"border-red-200 bg-red-50 text-red-950",neutro:"border-slate-200 bg-slate-50 text-slate-800"};
function BlackRibbon(){return <svg viewBox="0 0 32 32" role="img" aria-label="Crespón negro de duelo" className="h-8 w-8 shrink-0"><path d="M16 4c-4 0-6 3-6 6 0 3 2 6 4 8l-6 10h4l4-7 4 7h4l-6-10c2-2 4-5 4-8 0-3-2-6-6-6zm0 3c2 0 3 1.5 3 3s-1.5 4-3 5.5C14.5 14 13 11.5 13 10s1-3 3-3z" fill="#0f172a"/></svg> }
export default function CampanaActivaBanner(){
 const [expanded,setExpanded]=useState(false);
 const {data:items=[]}=useQuery({queryKey:["campanasActivasBanner"],queryFn:()=>base44.entities.CampanaClub.list("-fecha_inicio",200),staleTime:0,refetchInterval:30000,refetchOnWindowFocus:true});
 const now=new Date();
 const hoy=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
 const active=items.filter(c=>["aprobada","publicada"].includes(c.estado)&&c.mostrar_inicio!==false&&c.fecha_inicio<=hoy&&c.fecha_fin>=hoy).sort((a,b)=>(a.categoria==="duelo"?-1:0)-(b.categoria==="duelo"?-1:0))[0];
 if(!active)return null;
 return <section aria-label={active.titulo} className={`mx-3 mt-2 rounded-lg border sm:mx-5 lg:mx-6 ${STYLES[active.color]||STYLES.neutro}`}><button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} className="flex w-full items-center gap-2 px-3 py-2 text-left">{active.categoria==="duelo"||active.color==="negro"?<BlackRibbon/>:<span className="shrink-0 text-xl" aria-hidden="true">{active.simbolo||"🎗️"}</span>}<span className="min-w-0 flex-1 truncate text-sm font-semibold">{active.titulo}</span><span className="text-xs opacity-70">{expanded?"Cerrar":"Ver"}</span>{expanded?<ChevronUp className="h-4 w-4 shrink-0"/>:<ChevronDown className="h-4 w-4 shrink-0"/>}</button>{expanded&&<div className="border-t border-current/10 px-3 pb-3 pt-2 text-sm"><p className="whitespace-pre-line">{active.mensaje}</p>{active.detalle&&<p className="mt-1 whitespace-pre-line text-xs opacity-80">{active.detalle}</p>}</div>}</section>;
}