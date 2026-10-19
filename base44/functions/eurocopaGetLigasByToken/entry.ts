import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async(req)=>{
 try{
  const {token}=await req.json().catch(()=>({}));
  if(typeof token!=='string'||!/^[A-Za-z0-9]{32}$/.test(token))return Response.json({error:'Token no válido'},{status:400});
  const b=createClientFromRequest(req);
  const [ps,cs]=await Promise.all([b.asServiceRole.entities.EurocopaParticipante.filter({token_acceso:token}),b.asServiceRole.entities.EurocopaConfig.list()]);
  const p=ps[0];if(!p)return Response.json({error:'Participante no encontrado'},{status:404});
  if(p.estado_pago!=='pagado')return Response.json({error:'Debes completar el pago primero'},{status:403});
  if(cs[0]?.permitir_mini_ligas===false)return Response.json({ligas:[],desactivadas:true});
  const codes=[...new Set(p.mini_liga_codigos||[])];
  const results=await Promise.all(codes.map(c=>b.asServiceRole.entities.EurocopaLiga.filter({codigo:c}).catch(()=>[])));
  const seen=new Set(),ligas=results.flat().filter(l=>l?.id&&!seen.has(l.id)&&seen.add(l.id)).map(l=>({id:l.id,nombre:l.nombre,codigo:l.codigo,descripcion:l.descripcion,participantes_emails:l.participantes_emails||[]}));
  return Response.json({ligas});
 }catch(e){return Response.json({error:e.message||'No se pudieron cargar las mini-ligas.'},{status:500});}
});