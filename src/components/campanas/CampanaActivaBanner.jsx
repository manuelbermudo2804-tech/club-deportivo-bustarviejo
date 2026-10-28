import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const STYLES={rosa:"border-pink-200 bg-pink-50 text-rose-900",amarillo:"border-amber-200 bg-amber-50 text-amber-950",azul:"border-sky-200 bg-sky-50 text-blue-950",verde:"border-emerald-200 bg-emerald-50 text-emerald-950",morado:"border-violet-200 bg-violet-50 text-violet-950",negro:"border-slate-300 bg-slate-100 text-slate-900",naranja:"border-orange-200 bg-orange-50 text-orange-950",rojo:"border-red-200 bg-red-50 text-red-950",neutro:"border-slate-200 bg-slate-50 text-slate-800"};
const BLACK_RIBBON_URL = "https://media.base44.com/images/public/6992c6be619d2da592897991/6e4de80a5_lazo-negro.png";
function CampaignSymbol({campaign, size="h-6 w-6"}) { return campaign.categoria==="duelo"||campaign.color==="negro" ? <img src={BLACK_RIBBON_URL} alt="Crespón negro de duelo" className={size+" shrink-0 object-contain"}/> : <span className="shrink-0 text-xl leading-none" aria-hidden="true">{campaign.simbolo||"🎗️"}</span>; }
export default function CampanaActivaBanner(){
 const {data:items=[]}=useQuery({queryKey:["campanasActivasBanner"],queryFn:()=>base44.entities.CampanaClub.list("-fecha_inicio",200),staleTime:0,refetchInterval:30000,refetchOnWindowFocus:true});
 const now=new Date();
 const hoy=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
 const active=items.filter(c=>["aprobada","publicada"].includes(c.estado)&&c.mostrar_inicio!==false&&c.fecha_inicio<=hoy&&c.fecha_fin>=hoy).sort((a,b)=>(a.categoria==="duelo"?-1:0)-(b.categoria==="duelo"?-1:0))[0];
 if(!active)return null;
 return <div className="relative" aria-label={`Campaña activa: ${active.titulo}`} title={active.titulo}><div className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white" aria-hidden="true"><CampaignSymbol campaign={active}/><span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-yellow-300 ring-2 ring-orange-600"/></div></div>;
}