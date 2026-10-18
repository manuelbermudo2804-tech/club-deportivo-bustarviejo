import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';
const token=()=>Array.from({length:32},()=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*55)]).join('');
Deno.serve(async(req)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 try{
  const b=createClientFromRequest(req),d=await req.json();
  const {nombre,email,alias_equipo,telefono,return_url,origen}=d||{};
  if(!nombre?.trim()||!email||!alias_equipo?.trim()||!telefono)return Response.json({error:'Completa nombre, email, alias y teléfono.'},{status:400});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:'Email inválido.'},{status:400});
  if(/[<>"`]/.test(alias_equipo)||alias_equipo.trim().length<2||alias_equipo.trim().length>40)return Response.json({error:'Alias no válido (2-40 caracteres).'}, {status:400});
  const tel=String(telefono).replace(/[\s\-+]/g,'').replace(/^34/,'');
  if(!/^[6789]\d{8}$/.test(tel))return Response.json({error:'Teléfono español no válido.'},{status:400});
  const cfg=(await b.asServiceRole.entities.EurocopaConfig.list())[0];
  if(!cfg?.activa||cfg.estado==='finalizada'||cfg.estado==='cerrada')return Response.json({error:'Las inscripciones de Eurocopa 2028 no están abiertas.'},{status:403});
  const [teams,matches]=await Promise.all([b.asServiceRole.entities.EurocopaEquipo.list('grupo',100),b.asServiceRole.entities.EurocopaPartido.list('numero_partido',200)]);
  const activeTeams=teams.filter(t=>['A','B','C','D','E','F'].includes(t.grupo));
  const codes=activeTeams.map(t=>String(t.codigo||'').trim());
  const complete=activeTeams.length===24&&new Set(codes).size===24&&activeTeams.every(t=>t.nombre&&!/por definir|tbd|provisional/i.test(t.nombre)&&!/^TBD-/i.test(t.codigo||''))&&matches.filter(m=>m.fase==='grupos').length===36&&matches.filter(m=>m.fase!=='grupos').length===15;
  if(!complete)return Response.json({error:'La competición aún está en preparación: el club debe confirmar las selecciones oficiales y el calendario antes de abrir inscripciones.'},{status:503});
  if(cfg.fecha_inicio_torneo&&Date.now()>=new Date(cfg.fecha_inicio_torneo).getTime())return Response.json({error:'El plazo de inscripción ha terminado.'},{status:403});
  const all=await b.asServiceRole.entities.EurocopaParticipante.list('',5000);
  if(all.some(p=>(p.alias_equipo||'').trim().toLowerCase()===alias_equipo.trim().toLowerCase()))return Response.json({error:'Ese alias ya está cogido.'},{status:409});
  const mail=email.trim().toLowerCase(),paid=all.filter(p=>p.email===mail&&p.estado_pago==='pagado');
  if(!cfg.permitir_multiples_porras&&paid.length)return Response.json({error:'Ya tienes una porra registrada con este email.'},{status:409});
  if(cfg.permitir_multiples_porras&&paid.length>=3)return Response.json({error:'Máximo 3 porras por email.'},{status:409});
  const access=token(),test=!!cfg.modo_test;
  const p=await b.asServiceRole.entities.EurocopaParticipante.create({nombre:nombre.trim(),email:mail,alias_equipo:alias_equipo.trim(),telefono,token_acceso:access,estado_pago:test?'pagado':'pendiente',cantidad_pagada:0,fecha_pago:test?new Date().toISOString():null,predicciones_grupos:{},clasificacion_grupos:{},predicciones_eliminatorias:{},puntos_total:0,origen:origen==='app'?'app':'web'});
  if(test)return Response.json({ok:true,modo_test:true,participante_id:p.id,token:access,redirect_url:`/Eurocopa2028MiPorra?token=${access}`});
  const key=Deno.env.get('STRIPE_SECRET_KEY');if(!key)return Response.json({error:'Stripe no está configurado.'},{status:500});
  const stripe=new Stripe(key,{apiVersion:'2024-06-20'}),url=return_url||req.headers.get('origin')||'https://app.cdbustarviejo.com';
  const session=await stripe.checkout.sessions.create({mode:'payment',customer_email:mail,line_items:[{price_data:{currency:'eur',product_data:{name:`🏆 Porra Eurocopa 2028 — ${alias_equipo.trim()}`,description:`Entrada Eurocopa 2028 CD Bustarviejo. Comisión del club: ${cfg.comision_club_porcentaje||10}%.`},unit_amount:Math.round(Number(cfg.precio_entrada||10)*100)},quantity:1}],success_url:`${url}/Eurocopa2028Exito?token=${access}&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${url}/Eurocopa2028`,metadata:{tipo:'porra_eurocopa',participante_id:p.id,token_acceso:access,alias_equipo:alias_equipo.trim(),nombre:nombre.trim(),user_email:mail,base44_app_id:Deno.env.get('BASE44_APP_ID')||'unknown'}});
  await b.asServiceRole.entities.EurocopaParticipante.update(p.id,{stripe_session_id:session.id});
  return Response.json({ok:true,checkout_url:session.url,participante_id:p.id,token:access});
 }catch(e){console.error('[eurocopaCrearParticipante]',e);return Response.json({error:'No se ha podido crear la inscripción. Inténtalo de nuevo.'},{status:500});}
});