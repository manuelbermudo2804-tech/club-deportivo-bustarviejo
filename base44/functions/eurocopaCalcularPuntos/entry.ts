import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async(req)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 try{
  const b=createClientFromRequest(req),user=await b.auth.me();
  if(!user||user.role!=='admin')return Response.json({error:'Solo administradores.'},{status:403});
  const [cs,ps,ms]=await Promise.all([b.asServiceRole.entities.EurocopaConfig.list(),b.asServiceRole.entities.EurocopaParticipante.filter({estado_pago:'pagado'}),b.asServiceRole.entities.EurocopaPartido.list('',500)]);
  const cfg=cs[0]||{},pointsGroup=Number(cfg.puntos_resultado_grupo??1),pointsGroupRanking=Number(cfg.puntos_clasificacion_grupo??2),pointsRound={octavos:Number(cfg.puntos_octavos??3),cuartos:Number(cfg.puntos_cuartos??5),semis:Number(cfg.puntos_semis??7),final:Number(cfg.puntos_final??10)};
  let updated=0;
  for(const p of ps){
   let pg=0,pe=0,pr=0;
   for(const m of ms){
    if(!m.finalizado)continue;
    if(m.fase==='grupos'&&p.predicciones_grupos?.[m.id]&&m.goles_local!=null&&m.goles_visitante!=null){
     const actual=Number(m.goles_local)>Number(m.goles_visitante)?'1':Number(m.goles_local)<Number(m.goles_visitante)?'2':'X';
     if(p.predicciones_grupos[m.id]===actual)pg+=pointsGroup;
    }else if(m.fase!=='grupos'&&p.predicciones_eliminatorias?.[m.id]&&m.ganador_codigo){
     const actualWinnerSide=m.ganador_codigo===m.equipo_local_codigo?'1':m.ganador_codigo===m.equipo_visitante_codigo?'2':'';
     if(actualWinnerSide&&p.predicciones_eliminatorias[m.id]===actualWinnerSide)pe+=pointsRound[m.fase]||0;
    }
   }
   // Puntuar la clasificación de un grupo solo cuando sus seis partidos estén finalizados.
   for(const g of ['A','B','C','D','E','F']){
    const gm=ms.filter(m=>m.fase==='grupos'&&m.grupo===g);
    if(gm.length!==6||!gm.every(m=>m.finalizado&&m.goles_local!=null&&m.goles_visitante!=null))continue;
    const table:Record<string,{codigo:string;pts:number;gf:number;ga:number}>={};
    for(const m of gm){
     const local=m.equipo_local_codigo,away=m.equipo_visitante_codigo;
     if(!local||!away)continue;
     table[local]=table[local]||{codigo:local,pts:0,gf:0,ga:0};table[away]=table[away]||{codigo:away,pts:0,gf:0,ga:0};
     const gl=Number(m.goles_local),ga=Number(m.goles_visitante);
     table[local].gf+=gl;table[local].ga+=ga;table[away].gf+=ga;table[away].ga+=gl;
     if(gl>ga)table[local].pts+=3;else if(gl<ga)table[away].pts+=3;else{table[local].pts+=1;table[away].pts+=1;}
    }
    const actual=Object.values(table).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.codigo.localeCompare(b.codigo)).map(t=>t.codigo);
    const predicted=p.clasificacion_grupos?.[g];
    if(actual.length===4&&Array.isArray(predicted))for(let i=0;i<4;i++)if(predicted[i]&&predicted[i]===actual[i])pr+=pointsGroupRanking;
   }
   const champion=ms.find(m=>m.fase==='final'&&m.finalizado);
   const championSide=champion?(champion.ganador_codigo===champion.equipo_local_codigo?'1':champion.ganador_codigo===champion.equipo_visitante_codigo?'2':''):'';
   const winnerBonus=champion&&championSide&&p.predicciones_eliminatorias?.[champion.id]===championSide?Number(cfg.puntos_campeon??15):0;
   await b.asServiceRole.entities.EurocopaParticipante.update(p.id,{puntos_grupos:pg,puntos_clasificacion_grupos:pr,puntos_eliminatorias:pe,puntos_campeon:winnerBonus,puntos_total:pg+pr+pe+winnerBonus});
   updated++;
  }
  return Response.json({ok:true,participantes_recalculados:updated});
 }catch(e){return Response.json({error:e.message||'Error al recalcular puntos.'},{status:500});}
});