import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Permitir CORS para acceso público
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const base44 = createClientFromRequest(req);
    const data = await req.json();

    // Validar campos obligatorios
    if (!data.nombre_jugadora || !data.nombre_padre || !data.email || !data.telefono) {
      return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Obtener temporada activa usando service role
    let temporada = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    try {
      const configs = await base44.asServiceRole.entities.SeasonConfig.list();
      const activeConfig = configs.find(c => c.activa === true);
      if (activeConfig?.temporada) {
        temporada = activeConfig.temporada;
      }
    } catch (e) {
      console.log('Error getting season config:', e);
    }

    // Crear el registro de interés usando service role (no requiere auth del usuario)
    const interest = await base44.asServiceRole.entities.FemeninoInterest.create({
      nombre_jugadora: data.nombre_jugadora,
      fecha_nacimiento: data.fecha_nacimiento || null,
      nombre_padre: data.nombre_padre,
      email: data.email,
      telefono: data.telefono,
      municipio: data.municipio || "",
      experiencia_previa: data.experiencia_previa || "",
      como_nos_conocio: data.como_nos_conocio || "",
      mensaje: data.mensaje || "",
      referido_por_email: data.referido_por_email || "",
      referido_por_nombre: data.referido_por_nombre || "",
      estado: "Nuevo",
      temporada: temporada
    });

    // Notificar al admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo - Fútbol Femenino",
        to: "cdbustarviejo@gmail.com",
        subject: `⚽👧 ¡Nueva interesada en Fútbol Femenino! - ${data.nombre_jugadora}`,
        body: `¡Tenemos una nueva interesada en el equipo de Fútbol Femenino!

👧 DATOS DE LA JUGADORA:
• Nombre: ${data.nombre_jugadora}
• Fecha de nacimiento: ${data.fecha_nacimiento || "No indicada"}
• Experiencia: ${data.experiencia_previa || "No indicada"}

👨‍👩‍👧 DATOS DE CONTACTO:
• Padre/Madre/Tutor: ${data.nombre_padre}
• Email: ${data.email}
• Teléfono: ${data.telefono}
• Municipio: ${data.municipio || "No indicado"}

📣 ¿Cómo nos conoció?: ${data.como_nos_conocio || "No indicado"}
${data.referido_por_nombre ? `🎁 REFERIDO POR: ${data.referido_por_nombre} (${data.referido_por_email}) - ¡Aplicar bonus si se inscribe!` : ""}

💬 Mensaje: ${data.mensaje || "Sin mensaje"}

---
Accede al panel de administración para gestionar esta solicitud.`
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    return Response.json({ 
      success: true, 
      id: interest.id 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});