import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Esta función maneja el tracking de emails (aperturas y clics)
Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const invitationId = url.searchParams.get('id');
        const action = url.searchParams.get('action'); // 'open' o 'click'
        const redirectUrl = url.searchParams.get('redirect');

        if (!invitationId || !action) {
            return new Response('Missing parameters', { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        // Actualizar el registro de la invitación
        try {
            const invitation = await base44.asServiceRole.entities.EmailInvitation.filter({ id: invitationId });
            
            if (invitation && invitation.length > 0) {
                const updateData = {};
                
                if (action === 'open' && !invitation[0].abierta) {
                    updateData.abierta = true;
                    updateData.fecha_apertura = new Date().toISOString();
                }
                
                if (action === 'click' && !invitation[0].clicada) {
                    updateData.clicada = true;
                    updateData.fecha_clic = new Date().toISOString();
                    // Si hacen clic, también la marcamos como abierta
                    if (!invitation[0].abierta) {
                        updateData.abierta = true;
                        updateData.fecha_apertura = new Date().toISOString();
                    }
                }

                if (Object.keys(updateData).length > 0) {
                    await base44.asServiceRole.entities.EmailInvitation.update(invitationId, updateData);
                }
            }
        } catch (error) {
            console.error('Error updating invitation:', error);
            // Continuamos aunque falle el tracking
        }

        // Si es un clic, redirigir a la URL destino
        if (action === 'click' && redirectUrl) {
            return Response.redirect(decodeURIComponent(redirectUrl), 302);
        }

        // Si es una apertura, devolver un píxel transparente 1x1
        if (action === 'open') {
            // Píxel GIF transparente 1x1
            const pixel = new Uint8Array([
                0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
                0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
                0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
                0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
                0x01, 0x00, 0x3b
            ]);

            return new Response(pixel, {
                status: 200,
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Email tracking error:', error);
        return new Response('Error', { status: 500 });
    }
});