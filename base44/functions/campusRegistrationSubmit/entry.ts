import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

const ORIGINS = new Set(['https://www.cdbustarviejo.com','https://cdbustarviejo.com']);
const WEEKS = ['S1','S2','S3','S4','S5'];

const cors = origin => ({
  'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://www.cdbustarviejo.com',
  'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'
});
const clean = v => String(v || '').trim();
const normalize = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
function isValidISODate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function ageOnStart(date, startDate) {
  // Rechaza fechas imposibles antes de calcular la edad.
  if (!isValidISODate(date) || !isValidISODate(String(startDate || '').slice(0,10))) return NaN;
  const birth = String(date).split('-').map(Number);
  const start = String(startDate).slice(0,10).split('-').map(Number);
  let age = start[0] - birth[0];
  if (start[1] < birth[1] || (start[1] === birth[1] && start[2] < birth[2])) age -= 1;
  return age;
}
function groupFor(age){return age<=8?'6-8':age<=11?'9-11':'12-16'}
function priceForWeeks(selected, member, rates) {
  const ids = [...new Set(selected)].map(w=>WEEKS.indexOf(w)).filter(i=>i>=0).sort((a,b)=>a-b);
  const week = Number(member ? rates.precio_semana_socio : rates.precio_semana_general);
  const fortnight = Number(member ? rates.precio_quincena_socio : rates.precio_quincena_general);
  const month = Number(member ? rates.precio_mes_socio : rates.precio_mes_general);
  const dp=Array(ids.length+1).fill(Infinity); dp[0]=0;
  for(let i=1;i<=ids.length;i++){
    dp[i]=dp[i-1]+week;
    if(i>=2 && ids[i-1]===ids[i-2]+1) dp[i]=Math.min(dp[i],dp[i-2]+fortnight);
    if(i>=4 && ids.slice(i-4,i).every((v,j)=>v===ids[i-4]+j)) dp[i]=Math.min(dp[i],dp[i-4]+month);
  }
  return dp[ids.length];
}
async function sendCampusEmail({to,subject,html}) {
  const key=Deno.env.get('RESEND_API_KEY');
  if(!key) throw new Error('RESEND_API_KEY no configurada');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'CD Bustarviejo <noreply@cdbustarviejo.com>',to:[to],subject,html})});
  if(!response.ok) throw new Error(`Resend error ${response.status}: ${await response.text()}`);
  return true;
}
Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'', headers=cors(origin);
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(req.method!=='POST') return Response.json({error:'Método no permitido'},{status:405,headers});
  if(!ORIGINS.has(origin)) return Response.json({error:'Origen no autorizado'},{status:403,headers});
  try {
    const b=await req.json();
    const base44=createClientFromRequest(req);
    const adult={
      nombre:clean(b.adulto_nombre), dni:clean(b.adulto_dni).toUpperCase(),
      email:clean(b.adulto_email).toLowerCase(), telefono:clean(b.adulto_telefono),
      direccion:clean(b.adulto_direccion), municipio:clean(b.adulto_municipio),
      nacimiento:clean(b.adulto_fecha_nacimiento)
    };
    if(!adult.nombre||!adult.dni||!adult.email||!adult.telefono)
      return Response.json({error:'Completa nombre, DNI/NIE, correo y teléfono del adulto responsable.'},{status:400,headers});
    if(!adult.direccion||!adult.municipio||!adult.nacimiento)
      return Response.json({error:'Completa la dirección, el municipio y la fecha de nacimiento del adulto responsable.'},{status:400,headers});
    if(!isValidISODate(adult.nacimiento)) return Response.json({error:'La fecha de nacimiento del adulto no es una fecha válida.'},{status:400,headers});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adult.email)) return Response.json({error:'Correo electrónico no válido.'},{status:400,headers});
    if(b.consentimiento_datos!==true) return Response.json({error:'Es obligatorio aceptar la información de protección de datos para enviar la inscripción.'},{status:400,headers});
    if(b.consentimiento_salud!==true) return Response.json({error:'Es necesario aceptar el tratamiento de los datos de salud para gestionar la seguridad del menor.'},{status:400,headers});
    if(!Array.isArray(b.participantes)||!b.participantes.length) return Response.json({error:'Añade al menos un participante.'},{status:400,headers});
    if(b.participantes.length>4) return Response.json({error:'Cada responsable puede inscribir un máximo de 4 menores por edición. Para casos excepcionales, contacta directamente con el club.'},{status:400,headers});
    if(b.declaracion_responsable!==true) return Response.json({error:'Debes aceptar la declaración responsable sobre la veracidad de las fechas de nacimiento de los menores.'},{status:400,headers});
    const cfgs=await base44.asServiceRole.entities.CampusSettings.list('-created_date',100);
    // Solo se admiten inscripciones en la edición activa; si no hay ninguna activa, se conserva la configuración más reciente por compatibilidad.
    // Solo se admiten inscripciones en la edición activa: desactivar la edición cierra las inscripciones.
    const rates=(cfgs||[]).find(c=>c.activo===true);
    if(!rates?.id) return Response.json({error:'Las inscripciones del Campus están cerradas en este momento.'},{status:409,headers});
    if(!rates.fecha_inicio || !rates.fecha_inicio || !rates.fecha_fin) return Response.json({error:'No hay una edición del Campus configurada con fechas de inicio y fin.'},{status:409,headers});
    const campusYear=String(rates.temporada || rates.fecha_inicio.slice(0,4));
    const priorRegistrations=await base44.asServiceRole.entities.CampusRegistration.list('-created_date',1000);
    const normId=adult.dni.replace(/[.\s-]/g,'').toUpperCase();
    const sameResponsible=(priorRegistrations||[]).filter(r=>{
      const sameDni=String(r.adulto_dni||'').replace(/[.\s-]/g,'').toUpperCase()===normId;
      const sameEmail=String(r.adulto_email||'').trim().toLowerCase()===adult.email;
      const sameSeason=String(r.temporada||'2027')===campusYear;
      return sameSeason&&r.estado!=='cancelada'&&(sameDni||sameEmail);
    });
    const alreadyRegistered=sameResponsible.reduce((sum,r)=>sum+Number(r.participantes_count||0),0);
    if(alreadyRegistered+b.participantes.length>4) return Response.json({error:'Este DNI o correo ya tiene menores inscritos en esta edición y se superaría el máximo de 4 participantes por responsable. Contacta con el club para revisar el caso.'},{status:409,headers});
    const membershipSeason=`${campusYear}-${Number(campusYear)+1}`;
    let verifiedMember=null, verificationChallenge=null;
    if(b.es_socio===true){
      const verificationToken=clean(b.verification_token);
      if(!verificationToken) return Response.json({error:'Debes verificar el código enviado al correo del socio.'},{status:400,headers});
      const tokenHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verificationToken)))).map(x=>x.toString(16).padStart(2,'0')).join('');
      const matches=await base44.asServiceRole.entities.CampusMemberVerification.filter({verification_token_hash:tokenHash});
      verificationChallenge=(matches||[]).find(x=>!x.consumed&&new Date(x.token_expires_at||0).getTime()>Date.now())||null;
      if(!verificationChallenge) return Response.json({error:'La verificación ha caducado o ya se ha utilizado. Verifica de nuevo tu condición de socio.'},{status:400,headers});
      const candidates=await base44.asServiceRole.entities.ClubMember.filter({id:verificationChallenge.member_id});
      verifiedMember=candidates?.[0]||null;
      const today=new Date().toISOString().slice(0,10);
      const normalizeDni=value=>String(value||'').toUpperCase().replace(/[.\s-]/g,'');
      if(!verifiedMember||verifiedMember.activo!==true||String(verifiedMember.estado_pago||'').toLowerCase()!=='pagado'||(verifiedMember.fecha_vencimiento&&verifiedMember.fecha_vencimiento<today)||verifiedMember.email?.toLowerCase()!==adult.email||normalizeDni(verifiedMember.dni)!==normalizeDni(adult.dni))
        return Response.json({error:'La ficha verificada no coincide con los datos del responsable o ya no está activa y pagada.'},{status:400,headers});
    }
    const participants=b.participantes.map(p=>{
      const nombre=clean(p.nombre), fecha=clean(p.fecha_nacimiento), semanas=[...new Set(p.semanas||[])];
      const edad=ageOnStart(fecha,rates.fecha_inicio);
      if(!nombre||!isValidISODate(fecha)||!Number.isFinite(edad)||edad<6||edad>16||!semanas.length||semanas.some(w=>!WEEKS.includes(w)))
        throw new Error('Revisa el nombre, fecha de nacimiento y semanas seleccionadas de '+(nombre||'un participante')+'. El campus admite edades de 6 a 16 años.');
      const linked=!!verifiedMember;
      const applied=linked || b.solicitar_alta_socio===true;
      const authorized=Array.isArray(p.autorizados_recogida)?p.autorizados_recogida:[];
      const salidaModalidad=clean(p.salida_modalidad);
      const medicacionDurante=clean(p.medicacion_durante_campus);
      if(!clean(p.contacto_emergencia_nombre)||!clean(p.contacto_emergencia_telefono)) throw new Error('Indica al menos un contacto alternativo de emergencia, con nombre y teléfono, para '+nombre+'.');
      if(normalize(p.contacto_emergencia_nombre)===normalize(adult.nombre)||clean(p.contacto_emergencia_telefono).replace(/\D/g,'')===adult.telefono.replace(/\D/g,'')) throw new Error('El contacto alternativo de emergencia debe ser una persona distinta del responsable de '+nombre+'.');
      if(clean(p.alergias)&&!['ninguna','no'].includes(normalize(p.alergias))&&(!clean(p.alergia_gravedad)||!clean(p.alergia_reaccion))) throw new Error('Completa la gravedad y la reacción de la alergia indicada para '+nombre+'.');
      if(clean(p.alergia_gravedad)==='grave'&&!clean(p.protocolo_emergencia)) throw new Error('Indica el protocolo de actuación ante una alergia grave de '+nombre+'.');
      if(!['si','no'].includes(medicacionDurante)) throw new Error('Indica si '+nombre+' necesita recibir medicación durante el Campus.');
      if(medicacionDurante==='si'&&(!clean(p.medicacion)||!clean(p.instrucciones_medicacion)||p.autorizacion_medicacion!==true)) throw new Error('Para administrar medicación a '+nombre+' necesitamos el medicamento, las instrucciones y la autorización expresa de la familia.');
      if(!['recogida','salida_autonoma'].includes(salidaModalidad)) throw new Error('Indica cómo saldrá del Campus '+nombre+': recogida por un adulto o salida autónoma.');
      if(authorized.some(a=>!clean(a.nombre)||!clean(a.dni)||!clean(a.telefono))) throw new Error('Completa nombre, DNI/NIE y teléfono de cada persona autorizada para recoger a '+nombre+'.');
      if(salidaModalidad==='recogida' && authorized.length>0 && p.autorizacion_recogida!==true) throw new Error('Confirma la autorización expresa de recogida para '+nombre+'.');
      if(salidaModalidad==='salida_autonoma' && p.autorizacion_salida_solo!==true) throw new Error('Debes marcar la autorización expresa de salida autónoma para '+nombre+'.');
      if(salidaModalidad==='salida_autonoma' && authorized.length>0) throw new Error('Has elegido salida autónoma para '+nombre+'. Quita las personas autorizadas o cambia a recogida por un adulto.');
      if(salidaModalidad==='recogida' && p.autorizacion_salida_solo===true) throw new Error('La autorización de salida autónoma no corresponde a la modalidad de recogida para '+nombre+'.');
      return {nombre,fecha,edad,semanas,linked:applied,price:priceForWeeks(semanas,applied,rates),alergias:clean(p.alergias),alergia_gravedad:clean(p.alergia_gravedad),alergia_reaccion:clean(p.alergia_reaccion),protocolo_emergencia:clean(p.protocolo_emergencia),intolerancias:clean(p.intolerancias),medicacion:clean(p.medicacion),medicacion_durante_campus:medicacionDurante,instrucciones_medicacion:clean(p.instrucciones_medicacion),autorizacion_medicacion:p.autorizacion_medicacion===true,observaciones_medicas:clean(p.observaciones_medicas),contacto_emergencia_nombre:clean(p.contacto_emergencia_nombre),contacto_emergencia_telefono:clean(p.contacto_emergencia_telefono),contacto_emergencia_2_nombre:clean(p.contacto_emergencia_2_nombre),contacto_emergencia_2_telefono:clean(p.contacto_emergencia_2_telefono),autorizados_recogida:Array.isArray(p.autorizados_recogida)?p.autorizados_recogida.map(a=>({nombre:clean(a.nombre),dni:clean(a.dni).toUpperCase(),telefono:clean(a.telefono),parentesco:clean(a.parentesco)})).filter(a=>a.nombre&&a.dni&&a.telefono):[],autorizacion_recogida:p.autorizacion_recogida===true,salida_modalidad:salidaModalidad,autorizacion_salida_solo:p.autorizacion_salida_solo===true};
    });
    // Control de aforo: las solicitudes pendientes también ocupan plaza para evitar aceptar más inscripciones que capacidad.
    const existingParticipants=await base44.asServiceRole.entities.CampusParticipant.list('-created_date',2000);
    const registrationById=new Map((priorRegistrations||[]).map(r=>[r.id,r]));
    const activeExisting=(existingParticipants||[]).filter(p=>{
      if(String(p.temporada||'2027')!==campusYear || ['cancelado','lista_espera'].includes(p.estado)) return false;
      const parent=registrationById.get(p.registration_id);
      // Solo un participante de una inscripción pagada y confirmada ocupa plaza.
      // Los checkouts abiertos, abandonados, fallidos o en revisión no bloquean aforo.
      return !!parent && parent.estado === 'confirmada' && parent.estado_pago === 'pagado' && p.estado === 'confirmado';
    });
    const capacityField={'6-8':'plazas_6_8','9-11':'plazas_9_11','12-16':'plazas_12_16'};
    const demand=new Map();
    for(const p of participants) for(const week of p.semanas){
      const key=groupFor(p.edad)+'|'+week;
      demand.set(key,(demand.get(key)||0)+1);
    }
    for(const [key,requested] of demand){
      const [group,week]=key.split('|');
      const field=capacityField[group];
      const raw=rates[field];
      const limit=raw===undefined||raw===null||raw===''?null:Number(raw);
      const occupied=activeExisting.filter(p=>p.grupo_edad===group&&(p.semanas_ocupadas||[]).includes(week)).length;
      if(limit!==null && Number.isFinite(limit) && occupied+requested>limit)
        return Response.json({error:'No quedan plazas suficientes para el grupo '+group+' en '+week+'. Plazas disponibles: '+Math.max(0,limit-occupied)+'. Reduce la selección o elige otra semana.'},{status:409,headers});
    }
    if(rates.maximo_total!==undefined && rates.maximo_total!==null && rates.maximo_total!==''){
      const limit=Number(rates.maximo_total);
      if(Number.isFinite(limit)&&limit>0) for(const week of WEEKS){
        const requested=participants.filter(p=>p.semanas.includes(week)).length;
        if(requested===0) continue;
        const occupied=activeExisting.filter(p=>(p.semanas_ocupadas||[]).includes(week)).length;
        if(occupied+requested>limit) return Response.json({error:'Se ha alcanzado el máximo general del campus para '+week+'. Plazas disponibles: '+Math.max(0,limit-occupied)+'. Reduce la selección o elige otra semana.'},{status:409,headers});
      }
    }
    const membershipFee=b.solicitar_alta_socio===true?Number(rates.cuota_socio ?? 25):0;
    const total=participants.reduce((s,p)=>s+p.price,0)+membershipFee;
    const consentAt=new Date().toISOString();
    const reg=await base44.asServiceRole.entities.CampusRegistration.create({
      temporada:campusYear,campus_settings_id:rates.id,
      adulto_nombre:adult.nombre,adulto_dni:adult.dni,adulto_email:adult.email,adulto_telefono:adult.telefono,
      adulto_direccion:adult.direccion,adulto_municipio:adult.municipio,adulto_fecha_nacimiento:adult.nacimiento,
      adulto_tipo_inscripcion:clean(b.adulto_tipo_inscripcion)||'Nueva Inscripción',
      adulto_referido_por:clean(b.adulto_referido_por),
      segundo_progenitor_nombre:clean(b.segundo_progenitor_nombre),segundo_progenitor_email:clean(b.segundo_progenitor_email),
      segundo_progenitor_telefono:clean(b.segundo_progenitor_telefono),es_segundo_progenitor:b.es_segundo_progenitor===true,
      es_socio:!!verifiedMember,socio_verificado:!!verifiedMember,club_member_id:verifiedMember?.id||'',
      estado:'pendiente',estado_pago:'pendiente',estado_alta_socio:b.solicitar_alta_socio===true?'pendiente':verifiedMember?'pagado':'no_requerida',importe_total:total,cuota_socio_incluida:membershipFee,
      consentimiento_datos:true,consentimiento_datos_fecha:consentAt,consentimiento_datos_version:'campus-privacidad-2027-v1',
      consentimiento_imagen:b.consentimiento_imagen===true,consentimiento_imagen_fecha:consentAt,consentimiento_imagen_version:'campus-imagen-2027-v1',
      acepta_comunicaciones:b.acepta_comunicaciones===true,consentimiento_comercial_fecha:b.acepta_comunicaciones===true?consentAt:'',consentimiento_comercial_version:b.acepta_comunicaciones===true?'campus-comercial-v1.0':'',
      declaracion_responsable_edad:true,declaracion_responsable_fecha:new Date().toISOString(),declaracion_responsable_version:'campus-edad-2027-v1',
      semanas_solicitadas:[...new Set(participants.flatMap(p=>p.semanas))],participantes_count:participants.length,
      notas:`Inscripción recibida desde la web del Campus ${campusYear}. Pendiente de revisión y confirmación de plazas.`
    });
    const created=[];
    try {
      for(const p of participants){
        const modalidad=p.semanas.length===1?'semana':p.semanas.length===2?'quincena':p.semanas.length===4?'4_semanas':'combinada';
        const periodo=p.semanas.length===1?p.semanas[0]:p.semanas.length===4?'4_SEMANAS':'COMBINADA';
        const row=await base44.asServiceRole.entities.CampusParticipant.create({
          temporada:campusYear,campus_settings_id:rates.id,
          registration_id:reg.id,nombre:p.nombre,fecha_nacimiento:p.fecha,edad_inicio:p.edad,grupo_edad:groupFor(p.edad),
          modalidad,periodo,semanas_ocupadas:p.semanas,es_socio:p.linked,precio_aplicado:p.price,estado:'pendiente',
          alergias:p.alergias,alergia_gravedad:p.alergia_gravedad,alergia_reaccion:p.alergia_reaccion,protocolo_emergencia:p.protocolo_emergencia,intolerancias:p.intolerancias,medicacion:p.medicacion,medicacion_durante_campus:p.medicacion_durante_campus,instrucciones_medicacion:p.instrucciones_medicacion,autorizacion_medicacion:p.autorizacion_medicacion,autorizacion_medicacion_fecha:p.autorizacion_medicacion?consentAt:'',autorizacion_medicacion_version:p.autorizacion_medicacion?'campus-medicacion-2027-v1':'',observaciones_medicas:p.observaciones_medicas,
          contacto_emergencia_nombre:p.contacto_emergencia_nombre,contacto_emergencia_telefono:p.contacto_emergencia_telefono,contacto_emergencia_2_nombre:p.contacto_emergencia_2_nombre,contacto_emergencia_2_telefono:p.contacto_emergencia_2_telefono,autorizados_recogida:p.salida_modalidad==='recogida'?p.autorizados_recogida:[],autorizacion_recogida:p.salida_modalidad==='recogida'&&p.autorizacion_recogida===true,autorizacion_recogida_fecha:p.salida_modalidad==='recogida'&&p.autorizacion_recogida===true?consentAt:'',autorizacion_recogida_version:p.salida_modalidad==='recogida'&&p.autorizacion_recogida===true?'campus-recogida-2027-v1':'',salida_modalidad:p.salida_modalidad,autorizacion_salida_solo:p.salida_modalidad==='salida_autonoma'&&p.autorizacion_salida_solo===true,autorizacion_salida_fecha:p.salida_modalidad==='salida_autonoma'?new Date().toISOString():'',autorizacion_salida_version:p.salida_modalidad==='salida_autonoma'?'campus-salida-autonoma-v1': '',consentimiento_salud:b.consentimiento_salud===true,consentimiento_salud_fecha:consentAt,consentimiento_salud_version:'campus-salud-2027-v1',
          autorizacion_imagen:b.consentimiento_imagen===true?'si':'no'
        });
        created.push(row.id);
      }
    } catch(e) {
      await base44.asServiceRole.entities.CampusRegistration.update(reg.id,{estado:'revision',notas:'Error parcial al guardar participantes: '+e.message});
      throw e;
    }
    let provisionalMemberId='';
    if(b.solicitar_alta_socio===true){
      const temporada=membershipSeason;
      const existing=await base44.asServiceRole.entities.ClubMember.filter({email:adult.email,temporada});
      let member=existing?.[0]||null;
      if(member && String(member.dni||'').replace(/[.\s-]/g,'').toUpperCase()!==adult.dni.replace(/[.\s-]/g,'').toUpperCase())
        throw new Error('Ya existe una ficha con ese correo y otro DNI. El club debe revisarla antes de continuar.');
      if(!member){
        const all=await base44.asServiceRole.entities.ClubMember.list('-created_date',5000);
        const year=new Date().getFullYear();
        const used=new Set(all.map(x=>String(x.numero_socio||'')));
        let serial=1;
        while(used.has('CDB-'+year+'-'+String(serial).padStart(4,'0'))) serial++;
        const numeroSocio='CDB-'+year+'-'+String(serial).padStart(4,'0');
        member=await base44.asServiceRole.entities.ClubMember.create({
          numero_socio:numeroSocio,tipo_inscripcion:'Nueva Inscripción',
          nombre_completo:adult.nombre,dni:adult.dni,telefono:adult.telefono,email:adult.email,
          direccion:adult.direccion,municipio:adult.municipio,fecha_nacimiento:adult.nacimiento,
          es_socio_externo:false,es_socio_padre:false,cuota_socio:25,estado_pago:'Pendiente',metodo_pago:'Tarjeta',
          origen_pago:'campus',fecha_alta:new Date().toISOString().slice(0,10),
          fecha_vencimiento:`${Number(campusYear)+1}-06-30`,temporada,activo:false,notas:`Alta solicitada desde Campus Deportivo ${campusYear}. Pendiente de revisión y pago; NO activar hasta confirmar pago.`
        });
      }
      provisionalMemberId=member.id;
      const campusLinks=participants.map((p,i)=>({participante_id:created[i],participante_nombre:p.nombre}));
      await base44.asServiceRole.entities.ClubMember.update(member.id,{campus_participantes:[...(member.campus_participantes||[]),...campusLinks]});
      await base44.asServiceRole.entities.CampusRegistration.update(reg.id,{club_member_id:member.id,estado_alta_socio:'pendiente',notas:'Inscripción del Campus recibida. Alta de socio pendiente de pago. No se ha iniciado ningún cobro.'});
    }
    if(verifiedMember){
      const campusLinks=participants.map((p,i)=>({participante_id:created[i],participante_nombre:p.nombre}));
      await base44.asServiceRole.entities.ClubMember.update(verifiedMember.id,{campus_participantes:[...(verifiedMember.campus_participantes||[]),...campusLinks]});
    }
    const campusTestMode=Deno.env.get('CAMPUS_TEST_MODE')==='true';
    const stripeSecret=Deno.env.get(campusTestMode?'STRIPE_SECRET_KEY_TEST':'STRIPE_SECRET_KEY');
    if(!stripeSecret) throw new Error(campusTestMode?'Falta STRIPE_SECRET_KEY_TEST. No se ha iniciado ningún cobro.':'El pago con tarjeta no está configurado. No se ha realizado ningún cobro.');
    if(!Number.isFinite(total)||total<=0) throw new Error('El importe calculado no es válido.');
    const stripe=new Stripe(stripeSecret,{apiVersion:'2024-06-20'});
    const reference='CDB27-'+String(reg.id).replace(/[^a-zA-Z0-9]/g,'').slice(-8).toUpperCase();
    const site='https://www.cdbustarviejo.com/campus-verano-2027.html';
    const session=await stripe.checkout.sessions.create({
      mode:'payment',customer_email:adult.email,expires_at:Math.floor(Date.now()/1000)+31*60,
      line_items:[{price_data:{currency:'eur',unit_amount:Math.round(total*100),product_data:{name:'Campus Deportivo CD Bustarviejo 2027',description:participants.map(p=>p.nombre+' ('+p.semanas.join(', ')+')').join(' · ')}},quantity:1}],
      success_url:site+'?pago=correcto&ref='+encodeURIComponent(reference),
      cancel_url:site+'?pago=cancelado&ref='+encodeURIComponent(reference),
      metadata:{tipo:'campus_2027',campus_registration_id:String(reg.id),club_member_id:String(provisionalMemberId||verifiedMember?.id||''),new_member:b.solicitar_alta_socio===true?'true':'false',season:campusYear,reference,test_mode:campusTestMode?'true':'false'},
      payment_intent_data:{metadata:{tipo:'campus_2027',campus_registration_id:String(reg.id),reference,test_mode:campusTestMode?'true':'false'}}
    });
    await base44.asServiceRole.entities.CampusRegistration.update(reg.id,{stripe_session_id:session.id,notas:(campusTestMode?'[PRUEBA STRIPE TEST] ':'')+'Inscripción guardada. Checkout Stripe generado; pendiente de pago.'});
    if(b.acepta_comunicaciones===true){
      try {
        await base44.asServiceRole.entities.ConsentimientoComercial.create({
          nombre:adult.nombre,email:adult.email,telefono:adult.telefono,origen:'campus-verano-2027',
          acepta_promociones:true,acepta_patrocinadores:false,texto_version:'campus-comercial-v1.0',fecha:new Date().toISOString(),revocado:false
        });
      } catch(consentError) { console.error('[campusRegistrationSubmit] No se pudo guardar el consentimiento comercial:',consentError?.message||consentError); }
    }
    if(verificationChallenge) await base44.asServiceRole.entities.CampusMemberVerification.update(verificationChallenge.id,{consumed:true,used:true});
    return Response.json({success:true,registration_id:reg.id,reference,participants_saved:created.length,amount:total,club_member_id:provisionalMemberId||verifiedMember?.id||null,payment_started:true,payment_status:'pendiente',payment_url:session.url,message:'Inscripción guardada. Continúa a Stripe para completar el pago.'},{headers});
  } catch(e) {
    console.error('[campusRegistrationSubmit]',e?.message||e);
    return Response.json({error:e?.message||'No se ha podido guardar la inscripción.'},{status:400,headers});
  }
});