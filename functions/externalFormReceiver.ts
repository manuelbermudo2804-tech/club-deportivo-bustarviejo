import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    // 1. CORS Headers for Wix (or any external site)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const base44 = createClientFromRequest(req);
        
        // 2. Parse Incoming Data
        const body = await req.json();
        const { type, ...data } = body; 
        // type: 'socio' | 'femenino'

        console.log(`📥 [ExternalForm] Recibido tipo: ${type}`, data);

        // 3. Resolve Referral Code (Optional)
        let referrerEmail = null;
        let referrerName = null;

        if (data.referido_por_codigo) {
            try {
                // Code is first 8 chars of ID. We fetch members to find a match.
                // Optimización: Si el club crece mucho, esto debería mejorarse.
                // Por ahora, asumimos que el ID del socio (User ID) está en ClubMember.
                // Pero ClubMember no tiene user_id explícito en el schema mostrado, 
                // aunque suele tener email que linkea al usuario.
                // Vamos a buscar por email si el código fuera el email, o intentar matching.
                // Asumimos que el código viene limpio.
                
                // Intentamos buscar en ClubMember
                const members = await base44.asServiceRole.entities.ClubMember.list(); // Service role para leer todo
                const referrer = members.find(m => m.id.substring(0, 8).toUpperCase() === data.referido_por_codigo);
                
                if (referrer) {
                    referrerEmail = referrer.email;
                    referrerName = referrer.nombre_completo;
                    console.log(`✅ Referido encontrado: ${referrerName} (${referrerEmail})`);
                }
            } catch (e) {
                console.error("Error resolviendo referido:", e);
            }
        }

        // 4. Handle 'socio' (New Club Member)
        if (type === 'socio') {
            await base44.asServiceRole.entities.ClubMember.create({
                tipo_inscripcion: 'Nueva Inscripción',
                nombre_completo: data.nombre_completo || data.nombre,
                dni: data.dni,
                email: data.email,
                telefono: data.telefono,
                direccion: data.direccion,
                municipio: data.municipio,
                fecha_nacimiento: data.fecha_nacimiento, // YYYY-MM-DD
                
                es_socio_externo: true,
                es_socio_padre: false,
                estado_pago: 'Pendiente', // Importante
                metodo_pago: 'Tarjeta', // Asumimos que pagarán con el link de Stripe después
                
                temporada: '2024-2025', // Debería ser dinámico, pero hardcodeamos la actual por seguridad
                activo: true,
                
                referido_por: referrerName || data.referido_por_manual || data.referido_por_codigo,
                referido_por_email: referrerEmail,
                
                notas: 'Inscripción vía Web Externa'
            });
        } 
        // 5. Handle 'femenino' OR 'jugador' (Generic Interest)
        else if (type === 'femenino' || type === 'jugador') {
            await base44.asServiceRole.entities.FemeninoInterest.create({
                // Map generic 'nombre_jugador' to the DB field 'nombre_jugadora'
                nombre_jugadora: data.nombre_jugadora || data.nombre_jugador,
                fecha_nacimiento: data.fecha_nacimiento,
                nombre_padre: data.nombre_padre || data.nombre_tutor,
                email: data.email,
                telefono: data.telefono,
                municipio: data.municipio,
                experiencia_previa: data.experiencia_previa || 'Sin experiencia',
                
                referido_por_nombre: referrerName || data.referido_por_codigo,
                referido_por_email: referrerEmail,
                
                estado: 'Nuevo',
                temporada: '2024-2025',
                mensaje: data.mensaje || (type === 'jugador' ? 'Desde Web Externa (Jugador Genérico)' : 'Desde Web Externa (Femenino)')
            });
        } else {
             return new Response(JSON.stringify({ error: 'Tipo desconocido. Use "socio", "jugador" o "femenino"' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("❌ Error en externalFormReceiver:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});