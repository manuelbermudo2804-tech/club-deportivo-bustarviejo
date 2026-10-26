import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TARGET_URL = 'https://empresas3.gruposantander.es/paas/loginnwe/';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.es_tesorero)) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const startedAt = Date.now();
    let response: Response;

    try {
      response = await fetch(TARGET_URL, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CDBustarviejoBankConnectionTest/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({
        success: false,
        stage: 'network',
        target: new URL(TARGET_URL).hostname,
        elapsed_ms: Date.now() - startedAt,
        error_type: /timeout|abort/i.test(message) ? 'timeout' : 'fetch_failed',
        detail: message.slice(0, 300),
        note: 'Prueba de solo lectura. No se han enviado credenciales ni se ha intentado iniciar sesión.'
      });
    }

    const html = (await response.text()).slice(0, 250000);
    const lower = html.toLowerCase();
    const title = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 180) ?? null;

    const signals = {
      login_form: /type\\s*=\\s*["']password["']/i.test(html),
      username_field: /(name|id)\\s*=\\s*["'][^"']*(user|usuario|login|nif|dni)[^"']*["']/i.test(html),
      imperva_or_incapsula: /imperva|incapsula|request unsuccessful|incident id|error reference number/i.test(lower),
      captcha_or_challenge: /captcha|challenge-platform|verify you are human|checking your browser|robot check/i.test(lower),
      access_denied: /access denied|acceso denegado|forbidden/i.test(lower),
      mfa_hint: /two.factor|multi.factor|one.time password|código de seguridad|codigo de seguridad|sms|firma electrónica/i.test(lower)
    };

    return Response.json({
      success: response.ok && !signals.imperva_or_incapsula && !signals.captcha_or_challenge && !signals.access_denied,
      stage: 'http_get',
      target: new URL(TARGET_URL).hostname,
      status: response.status,
      final_host: (() => { try { return new URL(response.url).hostname; } catch { return null; } })(),
      content_type: response.headers.get('content-type'),
      elapsed_ms: Date.now() - startedAt,
      title,
      signals,
      html_bytes_sampled: html.length,
      note: 'Prueba de solo lectura. No se han enviado credenciales, no se ha iniciado sesión y no se han leído datos bancarios.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, stage: 'unexpected', error: message.slice(0, 300) }, { status: 500 });
  }
});
