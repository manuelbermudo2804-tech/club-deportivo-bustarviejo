import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async(req)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 try{
  const b=createClientFromRequest(req),{token_acceso,codigo}=await req.json();
  if(typeof token_acceso!=='string'||!/^[A-Za-z0-9]{32}$/.test(token_acceso))return Response.json({error:'Token no válido'},{status:400});
  const code=String(codigo||'').trim().toUpperCase();
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))return Response.json({error:'El código debe tener 6 caracteres válidos.'},{status:400});
  const [ps,cs]=await Promise.all([b.asServiceRole.entities.EurocopaParticipante.filter({token_acceso}),b.asServiceRole.entities.EurocopaConfig.list()]);
  const p=ps[0];if(!p)return Response.json({error:'Participante no encontrado'},{status:404});
  if(p.estado_pago!=='pagado')return Response.json({error:'Debes completar el pago primero'},{status:403});
  if(cs[0]?.permitir_mini_ligas===false)return Response.json({error:'Las mini-ligas están desactivadas.'},{status:403});
  const found=await b.asServiceRole.entities.EurocopaLiga.filter({codigo:code}),league=found[0];
  if(!league)return Response.json({error:'Código de mini-liga no encontrado.'},{status:404});
  const current=p.mini_liga_codigos||[];
  if(current.includes(code))return Response.json({success:true,mensaje:'Ya formas parte de esta mini-liga.',liga:league});
  const emails=league.participantes_emails||[];
  if(league.max_participantes&&emails.length>=league.max_participantes)return Response.json({error:'La mini-liga está completa.'},{status:403});
  await b.asServiceRole.entities.EurocopaLiga.update(league.id,{participantes_emails:[...new Set([...emails,p.email])]});
  await b.asServiceRole.entities.EurocopaParticipante.update(p.id,{mini_liga_codigos:[...new Set([...current,code])]});
  return Response.json({success:true,mensaje:'Te has unido a la mini-liga.',liga:league});
 }catch(e){return Response.json({error:e.message||'No se pudo unir a la mini-liga.'},{status:500});}
});