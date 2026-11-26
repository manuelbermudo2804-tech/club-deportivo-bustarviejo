import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ORIGINS = new Set([
  'https://www.cdbustarviejo.com',
  'https://cdbustarviejo.com'
]);
const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.cdbustarviejo.com',
  'Vary': 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
});
const clean = (v) => String(v || '').trim().toUpperCase().replace(/[.\s-]/g, '');
Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const headers = cors(origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405, headers });
  if (!ALLOWED_ORIGINS.has(origin)) return Response.json({ error: 'Origen no autorizado' }, { status: 403, headers });
  try {
    const body = await req.json();
    if (body.action === 'availability') {
      const availabilityClient = createClientFromRequest(req);
      const cfgs = await availabilityClient.asServiceRole.entities.CampusSettings.list('-created_date', 100);
      const configured = (cfgs || []).find(c => c.activo === true);
      if (!configured?.id) return Response.json({ error: 'Las inscripciones del Campus están cerradas en este momento.', closed: true }, { status: 409, headers });
      const season = String(configured.temporada || configured.fecha_inicio?.slice(0,4) || '2027');
      const [registrations, participants] = await Promise.all([
        availabilityClient.asServiceRole.entities.CampusRegistration.list('-created_date', 2000),
        availabilityClient.asServiceRole.entities.CampusParticipant.list('-created_date', 3000)
      ]);
      const registrationsById = new Map((registrations || []).map(r => [r.id, r]));
      const active = (participants || []).filter(p => {
        if (String(p.temporada || '2027') !== season || ['cancelado','lista_espera'].includes(String(p.estado || '').toLowerCase())) return false;
        const parent = registrationsById.get(p.registration_id);
        if (!parent) return true;
        if (['cancelada','revision'].includes(String(parent.estado || '').toLowerCase())) return false;
        // Pago con tarjeta abandonado (el enlace caduca a los 31 min): la plaza vuelve a estar libre.
        const abandoned = parent.stripe_session_id && parent.estado_pago === 'pendiente' && Date.now() - new Date(parent.created_date).getTime() > 35 * 60 * 1000;
        return !abandoned;
      });
      const groups = [
        { key:'6-8', label:'6–8 años', capacity:configured.plazas_6_8 },
        { key:'9-11', label:'9–11 años', capacity:configured.plazas_9_11 },
        { key:'12-16', label:'12–16 años', capacity:configured.plazas_12_16 }
      ];
      const weeks = ['S1','S2','S3','S4','S5'];
      const matrix = groups.map(g => ({
        group:g.key, label:g.label,
        weeks:weeks.map(week => {
          const occupied = active.filter(p => p.grupo_edad === g.key && (p.semanas_ocupadas || []).includes(week)).length;
          const cap = g.capacity === undefined || g.capacity === null || g.capacity === '' ? null : Math.max(0, Number(g.capacity));
          const generalCap = configured.maximo_total === undefined || configured.maximo_total === null || configured.maximo_total === '' ? null : Math.max(0, Number(configured.maximo_total));
          const generalOccupied = active.filter(p => (p.semanas_ocupadas || []).includes(week)).length;
          const remaining = cap === null ? null : Math.max(0, cap - occupied);
          const generalRemaining = generalCap === null || generalCap === 0 ? null : Math.max(0, generalCap - generalOccupied);
          return { week, occupied, capacity:cap, remaining:remaining === null ? null : (generalRemaining === null ? remaining : Math.min(remaining, generalRemaining)), full:(remaining !== null && remaining <= 0) || (generalRemaining !== null && generalRemaining <= 0) };
        })
      }));
      return Response.json({ season, weeks, groups:matrix, updated_at:new Date().toISOString() }, { status:200, headers });
    }
    if (body.action === 'pricing') {
      const pricingClient = createClientFromRequest(req);
      const cfgs = await pricingClient.asServiceRole.entities.CampusSettings.list('-created_date', 5);
      const configured = (cfgs || []).find(c => c.activo === true) || cfgs?.[0] || { precio_semana_general:60, precio_semana_socio:55, precio_quincena_general:110, precio_quincena_socio:95, precio_mes_general:200, precio_mes_socio:170 };
      return Response.json({ rates: {
        precio_semana_general:Number(configured.precio_semana_general),
        precio_semana_socio:Number(configured.precio_semana_socio),
        precio_quincena_general:Number(configured.precio_quincena_general),
        precio_quincena_socio:Number(configured.precio_quincena_socio),
        precio_cuatro_semanas_general:Number(configured.precio_mes_general),
        precio_cuatro_semanas_socio:Number(configured.precio_mes_socio)
      } }, { status:200, headers });
    }
    const email=String(body.email||'').trim().toLowerCase();
    const dni=clean(body.dni).toUpperCase().replace(/[.\s-]/g,'');
    const base44=createClientFromRequest(req);
    const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const validInput=!!email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&dni.length>=8&&dni.length<=12;
    if(body.action==='request_code'){
      if(!validInput)return Response.json({error:'Introduce un correo y DNI/NIE válidos.'},{status:400,headers});
      const matches=await base44.asServiceRole.entities.ClubMember.filter({email});
      const today=new Date().toISOString().slice(0,10);
      const member=(matches||[]).find(m=>clean(m.dni).toUpperCase().replace(/[.\s-]/g,'')===dni&&m.activo===true&&String(m.estado_pago||'').toLowerCase()==='pagado'&&(!m.fecha_vencimiento||m.fecha_vencimiento>=today));
      if(!member)return Response.json({sent:true,message:'Si los datos coinciden con una ficha activa, recibirás un código en el correo registrado.'},{status:200,headers});
      const challenges=await base44.asServiceRole.entities.CampusMemberVerification.filter({email});
      const now=Date.now(),recent=(challenges||[]).filter(x=>new Date(x.created_at||0).getTime()>now-15*60*1000);
      if(recent.length>=3||(challenges||[]).some(x=>new Date(x.last_sent_at||x.created_at||0).getTime()>now-60*1000))
        return Response.json({error:'Por seguridad, espera antes de solicitar otro código.'},{status:429,headers});
      for(const prior of (challenges||[]).filter(x=>!x.used&&!x.consumed))await base44.asServiceRole.entities.CampusMemberVerification.update(prior.id,{used:true});
      const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
      const createdAt=new Date();
      const record=await base44.asServiceRole.entities.CampusMemberVerification.create({member_id:member.id,email,dni_hash:await hash(dni),code_hash:await hash(code),expires_at:new Date(now+10*60*1000).toISOString(),attempts:0,used:false,consumed:false,created_at:createdAt.toISOString(),last_sent_at:createdAt.toISOString()});
      const key=Deno.env.get('RESEND_API_KEY');
      if(!key){await base44.asServiceRole.entities.CampusMemberVerification.update(record.id,{used:true});throw new Error('El servicio de correo no está disponible temporalmente.');}
      const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from:'CD Bustarviejo <noreply@cdbustarviejo.com>',to:[member.email],subject:'Código de verificación · Campus Deportivo 2027',html:'<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#172033"><div style="background:#f57c00;padding:22px;text-align:center;color:#111;font-weight:bold">C.D. BUSTARVIEJO</div><div style="padding:24px"><h2>Verifica tu condición de socio</h2><p>Introduce este código en la inscripción del Campus Deportivo 2027:</p><div style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;background:#fff4e8;padding:18px;border-radius:12px">'+code+'</div><p>El código caduca en 10 minutos. Si no has solicitado esta verificación, ignora este mensaje.</p></div></div>'})});
      if(!mail.ok){console.error('[campusMemberLookup] Resend',mail.status,await mail.text().catch(()=>'Error'));await base44.asServiceRole.entities.CampusMemberVerification.update(record.id,{used:true});throw new Error('No se ha podido enviar el código. Inténtalo de nuevo.');}
      return Response.json({sent:true,challenge_id:record.id,message:'Si los datos coinciden con una ficha activa, recibirás un código en el correo registrado.'},{status:200,headers});
    }
    if(body.action==='verify_code'){
      const challengeId=String(body.challenge_id||'').trim(),code=String(body.code||'').trim();
      if(!challengeId||! /^\d{6}$/.test(code))return Response.json({error:'Introduce el código de seis cifras.'},{status:400,headers});
      const rows=await base44.asServiceRole.entities.CampusMemberVerification.filter({id:challengeId}),challenge=rows?.[0];
      if(!challenge||challenge.used||challenge.consumed||new Date(challenge.expires_at).getTime()<Date.now()||Number(challenge.attempts||0)>=5)
        return Response.json({error:'El código ha caducado o ya no es válido. Solicita uno nuevo.'},{status:400,headers});
      const attempts=Number(challenge.attempts||0)+1;
      if(await hash(code)!==challenge.code_hash){await base44.asServiceRole.entities.CampusMemberVerification.update(challenge.id,{attempts,used:attempts>=5});return Response.json({error:attempts>=5?'Has superado el número de intentos. Solicita un código nuevo.':'El código no es correcto.'},{status:400,headers});}
      const memberRows=await base44.asServiceRole.entities.ClubMember.filter({id:challenge.member_id}),member=memberRows?.[0],today=new Date().toISOString().slice(0,10);
      if(!member||member.activo!==true||String(member.estado_pago||'').toLowerCase()!=='pagado'||(member.fecha_vencimiento&&member.fecha_vencimiento<today))return Response.json({error:'La ficha de socio ya no está activa y pagada.'},{status:400,headers});
      const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
      await base44.asServiceRole.entities.CampusMemberVerification.update(challenge.id,{used:true,verification_token_hash:await hash(token),verified_at:new Date().toISOString(),token_expires_at:new Date(Date.now()+30*60*1000).toISOString()});
      return Response.json({verified:true,verification_token:token,member_id:member.id,member:{nombre:member.nombre_completo||'',dni:member.dni||'',email:member.email||'',telefono:member.telefono||'',direccion:member.direccion||'',municipio:member.municipio||'',fecha_nacimiento:member.fecha_nacimiento||''}},{status:200,headers});
    }
    return Response.json({error:'Acción no válida.'},{status:400,headers});
  } catch (error) {
    console.error('[campusMemberLookup]', error?.message);
    return Response.json({ error: 'No se ha podido verificar ahora. Inténtalo de nuevo.' }, { status: 500, headers });
  }
});