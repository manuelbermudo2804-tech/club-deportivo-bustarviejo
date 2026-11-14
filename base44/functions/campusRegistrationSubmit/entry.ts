import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ORIGINS = new Set(['https://www.cdbustarviejo.com','https://cdbustarviejo.com']);
const WEEKS = ['S1','S2','S3','S4','S5'];
const WEEK_DATES = {
  S1:['2027-06-28','2027-07-02'], S2:['2027-07-05','2027-07-09'],
  S3:['2027-07-12','2027-07-16'], S4:['2027-07-19','2027-07-23'],
  S5:['2027-07-26','2027-07-30']
};
const cors = origin => ({
  'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://www.cdbustarviejo.com',
  'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'
});
const clean = v => String(v || '').trim();
const normalize = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
function ageOnStart(date) {
  // Criterio de año natural: edad = 2027 menos año de nacimiento.
  return 2027 - Number(String(date).slice(0,4));
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
    if(!adult.nombre||!adult.dni||!adult.email||!adult.telefono||!adult.direccion||!adult.municipio||!adult.nacimiento)
      return Response.json({error:'Completa todos los datos obligatorios del adulto responsable.'},{status:400,headers});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adult.email)) return Response.json({error:'Correo electrónico no válido.'},{status:400,headers});
    if(b.consentimiento_datos!==true) return Response.json({error:'Es obligatorio aceptar la información de protección de datos para enviar la inscripción.'},{status:400,headers});
    if(b.consentimiento_salud!==true) return Response.json({error:'Es necesario aceptar el tratamiento de los datos de salud para gestionar la seguridad del menor.'},{status:400,headers});
    if(!Array.isArray(b.participantes)||!b.participantes.length) return Response.json({error:'Añade al menos un participante.'},{status:400,headers});
    if(b.participantes.length>6) return Response.json({error:'Cada inscripción admite un máximo de 6 menores. Para grupos o inscripciones especiales, contacta directamente con el club.'},{status:400,headers});
    if(b.declaracion_responsable!==true) return Response.json({error:'Debes declarar que eres padre, madre, tutor legal o persona expresamente autorizada para inscribir a estos menores.'},{status:400,headers});
    const priorRegistrations=await base44.asServiceRole.entities.CampusRegistration.list('-created_date',1000);
    const normId=adult.dni.replace(/[.\\s-]/g,'').toUpperCase();
    const sameResponsible=(priorRegistrations||[]).filter(r=>{
      const sameDni=String(r.adulto_dni||'').replace(/[.\\s-]/g,'').toUpperCase()===normId;
      const sameEmail=String(r.adulto_email||'').trim().toLowerCase()===adult.email;
      return sameDni||sameEmail;
    });
    const alreadyRegistered=sameResponsible.reduce((sum,r)=>sum+Number(r.participantes_count||0),0);
    if(alreadyRegistered+b.participantes.length>6) return Response.json({error:'Este DNI o correo ya tiene menores inscritos y se superaría el máximo de 6 participantes por responsable. Contacta con el club para revisar una inscripción de grupo.'},{status:409,headers});
    const cfgs=await base44.asServiceRole.entities.CampusSettings.list('-created_date',5);
    const rates=cfgs?.[0]||{precio_semana_general:60,precio_semana_socio:55,precio_quincena_general:110,precio_quincena_socio:95,precio_mes_general:200,precio_mes_socio:170};
    const memberId=clean(b.club_member_id);
    let verifiedMember=null;
    if(b.es_socio===true){
      if(!memberId) return Response.json({error:'No se ha verificado la ficha de socio.'},{status:400,headers});
      const candidates=await base44.asServiceRole.entities.ClubMember.filter({id:memberId});
      verifiedMember=candidates?.[0]||null;
      if(!verifiedMember || verifiedMember.activo!==true || String(verifiedMember.estado_pago).toLowerCase()!=='pagado' || verifiedMember.email?.toLowerCase()!==adult.email || String(verifiedMember.dni||'').replace(/[.\\s-]/g,'').toUpperCase()!==adult.dni.replace(/[.\\s-]/g,'').toUpperCase())
        return Response.json({error:'La ficha de socio ya no aparece activa y pagada. Vuelve a verificarla.'},{status:400,headers});
    }
    const participants=b.participantes.map(p=>{
      const nombre=clean(p.nombre), fecha=clean(p.fecha_nacimiento), semanas=[...new Set(p.semanas||[])];
      const edad=ageOnStart(fecha);
      if(!nombre||!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||ageOnStart(fecha)<6||edad>16||!semanas.length||semanas.some(w=>!WEEKS.includes(w)))
        throw new Error('Revisa el nombre, fecha de nacimiento y semanas seleccionadas de '+(nombre||'un participante')+'. El campus admite edades de 6 a 16 años.');
      const linked=!!(verifiedMember && [...(verifiedMember.jugadores_hijos||[]),...(verifiedMember.jugadores_relacionados||[]),...(verifiedMember.campus_participantes||[])].some(x=>normalize(x.jugador_nombre||x.participante_nombre)===normalize(nombre)));
      const applied=linked || b.solicitar_alta_socio===true;
      return {nombre,fecha,edad,semanas,linked:applied,price:priceForWeeks(semanas,applied,rates),alergias:clean(p.alergias),intolerancias:clean(p.intolerancias),medicacion:clean(p.medicacion),observaciones_medicas:clean(p.observaciones_medicas),contacto_emergencia_nombre:clean(p.contacto_emergencia_nombre),contacto_emergencia_telefono:clean(p.contacto_emergencia_telefono)};
    });
    const membershipFee=b.solicitar_alta_socio===true?25:0;
    const total=participants.reduce((s,p)=>s+p.price,0)+membershipFee;
    const reg=await base44.asServiceRole.entities.CampusRegistration.create({
      adulto_nombre:adult.nombre,adulto_dni:adult.dni,adulto_email:adult.email,adulto_telefono:adult.telefono,
      adulto_direccion:adult.direccion,adulto_municipio:adult.municipio,adulto_fecha_nacimiento:adult.nacimiento,
      adulto_tipo_inscripcion:clean(b.adulto_tipo_inscripcion)||'Nueva Inscripción',
      adulto_referido_por:clean(b.adulto_referido_por),
      segundo_progenitor_nombre:clean(b.segundo_progenitor_nombre),segundo_progenitor_email:clean(b.segundo_progenitor_email),
      segundo_progenitor_telefono:clean(b.segundo_progenitor_telefono),es_segundo_progenitor:b.es_segundo_progenitor===true,
      es_socio:!!verifiedMember,socio_verificado:!!verifiedMember,club_member_id:verifiedMember?.id||'',
      estado:'pendiente',estado_pago:'pendiente',estado_alta_socio:b.solicitar_alta_socio===true?'pendiente':verifiedMember?'pagado':'no_requerida',importe_total:total,cuota_socio_incluida:membershipFee,
      consentimiento_datos:true,consentimiento_imagen:b.consentimiento_imagen===true,
      semanas_solicitadas:[...new Set(participants.flatMap(p=>p.semanas))],participantes_count:participants.length,
      notas:'Inscripción recibida desde la web del Campus 2027. Pendiente de revisión y confirmación de plazas.'
    });
    const created=[];
    try {
      for(const p of participants){
        const modalidad=p.semanas.length===1?'semana':p.semanas.length===2?'quincena':p.semanas.length===4?'4_semanas':'combinada';
        const periodo=p.semanas.length===1?p.semanas[0]:p.semanas.length===4?'4_SEMANAS':'COMBINADA';
        const row=await base44.asServiceRole.entities.CampusParticipant.create({
          registration_id:reg.id,nombre:p.nombre,fecha_nacimiento:p.fecha,edad_inicio:p.edad,grupo_edad:groupFor(p.edad),
          modalidad,periodo,semanas_ocupadas:p.semanas,es_socio:p.linked,precio_aplicado:p.price,estado:'pendiente',
          alergias:p.alergias,intolerancias:p.intolerancias,medicacion:p.medicacion,observaciones_medicas:p.observaciones_medicas,
          contacto_emergencia_nombre:p.contacto_emergencia_nombre,contacto_emergencia_telefono:p.contacto_emergencia_telefono,consentimiento_salud:b.consentimiento_salud===true,
          autorizacion_imagen:b.consentimiento_imagen===true?'si':'pendiente'
        });
        created.push(row.id);
      }
    } catch(e) {
      await base44.asServiceRole.entities.CampusRegistration.update(reg.id,{estado:'revision',notas:'Error parcial al guardar participantes: '+e.message});
      throw e;
    }
    let provisionalMemberId='';
    if(b.solicitar_alta_socio===true){
      const temporada='2026-2027';
      const existing=await base44.asServiceRole.entities.ClubMember.filter({email:adult.email,temporada});
      let member=existing?.[0]||null;
      if(member && String(member.dni||'').replace(/[.\\s-]/g,'').toUpperCase()!==adult.dni.replace(/[.\\s-]/g,'').toUpperCase())
        throw new Error('Ya existe una ficha con ese correo y otro DNI. El club debe revisarla antes de continuar.');
      if(!member){
        const all=await base44.asServiceRole.entities.ClubMember.list();
        const serial=all.filter(x=>x.numero_socio&&x.numero_socio.includes('CDB-2026')).length+1;
        member=await base44.asServiceRole.entities.ClubMember.create({
          numero_socio:'CDB-2026-'+String(serial).padStart(4,'0'),tipo_inscripcion:'Nueva Inscripción',
          nombre_completo:adult.nombre,dni:adult.dni,telefono:adult.telefono,email:adult.email,
          direccion:adult.direccion,municipio:adult.municipio,fecha_nacimiento:adult.nacimiento,
          es_socio_externo:false,es_socio_padre:true,cuota_socio:25,estado_pago:'Pendiente',metodo_pago:'Tarjeta',
          temporada,activo:false,notas:'Alta solicitada desde Campus Deportivo 2027. Pendiente de revisión y pago; NO activar hasta confirmar pago.'
        });
      }
      provisionalMemberId=member.id;
      const campusLinks=participants.map((p,i)=>({participante_id:created[i],participante_nombre:p.nombre}));
      await base44.asServiceRole.entities.ClubMember.update(member.id,{campus_participantes:[...(member.campus_participantes||[]),...campusLinks]});
      await base44.asServiceRole.entities.CampusRegistration.update(reg.id,{club_member_id:member.id,estado_alta_socio:'pendiente',notas:'Inscripción de prueba guardada. Alta de socio pendiente de revisión y pago. NO se ha iniciado ningún cobro.'});
    }
    if(verifiedMember){
      const campusLinks=participants.map((p,i)=>({participante_id:created[i],participante_nombre:p.nombre}));
      await base44.asServiceRole.entities.ClubMember.update(verifiedMember.id,{campus_participantes:[...(verifiedMember.campus_participantes||[]),...campusLinks]});
    }
    return Response.json({success:true,registration_id:reg.id,participants_saved:created.length,amount:total,club_member_id:provisionalMemberId||verifiedMember?.id||null,payment_started:false,message:'Solicitud de prueba guardada en Base44. No se ha iniciado ningún pago; queda pendiente de revisión del club.'},{headers});
  } catch(e) {
    console.error('[campusRegistrationSubmit]',e?.message||e);
    return Response.json({error:e?.message||'No se ha podido guardar la inscripción.'},{status:400,headers});
  }
});