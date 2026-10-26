import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.es_tesorero)) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const startedAt = Date.now();
    const target = 'https://empresas3.gruposantander.es/paas/loginnwe/';
    let response;
    try {
      response = await fetch(target, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CDBustarviejoConnectionTest/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({
        success: false,
        stage: 'network',
        target_host: 'empresas3.gruposantander.es',
        elapsed_ms: Date.now() - startedAt,
        error_type: message.toLowerCase().includes('timeout') || message.toLowerCase().includes('abort') ? 'timeout' : 'fetch_failed',
        detail: message.slice(0, 250),
        note: 'Solo lectura; no se enviaron credenciales ni se inició sesión.'
      });
    }

    const html = (await response.text()).slice(0, 100000);
    const lower = html.toLowerCase();
    const titleStart = lower.indexOf('<title');
    const titleOpenEnd = titleStart >= 0 ? lower.indexOf('>', titleStart) : -1;
    const titleEnd = titleOpenEnd >= 0 ? lower.indexOf('</title>', titleOpenEnd) : -1;
    const title = titleEnd > titleOpenEnd ? html.slice(titleOpenEnd + 1, titleEnd).replace(/<[^>]*>/g, ' ').trim().slice(0, 160) : null;

    const signals = {
      login_form: lower.includes('type="password"') || lower.includes("type='password'"),
      imperva_or_incapsula: lower.includes('imperva') || lower.includes('incapsula') || lower.includes('request unsuccessful') || lower.includes('incident id'),
      captcha_or_challenge: lower.includes('captcha') || lower.includes('checking your browser') || lower.includes('verify you are human'),
      access_denied: lower.includes('access denied') || lower.includes('acceso denegado') || lower.includes('forbidden'),
      possible_mfa: lower.includes('one-time password') || lower.includes('código de seguridad') || lower.includes('codigo de seguridad')
    };

    return Response.json({
      success: response.ok && !signals.imperva_or_incapsula && !signals.captcha_or_challenge && !signals.access_denied,
      stage: 'http_get',
      target_host: 'empresas3.gruposantander.es',
      status: response.status,
      final_host: (() => { try { return new URL(response.url).hostname; } catch { return null; } })(),
      content_type: response.headers.get('content-type'),
      elapsed_ms: Date.now() - startedAt,
      title,
      signals,
      sampled_characters: html.length,
      note: 'Solo lectura; no se enviaron credenciales, no se inició sesión ni se leyeron movimientos bancarios.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, stage: 'unexpected', detail: message.slice(0, 250) }, { status: 500 });
  }
});
