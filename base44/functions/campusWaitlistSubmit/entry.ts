import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ORIGINS = new Set(['https://www.cdbustarviejo.com','https://cdbustarviejo.com']);
const WEEKS = ['S1','S2','S3','S4','S5'];
const clean = v => String(v ?? '').trim();

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  const headers = {
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://www.cdbustarviejo.com',
    'Vary':'Origin',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Content-Type':'application/json'
  };
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return Response.json({error:'Método no permitido'},{status:405,headers});
  if (!ORIGINS.has(origin)) return Response.json({error:'Origen no autorizado'},{status:403,headers});
  try {
    const body = await req.json();
    const adulto = clean(body.adulto_nombre);
    const telefono = clean(body.adulto_telefono);
    const menores = Array.isArray(body.menores) ? body.menores : [];
    if (!adulto || !telefono) return Response.json({error:'Indica el nombre y apellidos y el teléfono del adulto responsable.'},{status:400,headers});
    if (!/^[-+()\d\s]{6,25}$/.test(telefono)) return Response.json({error:'Introduce un teléfono válido.'},{status:400,headers});
    if (!menores.length || menores.length > 8) return Response.json({error:'Añade al menos un menor (máximo 8 por solicitud).'}, {status:400,headers});
    const cfgs = await createClientFromRequest(req).asServiceRole.entities.CampusSettings.list('-created_date',100);
    const settings = (cfgs || []).find(x => x.activo === true && String(x.temporada || '') === '2027');
    if (!settings?.id) return Response.json({error:'La lista de espera del Campus no está abierta en este momento.'},{status:409,headers});
    const cleanMinors = menores.map(m => {
      const nombre = clean(m.nombre);
      const edad = Number(m.edad);
      const semanas = [...new Set(Array.isArray(m.semanas) ? m.semanas : [])].filter(w => WEEKS.includes(w));
      if (!nombre || !Number.isInteger(edad) || edad < 6 || edad > 16 || !semanas.length) throw new Error('Revisa el nombre, la edad y las semanas de cada menor. Se admiten edades de 6 a 16 años.');
      return {nombre,edad,semanas,grupo:edad<=8?'6-8':edad<=11?'9-11':'12-16'};
    });
    const base44 = createClientFromRequest(req);
    const solicitudId = crypto.randomUUID();
    const rows = [];
    for (const menor of cleanMinors) {
      for (const semana of menor.semanas) {
        rows.push({
          temporada:'2027',solicitud_id:solicitudId,
          adulto_nombre:adulto,adulto_telefono:telefono,
          menor_nombre:menor.nombre,edad:menor.edad,grupo_edad:menor.grupo,
          semana,estado:'pendiente'
        });
      }
    }
    for (const row of rows) {
      await base44.asServiceRole.entities.CampusWaitlistEntry.create(row);
    }
    return Response.json({success:true,solicitud_id:solicitudId,menores:cleanMinors.length,solicitudes:rows.length,message:'Solicitud añadida a la lista de espera.'},{headers});
  } catch (error) {
    console.error('[campusWaitlistSubmit]',error?.message || error);
    return Response.json({error:error?.message || 'No se ha podido guardar la solicitud.'},{status:400,headers});
  }
});