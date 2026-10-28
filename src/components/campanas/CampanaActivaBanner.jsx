import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const STYLES={rosa:"border-pink-200 bg-gradient-to-r from-pink-50 to-rose-100 text-rose-950",amarillo:"border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-950",azul:"border-sky-200 bg-gradient-to-r from-sky-50 to-blue-100 text-blue-950",verde:"border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-950",morado:"border-violet-200 bg-gradient-to-r from-violet-50 to-purple-100 text-violet-950",negro:"border-slate-300 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900",naranja:"border-orange-200 bg-gradient-to-r from-orange-50 to-amber-100 text-orange-950",rojo:"border-red-200 bg-gradient-to-r from-red-50 to-rose-100 text-red-950",neutro:"border-slate-200 bg-gradient-to-r from-slate-50 to-white text-slate-800"};
export default function CampanaActivaBanner(){
 const {data:items=[]}=useQuery({queryKey:["campanasActivasBanner"],queryFn:()=>base44.entities.CampanaClub.filter({estado:"publicada",mostrar_inicio:true},"-fecha_inicio",20),staleTime:60000,refetchInterval:120000});
 const hoy=new Date().toLocaleDateString("en-CA");
 const active=items.filter(c=>c.fecha_inicio<=hoy&&c.fecha_fin>=hoy).sort((a,b)=>(a.categoria==="duelo"?-1:0)-(b.categoria==="duelo"?-1:0))[0];
 if(!active)return null;
 return <section role="status" aria-label={active.titulo} className={`mx-3 mt-3 overflow-hidden rounded-2xl border shadow-sm sm:mx-5 lg:mx-6 ${STYLES[active.color]||STYLES.neutro}`}><div className="flex items-start gap-3 p-3 sm:items-center sm:p-4"><span className="shrink-0 text-3xl sm:text-4xl" aria-hidden="true">{active.simbolo||"🎗️"}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">C.D. Bustarviejo · Campaña solidaria</p><h2 className="font-black leading-snug">{active.titulo}</h2><p className="mt-1 whitespace-pre-line text-sm">{active.mensaje}</p>{active.detalle&&<p className="mt-1 whitespace-pre-line text-xs opacity-80">{active.detalle}</p>}</div></div></section>;
}