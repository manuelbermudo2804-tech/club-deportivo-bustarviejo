import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async(req)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 try{
  const b=createClientFromRequest(req),user=await b.auth.me();
  if(!user||user.role!=='admin')return Response.json({error:'Solo administradores.'},{status:403});
  const [cs,ps,ms]=await Promise.all([b.asServiceRole.entities.EurocopaConfig.list(),b.asServiceRole.entities.EurocopaParticipante.filter({estado_pago:'pagado'}),b.asServiceRole.entities.EurocopaPartido.list('',500)]);
  const cfg=cs[0]||{},pointsGroup=Number(cfg.puntos_resultado_grupo||1),pointsRound={octavos:Number(cfg.puntos_octavos||3),cuartos:Number(cfg.puntos_cuartos||5),semis:Number(cfg.puntos_semis||7),final:Number(cfg.puntos_final||10)};
  let updated=0;
  for(const p of ps){
   let pg=0,pe=0;
   for(const m of ms){
    if(!m.finalizado)continue;
    if(m.fase==='grupos'&&p.predicciones_grupos?.[m.id]&&m.goles_local!=null&&m.goles_visitante!=null){
     const actual=Number(m.goles_local)>Number(m.goles_visitante)?'1':Number(m.goles_local)<Number(m.goles_visitante)?'2':'X';
     if(p.predicciones_grupos[m.id]===actual)pg+=pointsGroup;
    }else if(m.fase!=='grupos'&&p.predicciones_eliminatorias?.[m.id]&&m.ganador_codigo&&p.predicciones_eliminatorias[m.id]===m.ganador_codigo){
     pe+=pointsRound[m.fase]||0;
    }
   }
   const champion=ms.find(m=>m.fase==='final'&&m.finalizado);
   const winnerBonus=champion&&p.predicciones_eliminatorias?.[champion.id]===champion.ganador_codigo?Number(cfg.puntos_campeon||15):0;
   await b.asServiceRole.entities.EurocopaParticipante.update(p.id,{puntos_grupos:pg,puntos_eliminatorias:pe,puntos_campeon:winnerBonus,puntos_total:pg+pe+winnerBonus});
   updated++;
  }
  return Response.json({ok:true,participantes_recalculados:updated});
 }catch(e){return Response.json({error:e.message||'Error al recalcular puntos.'},{status:500});}
});