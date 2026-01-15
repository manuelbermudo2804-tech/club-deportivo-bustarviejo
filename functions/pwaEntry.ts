Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // Soporte de bypass: ?skip=1 -> marca flags en localStorage (via script) y redirige tras render
    const skip = params.get("skip") === "1";

    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#1e1e1e" />
  <title>Instalar App del Club · CD Bustarviejo</title>
  <link rel="manifest" href="/functions/manifest" />
  <style>
    :root { --o:#f97316; --g:#16a34a; --bg:#0b1220; --card:#ffffff; --txt:#0f172a; }
    *{box-sizing:border-box} body{margin:0;background:linear-gradient(135deg,#0b1220,#0f172a,#0b1220);font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;color:#fff;}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{max-width:640px;width:100%;background:var(--card);color:var(--txt);border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:24px}
    .logo{width:80px;height:80px;border-radius:16px;object-fit:cover;box-shadow:0 8px 24px rgba(0,0,0,.2)}
    .btn{display:block;width:100%;padding:14px 16px;border-radius:12px;border:none;font-weight:700;cursor:pointer;margin-top:12px}
    .btn.primary{background:linear-gradient(90deg,#f97316,#ea580c);color:#fff}
    .btn.alt{background:#e2e8f0;color:#0f172a}
    .btn.ok{background:#16a34a;color:#fff}
    .muted{color:#475569;font-size:14px}
    .hint{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-top:12px;font-size:14px}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .col{flex:1;min-width:220px}
    .steps{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px;margin-top:12px}
    .step{display:flex;gap:12px;align-items:center;background:#fff;border:1px dashed #e2e8f0;border-radius:12px;padding:10px;margin-top:8px}
    .bubble{width:32px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;background:#f97316}
    .center{text-align:center}
    .small{font-size:12px;color:#64748b}
    a.link{color:#0ea5e9;text-decoration:none}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="center">
        <img class="logo" src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" />
        <h1 style="margin:12px 0 6px;font-size:22px;">Instala la App del Club</h1>
        <p class="muted">Para una experiencia completa y notificaciones al instante</p>
      </div>

      <div id="installArea">
        <button id="installBtn" class="btn primary" disabled>Preparando instalación…</button>
        <button id="alreadyInstalledBtn" class="btn ok">✅ Ya la tengo instalada</button>
        <button id="skipBtn" class="btn alt">Continuar sin instalar</button>
      </div>

      <div class="row">
        <div class="col">
          <div class="steps">
            <strong>iPhone / iPad (Safari)</strong>
            <div class="step"><div class="bubble">1</div><div>Abrir en Safari</div></div>
            <div class="step"><div class="bubble">2</div><div>Pulsar Compartir (↑)</div></div>
            <div class="step"><div class="bubble">3</div><div>"Añadir a pantalla de inicio"</div></div>
          </div>
        </div>
        <div class="col">
          <div class="steps" style="border-color:#86efac;background:#f0fdf4;">
            <strong>Android (Chrome)</strong>
            <div class="step"><div class="bubble" style="background:#16a34a;">1</div><div>Abrir en Chrome</div></div>
            <div class="step"><div class="bubble" style="background:#16a34a;">2</div><div>Menú ⋮ → "Instalar app"</div></div>
            <div class="step"><div class="bubble" style="background:#16a34a;">3</div><div>Confirmar "Instalar"</div></div>
          </div>
        </div>
      </div>

      <div class="hint">
        <strong>¿Problemas?</strong>
        <div class="small">También puedes abrir <a class="link" href="/functions/pwaEntry?skip=1">esta versión</a> que marca la instalación como completada y te lleva a iniciar sesión.</div>
      </div>

      <p class="small center" style="margin-top:10px;">© CD Bustarviejo · PWA</p>
    </div>
  </div>

  <script>
    // Registrar Service Worker (público)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/functions/sw', { scope: '/' }).catch(()=>{});
    }

    // Cargar manifest ya está en <head>

    // Manejo de instalación
    let deferredPrompt = null;
    const installBtn = document.getElementById('installBtn');
    const alreadyInstalledBtn = document.getElementById('alreadyInstalledBtn');
    const skipBtn = document.getElementById('skipBtn');

    function markInstalledAndGo(next) {
      try {
        localStorage.setItem('pwaInstalled','true');
        localStorage.setItem('hasSeenWelcome','true');
        localStorage.setItem('installCompleted','true');
        localStorage.setItem('disableLegacyOnboarding','true');
      } catch {}
      window.location.href = next || '/login?nextUrl=' + encodeURIComponent('/Home');
    }

    // Bypass ?skip=1
    (function(){
      const sp = new URLSearchParams(location.search);
      if (sp.get('skip') === '1') {
        markInstalledAndGo('/login?nextUrl=' + encodeURIComponent('/Home'));
      }
    })();

    // Detectar standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      // Ya instalada: marcar y pedir login
      markInstalledAndGo('/login?nextUrl=' + encodeURIComponent('/Home'));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.disabled = false;
      installBtn.textContent = 'Instalar aplicación';
    });

    window.addEventListener('appinstalled', () => {
      markInstalledAndGo('/login?nextUrl=' + encodeURIComponent('/Home'));
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        markInstalledAndGo('/login?nextUrl=' + encodeURIComponent('/Home'));
      }
    });

    alreadyInstalledBtn.addEventListener('click', () => markInstalledAndGo());
    skipBtn.addEventListener('click', () => window.location.href = '/login?nextUrl=' + encodeURIComponent('/Home'));
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return Response.json({ error: (err && err.message) || "unexpected_error" }, { status: 500 });
  }
});