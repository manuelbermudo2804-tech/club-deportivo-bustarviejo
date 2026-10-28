import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

const STYLES={rosa:"border-pink-200 bg-pink-50 text-rose-900",amarillo:"border-amber-200 bg-amber-50 text-amber-950",azul:"border-sky-200 bg-sky-50 text-blue-950",verde:"border-emerald-200 bg-emerald-50 text-emerald-950",morado:"border-violet-200 bg-violet-50 text-violet-950",negro:"border-slate-300 bg-slate-100 text-slate-900",naranja:"border-orange-200 bg-orange-50 text-orange-950",rojo:"border-red-200 bg-red-50 text-red-950",neutro:"border-slate-200 bg-slate-50 text-slate-800"};
const BLACK_RIBBON_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/6e4de80a5_lazo-negro.png";
function CampaignSymbol({campaign, size="h-6 w-6"}) { return campaign.categoria==="duelo"||campaign.color==="negro" ? <img src={BLACK_RIBBON_URL} alt="Crespón negro de duelo" className={size+" shrink-0 object-contain"}/> : <span className="shrink-0 text-xl leading-none" aria-hidden="true">{campaign.simbolo||"🎗️"}</span>; }
export default function CampanaActivaBanner(){
 const [expanded,setExpanded]=useState(false);
 const {data:items=[]}=useQuery({queryKey:["campanasActivasBanner"],queryFn:()=>base44.entities.CampanaClub.list("-fecha_inicio",200),staleTime:0,refetchInterval:30000,refetchOnWindowFocus:true});
 const now=new Date();
 const hoy=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
 const active=items.filter(c=>["aprobada","publicada"].includes(c.estado)&&c.mostrar_inicio!==false&&c.fecha_inicio<=hoy&&c.fecha_fin>=hoy).sort((a,b)=>(a.categoria==="duelo"?-1:0)-(b.categoria==="duelo"?-1:0))[0];
 if(!active)return null;
 return <div className="relative"><button type="button" onClick={()=>setExpanded(v=>!v)} aria-label={`Campaña activa: ${active.titulo}`} aria-expanded={expanded} title={active.titulo} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/70"><CampaignSymbol campaign={active}/><span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-yellow-300 ring-2 ring-orange-600" aria-hidden="true"/></button>{expanded&&<><button className="fixed inset-0 z-[59] cursor-default" aria-label="Cerrar campaña" onClick={()=>setExpanded(false)}/><section aria-label={active.titulo} className={`absolute right-0 top-12 z-[60] w-[min(88vw,360px)] rounded-xl border p-3 shadow-xl ${STYLES[active.color]||STYLES.neutro}`}><div className="flex items-start gap-2"><CampaignSymbol campaign={active} size="h-8 w-8"/><div className="min-w-0 flex-1"><h2 className="text-sm font-bold leading-snug">{active.titulo}</h2><p className="mt-2 whitespace-pre-line text-sm">{active.mensaje}</p>{active.detalle&&<p className="mt-2 whitespace-pre-line text-xs opacity-80">{active.detalle}</p>}</div><button type="button" onClick={()=>setExpanded(false)} aria-label="Cerrar" className="rounded-lg p-1 hover:bg-black/10"><X className="h-4 w-4"/></button></div></section></>}</div>;
}