import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ORIGINS = new Set(['https://www.cdbustarviejo.com','https://cdbustarviejo.com']);
const WEEKS = ['S1','S2','S3','S4','S5'];
const clean = v => String(v ?? '').trim();
function isValidISODate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function ageAtCampus(birth) {
  if (!isValidISODate(birth)) return null;
  const [year, month, day] = String(birth).split('-').map(Number);
  const start = new Date('2027-06-28T00:00:00Z');
  let age = start.getUTCFullYear() - year;
  if (start.getUTCMonth() + 1 < month || (start.getUTCMonth() + 1 === month && start.getUTCDate() < day)) age--;
  return age;
}

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
    const email = clean(body.adulto_email).toLowerCase();
    const menores = Array.isArray(body.menores) ? body.menores : [];
    if (!adulto || !telefono || !email) return Response.json({error:'Indica nombre, teléfono y correo del adulto responsable.'},{status:400,headers});
    if (!/^[-+()\d\s]{6,25}$/.test(telefono)) return Response.json({error:'Introduce un teléfono válido.'},{status:400,headers});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({error:'Introduce un correo electrónico válido.'},{status:400,headers});
    if (!menores.length || menores.length > 4) return Response.json({error:'Añade al menos un menor (máximo 4 por responsable).'}, {status:400,headers});
    const base44 = createClientFromRequest(req);
    const cfgs = await base44.asServiceRole.entities.CampusSettings.list('-created_date',100);
    const settings = (cfgs || []).find(x => x.activo === true && String(x.temporada || '') === '2027');
    if (!settings?.id || settings.lista_espera_activa !== true) return Response.json({error:'La lista de espera del Campus no está abierta en este momento.'},{status:409,headers});
    const [registrations, participants] = await Promise.all([
      base44.asServiceRole.entities.CampusRegistration.list('-created_date',2000),
      base44.asServiceRole.entities.CampusParticipant.list('-created_date',3000)
    ]);
    const registrationById = new Map((registrations || []).map(r => [r.id,r]));
    const active = (participants || []).filter(p => {
      if (String(p.temporada || '2027') !== '2027' || ['cancelado','lista_espera'].includes(String(p.estado || '').toLowerCase())) return false;
      const parent = registrationById.get(p.registration_id);
      // Solo una inscripción pagada y confirmada ocupa aforo.
      // Las solicitudes de pago sin confirmar no impiden entrar en lista de espera.
      return !!parent && String(parent.estado || '').toLowerCase() === 'confirmada' &&
        String(parent.estado_pago || '').toLowerCase() === 'pagado' &&
        String(p.estado || '').toLowerCase() === 'confirmado';
    });
    const capacities = {'6-8':settings.plazas_6_8,'9-11':settings.plazas_9_11,'12-16':settings.plazas_12_16};
    const cleanMinors = menores.map(m => {
      const nombre = clean(m.nombre);
      const fecha = clean(m.fecha_nacimiento);
      const edad = ageAtCampus(fecha);
      const semanas = [...new Set(Array.isArray(m.semanas) ? m.semanas : [])].filter(w => WEEKS.includes(w));
      if (!nombre || edad === null || edad < 6 || edad > 16 || !semanas.length) throw new Error('Revisa el nombre, la fecha de nacimiento y las semanas. La edad debe ser de 6 a 16 años el 28/06/2027.');
      const grupo = edad <= 8 ? '6-8' : edad <= 11 ? '9-11' : '12-16';
      for (const semana of semanas) {
        const cap = capacities[grupo] === undefined || capacities[grupo] === null || capacities[grupo] === '' ? null : Number(capacities[grupo]);
        const occupied = active.filter(p => p.grupo_edad === grupo && (p.semanas_ocupadas || []).includes(semana)).length;
        const generalCap = settings.maximo_total === undefined || settings.maximo_total === null || settings.maximo_total === '' ? null : Number(settings.maximo_total);
        const generalOccupied = active.filter(p => (p.semanas_ocupadas || []).includes(semana)).length;
        const full = (cap !== null && occupied >= cap) || (generalCap !== null && generalCap > 0 && generalOccupied >= generalCap);
        if (!full) throw new Error('La semana ' + semana + ' ya tiene plazas disponibles. Actualiza la disponibilidad e inscríbete por el formulario habitual.');
      }
      return {nombre,fecha,edad, semanas,grupo};
    });
    const existingWaitlist = await base44.asServiceRole.entities.CampusWaitlistEntry.list('-created_date',3000);
    const activeWaitlist = (existingWaitlist || []).filter(row => ['pendiente','contactado'].includes(String(row.estado || '').toLowerCase()));
    const normalizeName = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
    const rows = [];
    const duplicates = [];
    for (const menor of cleanMinors) for (const semana of menor.semanas) {
      const duplicate = activeWaitlist.some(row =>
        String(row.temporada || '2027') === '2027' && row.semana === semana &&
        normalizeName(row.menor_nombre) === normalizeName(menor.nombre) &&
        (String(row.adulto_email || '').trim().toLowerCase() === email || String(row.adulto_telefono || '').replace(/\D/g,'') === telefono.replace(/\D/g,''))
      );
      if (duplicate) { duplicates.push({menor:menor.nombre,semana}); continue; }
      rows.push({
        temporada:'2027',adulto_nombre:adulto,adulto_telefono:telefono,adulto_email:email,
        menor_nombre:menor.nombre,fecha_nacimiento:menor.fecha,edad:menor.edad,grupo_edad:menor.grupo,
        semana,estado:'pendiente'
      });
    }
    if (!rows.length) return Response.json({success:true,duplicate:true,solicitudes:0,duplicadas:duplicates.length,message:'Esta solicitud ya está en la lista de espera. No se ha creado otra entrada.'},{headers});
    const solicitudId = crypto.randomUUID();
    for (const row of rows) await base44.asServiceRole.entities.CampusWaitlistEntry.create({...row,solicitud_id:solicitudId});
    return Response.json({success:true,solicitud_id:solicitudId,menores:cleanMinors.length,solicitudes:rows.length,duplicadas:duplicates.length,message:duplicates.length?'Se han añadido las semanas nuevas; las solicitudes que ya existían no se han duplicado.':'Solicitud añadida a la lista de espera. No se ha realizado ningún pago ni reservado una plaza.'},{headers});
  } catch (error) {
    console.error('[campusWaitlistSubmit]',error?.message || error);
    return Response.json({error:error?.message || 'No se ha podido guardar la solicitud.'},{status:400,headers});
  }
});