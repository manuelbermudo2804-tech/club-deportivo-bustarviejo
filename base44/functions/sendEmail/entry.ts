import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticación
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return Response.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[sendEmail] ❌ RESEND_API_KEY no configurada');
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    console.log('[sendEmail] 📧 Enviando email a:', to, '| Subject:', subject);

    // Inyectar footer con web + redes sociales si no lo tiene ya
    const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;">
<div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div>
<div style="margin-bottom:14px;"><a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Facebook">📘</a><a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Instagram">📸</a></div>
<div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div>
</div>`;

    // Solo añadir si el HTML no contiene ya el bloque de redes
    let finalHtml = html;
    if (!html.includes('www.cdbustarviejo.com')) {
      // Insertar antes del cierre de </body> o al final
      if (html.includes('</body>')) {
        finalHtml = html.replace('</body>', SOCIAL_FOOTER + '</body>');
      } else {
        finalHtml = html + SOCIAL_FOOTER;
      }
    }

    // Enviar email usando Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'noreply@cdbustarviejo.com',
        to: [to],
        subject: subject,
        html: finalHtml
      })
    });

    const data = await response.json();

    console.log('[sendEmail] Respuesta Resend:', {
      ok: response.ok,
      status: response.status,
      data: data
    });

    if (!response.ok) {
      console.error('[sendEmail] ❌ Error Resend:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Si es rate limit, devolver mensaje específico
      if (response.status === 429) {
        return Response.json({ 
          error: 'Rate limit excedido. Resend permite máximo 2 emails/día en plan gratuito. Espera unos minutos e intenta de nuevo.',
          resendError: data.message || 'Too many requests'
        }, { status: 429 });
      }
      
      return Response.json({ 
        error: 'Failed to send email', 
        details: data,
        status: response.status,
        resendError: data.message || data.error || 'Unknown error'
      }, { status: response.status });
    }

    console.log('[sendEmail] ✅ Email enviado correctamente, ID:', data.id);
    return Response.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});