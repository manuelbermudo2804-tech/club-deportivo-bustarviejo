Deno.serve(async (req) => {
  try {
    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Instalar la App • CD Bustarviejo</title>
  <meta name="theme-color" content="#ea580c" />
  <link rel="icon" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?v=1" />
  <style>
    :root { --orange:#ea580c; --green:#16a34a; --slate:#0f172a; --muted:#475569; }
    *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;background:linear-gradient(135deg,#f8fafc,#e2e8f0);color:#0f172a}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:860px;width:100%;background:#fff;border-radius:24px;box-shadow:0 20px 40px rgba(0,0,0,.12);overflow:hidden;border:1px solid #e2e8f0}
    .header{background:linear-gradient(90deg,#ea580c,#f97316);padding:24px;color:#fff;display:flex;align-items:center;gap:16px}
    .logo{width:56px;height:56px;border-radius:12px;object-fit:cover;box-shadow:0 8px 20px rgba(0,0,0,.25)}
    .title{margin:0;font-size:22px;font-weight:800;letter-spacing:.2px}
    .subtitle{margin:2px 0 0;font-size:13px;opacity:.95}
    .content{padding:24px}
    .benefits{background:#fff7ed;border:2px solid #fdba74;color:#9a3412;border-radius:16px;padding:16px;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:1fr;gap:16px}
    @media (min-width:860px){ .grid{grid-template-columns:1fr 1fr} }
    .block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px}
    .block h3{margin:0 0 8px;font-size:16px}
    .step{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;margin:10px 0}
    .badge{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#3b82f6;color:#fff;font-weight:800}
    .small{font-size:12px;color:#475569;margin-top:2px}
    .ok{display:flex;align-items:center;gap:10px;background:#ecfdf5;border:1px solid #86efac;border-radius:12px;padding:10px 12px;margin-top:12px;color:#065f46}
    .footer{margin-top:14px;font-size:12px;color:#475569;text-align:center}
    .cta{display:block;width:100%;background:#16a34a;color:#fff;text-decoration:none;text-align:center;font-weight:800;border-radius:12px;padding:14px;border:0;margin-top:10px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <img class="logo" src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg?v=1" alt="CD Bustarviejo" />
        <div>
          <h1 class="title">Instala la App del CD Bustarviejo</h1>
          <p class="subtitle">Guía rápida (menos de 1 minuto) • Funciona en iPhone y Android</p>
        </div>
      </div>

      <div class="content">
        <div class="benefits">
          <strong>Con la app instalada podrás:</strong>
          <ul>
            <li>Recibir convocatorias al instante</li>
            <li>Ver pagos, documentos y calendario</li>
            <li>Chatear con entrenadores y coordinadores</li>
            <li>Acceso rápido desde la pantalla de inicio</li>
          </ul>
        </div>

        <div class="grid">
          <div class="block">
            <h3>iPhone / iPad (Safari)</h3>
            <div class="step"><span class="badge">1</span> Abre <strong>esta página en Safari</strong> (no Chrome)</div>
            <div class="step"><span class="badge">2</span> Pulsa el botón <strong>Compartir</strong> (flecha ↑)</div>
            <div class="step"><span class="badge">3</span> Elige <strong>“Añadir a pantalla de inicio”</strong></div>
            <div class="step"><span class="badge">4</span> Pulsa <strong>“Añadir”</strong> arriba a la derecha</div>
            <div class="ok">¡Listo! Busca el icono del club en tu pantalla</div>
          </div>

          <div class="block">
            <h3>Android (Chrome)</h3>
            <div class="step"><span class="badge" style="background:#16a34a">1</span> Abre <strong>esta página en Chrome</strong></div>
            <div class="step"><span class="badge" style="background:#16a34a">2</span> Menú <strong>(⋮)</strong> arriba a la derecha</div>
            <div class="step"><span class="badge" style="background:#16a34a">3</span> Toca <strong>“Instalar aplicación”</strong> o “Añadir a inicio”</div>
            <div class="step"><span class="badge" style="background:#16a34a">4</span> Confirma con <strong>“Instalar”</strong></div>
            <div class="ok">¡Hecho! Ya tendrás el icono del club</div>
          </div>
        </div>

        <a class="cta" href="/">Ir a la app</a>
        <p class="footer">Si ya instalaste la app, cierra el navegador y entra desde el <strong>icono del club</strong>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});