import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const WEEKS = ['S1','S2','S3','S4','S5'];
const cleanEmail = v => String(v || '').trim().toLowerCase();
const cleanDni = v => String(v || '').replace(/[\s.-]/g,'').toUpperCase();
const json = (data,status=200) => Response.json(data,{status});

Deno.serve(async req => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return json({error:'Debes iniciar sesión.'},401);
    const body = await req.json().catch(()=>({}));
    const action = String(body.action || '');
    const admin = user.role === 'admin';
    const sr = base44.asServiceRole;

    if (action === 'adminList' || action === 'adminSave' || action === 'adminDelete') {
      if (!admin) return json({error:'Solo administración puede gestionar permisos.'},403);
      const season = String(body.temporada || '2027');
      if (action === 'adminList') {
        const [assignments,users] = await Promise.all([
          sr.entities.CampusMonitorAccess.filter({temporada:season}),
          sr.entities.User.list('-created_date',1000)
        ]);
        const candidates = (users||[]).filter(u => u.acceso_activo !== false && !!cleanEmail(u.email))
          .map(u=>({email:cleanEmail(u.email),nombre:u.full_name||u.email,es_entrenador:!!u.es_entrenador,es_coordinador:!!u.es_coordinador}))
          .filter(u=>u.email);
        return json({assignments:assignments||[],candidates});
      }
      if (action === 'adminSave') {
        const email = cleanEmail(body.email);
        const weeks = [...new Set((Array.isArray(body.semanas)?body.semanas:[]).filter(w=>WEEKS.includes(w)))];
        if (!email || !weeks.length) return json({error:'Selecciona un usuario y al menos una semana.'},400);
        const candidates = await sr.entities.User.filter({email});
        const candidate = candidates?.[0];
        if (!candidate || candidate.acceso_activo === false)
          return json({error:'Ese correo no corresponde a una cuenta activa de la aplicación.'},400);
        const existing = await sr.entities.CampusMonitorAccess.filter({email,temporada:season});
        const data = {email,nombre:candidate.full_name||email,temporada:season,semanas,activo:body.activo !== false,asignado_por:user.email};
        const saved = existing?.[0] ? await sr.entities.CampusMonitorAccess.update(existing[0].id,data) : await sr.entities.CampusMonitorAccess.create(data);
        return json({ok:true,assignment:saved});
      }
      if (action === 'adminDelete') {
        const id = String(body.id||'');
        if (!id) return json({error:'Falta el permiso que quieres eliminar.'},400);
        await sr.entities.CampusMonitorAccess.delete(id);
        return json({ok:true});
      }
    }

    if (action === 'roster' || action === 'weekRoster' || action === 'saveAttendance') {
      const season = String(body.temporada || '');
      const week = String(body.semana || '');
      const date = String(body.fecha || '');
      if (!/^20\d{2}$/.test(season) || !WEEKS.includes(week) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        return json({error:'Temporada, semana o fecha no válidas.'},400);
      const accessRows = await sr.entities.CampusMonitorAccess.filter({email:cleanEmail(user.email),temporada:season,activo:true});
      const access = accessRows?.find(a=>(a.semanas||[]).includes(week));
      if (!admin && !access) return json({error:'No tienes permiso para acceder a esta semana del Campus.'},403);

      const configs = await sr.entities.CampusSettings.filter({temporada:season});
      const cfg = configs?.find(c=>c.activo===true) || configs?.[0];
      if (!cfg?.fecha_inicio) return json({error:'No hay fechas configuradas para esta edición.'},409);
      const weekIndex = WEEKS.indexOf(week);
      const start = new Date(cfg.fecha_inicio+'T12:00:00');
      start.setDate(start.getDate()+weekIndex*7);
      const allowedDates = Array.from({length:5},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);});
      if (!allowedDates.includes(date)) return json({error:'La fecha no pertenece a los cinco días laborables de la semana seleccionada.'},403);

      const [participants,registrations,attendance] = await Promise.all([
        sr.entities.CampusParticipant.list('-created_date',3000),
        sr.entities.CampusRegistration.list('-created_date',2000),
        action === 'weekRoster' ? sr.entities.CampusAttendance.filter({temporada:season,semana:week}) : sr.entities.CampusAttendance.filter({temporada:season,fecha:date})
      ]);
      const regs = new Map((registrations||[]).map(r=>[r.id,r]));
      const roster = (participants||[]).filter(p=>{
        const reg=regs.get(p.registration_id);
        return String(p.temporada||reg?.temporada||'2027')===season &&
          (p.semanas_ocupadas||[]).includes(week) &&
          !['cancelado','lista_espera'].includes(String(p.estado||'').toLowerCase()) &&
          (!reg || !['cancelada','revision'].includes(String(reg.estado||'').toLowerCase()));
      }).map(p=>{
        const reg=regs.get(p.registration_id)||{};
        return {
          id:p.id,nombre:p.nombre,registration_id:p.registration_id,
          fecha_nacimiento:p.fecha_nacimiento||'',grupo_edad:p.grupo_edad||'',
          alergias:p.alergias||'',intolerancias:p.intolerancias||'',medicacion:p.medicacion||'',
          observaciones_medicas:p.observaciones_medicas||'',
          contacto_emergencia_nombre:p.contacto_emergencia_nombre||'',
          contacto_emergencia_telefono:p.contacto_emergencia_telefono||'',
          contacto_emergencia_2_nombre:p.contacto_emergencia_2_nombre||'',
          contacto_emergencia_2_telefono:p.contacto_emergencia_2_telefono||'',
          autorizado_recogida:[
            ...(Array.isArray(p.autorizados_recogida)?p.autorizados_recogida.map(a=>({nombre:a.nombre||'',dni:a.dni||'',telefono:a.telefono||'',parentesco:a.parentesco||'',tipo:'autorizado'})):[]),
            ...(reg.adulto_nombre?[{nombre:reg.adulto_nombre,dni:reg.adulto_dni||'',telefono:reg.adulto_telefono||'',parentesco:'Responsable legal',tipo:'responsable'}]:[])
          ].filter((a,i,list)=>a.nombre&&list.findIndex(x=>cleanEmail(x.nombre)===cleanEmail(a.nombre)&&cleanDni(x.dni)===cleanDni(a.dni))===i),
          responsable:{nombre:reg.adulto_nombre||'',dni:reg.adulto_dni||'',telefono:reg.adulto_telefono||''}
        };
      }).sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'));
      if (action === 'roster' || action === 'weekRoster') return json({roster,records:action === 'weekRoster' ? (attendance||[]).filter(r=>allowedDates.includes(r.fecha)) : (attendance||[]),week,dates:allowedDates,monitor:{nombre:user.full_name||user.email}});
      const participant = roster.find(p=>p.id===String(body.participant_id||''));
      if (!participant) return json({error:'El menor no pertenece a tu lista autorizada de esta semana.'},403);
      const patch = body.patch || {};
      const existing = (attendance||[]).find(r=>r.participant_id===participant.id);
      const allowedStates = ['pendiente','presente','ausente'];
      const data = {
        temporada:season,participant_id:participant.id,registration_id:participant.registration_id,
        semana:week,fecha:date,estado:allowedStates.includes(patch.estado)?patch.estado:(existing?.estado||'pendiente'),
        hora_entrada:existing?.hora_entrada||'',hora_salida:existing?.hora_salida||'',
        persona_recoge:existing?.persona_recoge||'',dni_recoge:existing?.dni_recoge||'',
        recogida_verificada:existing?.recogida_verificada===true,
        historial:Array.isArray(existing?.historial)?existing.historial:[],
      };
      if (patch.hora_entrada !== undefined) data.hora_entrada=String(patch.hora_entrada||'').slice(0,5);
      if (patch.hora_salida !== undefined) data.hora_salida=String(patch.hora_salida||'').slice(0,5);
      if (patch.recogida_verificada === true) {
        const name=String(patch.persona_recoge||'').trim();
        const dni=cleanDni(patch.dni_recoge);
        const match=(participant.autorizado_recogida||[]).some(a=>a.nombre.trim().toLocaleLowerCase('es')===name.toLocaleLowerCase('es')&&cleanDni(a.dni)===dni) ||
          (participant.responsable.nombre.trim().toLocaleLowerCase('es')===name.toLocaleLowerCase('es')&&cleanDni(participant.responsable.dni)===dni);
        if (!name || !dni || !match) return json({error:'Recogida rechazada: el nombre y DNI no coinciden con una persona autorizada.'},403);
        data.persona_recoge=name; data.dni_recoge=dni; data.recogida_verificada=true;
        data.hora_salida=String(patch.hora_salida||new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false}));
        data.estado='presente';
      }
      const actionLabel=String(body.audit?.accion||'actualización').slice(0,60);
      const detail=String(body.audit?.detalle||'Registro actualizado').slice(0,240);
      data.historial=[...data.historial,{accion:actionLabel,detalle:detail,usuario:user.full_name||user.email,fecha_hora:new Date().toISOString()}].slice(-200);
      data.actualizado_por=user.full_name||user.email; data.actualizado_en=new Date().toISOString();
      const saved=existing?await sr.entities.CampusAttendance.update(existing.id,data):await sr.entities.CampusAttendance.create(data);
      return json({ok:true,record:saved});
    }
    return json({error:'Acción no reconocida.'},400);
  } catch (error) {
    console.error('[campusAttendanceGateway]',error);
    return json({error:error?.message||'Error interno.'},500);
  }
});