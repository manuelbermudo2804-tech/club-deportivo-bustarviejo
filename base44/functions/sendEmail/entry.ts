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
        html: html
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