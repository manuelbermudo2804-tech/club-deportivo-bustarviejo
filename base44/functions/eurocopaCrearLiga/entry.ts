import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode=()=>Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
Deno.serve(async(req)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 try{
  const b=createClientFromRequest(req),{token_acceso,nombre,descripcion}=await req.json();
  if(typeof token_acceso!=='string'||!/^[A-Za-z0-9]{32}$/.test(token_acceso))return Response.json({error:'Token no válido'},{status:400});
  const name=String(nombre||'').trim(),desc=String(descripcion||'').trim().slice(0,200);
  if(name.length<3||name.length>40||/[<>"`]/.test(name))return Response.json({error:'El nombre debe tener entre 3 y 40 caracteres y no contener caracteres especiales.'},{status:400});
  const [ps,cs]=await Promise.all([b.asServiceRole.entities.EurocopaParticipante.filter({token_acceso}),b.asServiceRole.entities.EurocopaConfig.list()]);
  const p=ps[0];if(!p)return Response.json({error:'Participante no encontrado'},{status:404});
  if(p.estado_pago!=='pagado')return Response.json({error:'Debes completar el pago primero'},{status:403});
  if(cs[0]?.permitir_mini_ligas===false)return Response.json({error:'Las mini-ligas están desactivadas.'},{status:403});
  const created=await b.asServiceRole.entities.EurocopaLiga.filter({creador_email:p.email});
  if(created.length>=5)return Response.json({error:'Has alcanzado el máximo de 5 mini-ligas creadas.'},{status:429});
  let code=null;
  for(let i=0;i<8;i++){const candidate=makeCode();if(!(await b.asServiceRole.entities.EurocopaLiga.filter({codigo:candidate})).length){code=candidate;break;}}
  if(!code)return Response.json({error:'No se pudo generar un código único. Inténtalo de nuevo.'},{status:500});
  const league=await b.asServiceRole.entities.EurocopaLiga.create({nombre:name,codigo:code,descripcion:desc,creador_email:p.email,creador_nombre:p.nombre,participantes_emails:[p.email],max_participantes:100,publica:true});
  const current=p.mini_liga_codigos||[];
  await b.asServiceRole.entities.EurocopaParticipante.update(p.id,{mini_liga_codigos:[...new Set([...current,code])]});
  return Response.json({success:true,liga:league,codigo:code});
 }catch(e){return Response.json({error:e.message||'No se pudo crear la mini-liga.'},{status:500});}
});