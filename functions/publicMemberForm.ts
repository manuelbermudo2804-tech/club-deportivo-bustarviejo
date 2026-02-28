import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// PÁGINA PÚBLICA - Formulario de Alta de Socio
// Devuelve HTML completo con estilo web CD Bustarviejo
// Al enviar, llama a publicMemberCheckout para crear socio + redirigir a Stripe

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, max-age=300',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let refCode = '';
    try {
      const url = new URL(req.url);
      refCode = url.searchParams.get('ref') || '';
    } catch {}

    const reqUrl = new URL(req.url);
    const checkoutUrl = reqUrl.href.replace('/publicMemberForm', '/publicMemberCheckout');

    const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
    const WEB_URL = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

    const referralBanner = refCode
      ? '<div class="referral-banner">&#127873; <strong>&#161;Te han invitado!</strong> Al registrarte, quien te invit&#243; recibir&#225; un premio.</div>'
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hazte Socio &#8212; C.D. Bustarviejo</title>
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', Arial, sans-serif;
  background: #fff; color: #222; line-height: 1.8;
  font-size: 19px; padding-top: 80px;
}
.header {
  position: fixed; top: 0; left: 0; width: 100%; z-index: 1000;
  background: #fff; border-bottom: 1px solid #eaeaea;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.header-contenido {
  max-width: 1200px; margin: auto; padding: 14px 22px;
  display: flex; justify-content: space-between; align-items: center;
}
.logo { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 1.1rem; margin-right: 30px; }
.logo img { width: 44px; }
.logo a { text-decoration: none; color: #222; display: flex; align-items: center; gap: 14px; }
.menu { display: flex; gap: 26px; align-items: center; }
.menu a { text-decoration: none; color: #222; font-weight: 700; font-size: 0.95rem; text-transform: uppercase; }
.menu a:hover { color: #f57c00; }
.btn-menu { background: #f57c00; color: #000; padding: 12px 20px; border-radius: 30px; font-weight: 800; font-size: 0.85rem; text-decoration: none; }
.menu-toggle { display: none; font-size: 2.2rem; background: none; border: none; cursor: pointer; margin-left: auto; }
.hero {
  position: relative; min-height: 50vh;
  background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/96c551202_fondo.jpg');
  background-size: cover; background-position: center;
  display: flex; align-items: center; justify-content: center;
}
.hero::before { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.hero .contenido { position: relative; text-align: center; color: #fff; padding: 40px 20px; max-width: 800px; }
.escudo-grande { width: 140px; margin-bottom: 20px; }
.hero h1 { font-size: 2.8rem; margin-bottom: 10px; font-weight: 800; }
.hero .subtitulo { font-size: 1.2rem; opacity: 0.95; }
.container { max-width: 950px; margin: 0 auto; padding: 40px 22px 60px; }
.benefits { background: #fff; border-radius: 10px; padding: 40px; margin-bottom: 30px; box-shadow: 0 12px 30px rgba(0,0,0,0.07); }
.benefits h3 { font-size: 1.4rem; font-weight: 800; margin-bottom: 20px; color: #222; }
.benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.benefit-item { background: #f5f5f5; border-radius: 12px; padding: 20px; transition: transform 0.2s, box-shadow 0.2s; }
.benefit-item:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
.benefit-item h4 { font-size: 1rem; font-weight: 800; margin-bottom: 6px; color: #222; }
.benefit-item p { font-size: 0.9rem; color: #555; line-height: 1.5; }
.share-box { background: #f5f5f5; border-radius: 10px; padding: 30px; text-align: center; margin-bottom: 30px; box-shadow: 0 12px 30px rgba(0,0,0,0.07); }
.share-box h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; color: #222; }
.share-box p { font-size: 0.95rem; color: #555; margin-bottom: 18px; }
.share-btn { background: #f57c00; color: #000; border: none; border-radius: 30px; padding: 14px 30px; font-size: 1rem; font-weight: 800; cursor: pointer; transition: all 0.25s; font-family: inherit; }
.share-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245,124,0,0.3); }
.form-card { background: #fff; border-radius: 10px; overflow: hidden; margin-bottom: 30px; box-shadow: 0 12px 30px rgba(0,0,0,0.07); }
.form-header { background: #f57c00; padding: 22px 30px; }
.form-header h2 { font-size: 1.3rem; font-weight: 800; color: #000; }
.form-body { padding: 30px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #222; margin-bottom: 8px; text-transform: uppercase; }
.form-group input, .form-group select { width: 100%; padding: 14px 18px; border-radius: 8px; border: 1px solid #ddd; background: #fff; color: #222; font-size: 1rem; transition: border-color 0.2s; font-family: inherit; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #f57c00; box-shadow: 0 0 0 3px rgba(245,124,0,0.15); }
.form-group input::placeholder { color: #999; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.radio-group { display: flex; flex-direction: column; gap: 12px; }
.radio-option { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 10px; border: 2px solid #eaeaea; cursor: pointer; transition: all 0.2s; background: #fafafa; user-select: none; }
.radio-option:hover { border-color: #ccc; }
.radio-option.selected { border-color: #f57c00; background: rgba(245,124,0,0.04); }
.radio-content h4 { font-size: 1rem; font-weight: 700; color: #222; }
.radio-content p { font-size: 0.8rem; color: #777; }
.payment-box { background: #f9fafb; border: 2px solid #f57c00; border-radius: 10px; padding: 26px; margin: 28px 0; }
.payment-box h3 { font-size: 1.2rem; color: #222; margin-bottom: 12px; font-weight: 800; }
.payment-type-option { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 10px; border: 2px solid #eaeaea; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; background: #fff; user-select: none; }
.payment-type-option:hover { border-color: #ccc; }
.payment-type-option.selected { border-color: #f57c00; background: rgba(245,124,0,0.04); }
.pto-title { font-size: 1rem; font-weight: 700; color: #222; }
.pto-desc { font-size: 0.8rem; color: #777; }
.pto-price { font-size: 1.4rem; font-weight: 800; color: #f57c00; white-space: nowrap; }
.pto-badge { background: #f57c00; color: #fff; font-size: 0.65rem; padding: 3px 10px; border-radius: 30px; font-weight: 800; margin-left: 8px; vertical-align: middle; text-transform: uppercase; }
.stripe-badge { text-align: center; font-size: 0.8rem; color: #999; margin-top: 14px; padding-top: 14px; border-top: 1px solid #eaeaea; }
.section-title { font-size: 1.1rem; font-weight: 800; color: #222; margin: 30px 0 16px; padding-bottom: 12px; border-bottom: 2px solid #eaeaea; }
.referral-banner { background: #fff5f0; border: 2px solid #f57c00; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px; font-size: 0.95rem; color: #222; }
.privacy-notice { background: #f5f5f5; border-radius: 10px; padding: 18px; margin: 24px 0; font-size: 0.8rem; color: #666; line-height: 1.6; }
.privacy-notice a { color: #f57c00; }
.submit-btn { display: block; width: 100%; background: #f57c00; color: #000; border: none; border-radius: 8px; padding: 18px; font-size: 1.1rem; font-weight: 800; cursor: pointer; transition: all 0.25s; font-family: inherit; }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,124,0,0.35); background: #e06c00; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
.error-message { display: none; background: #fff5f5; color: #c62828; border: 2px solid #c62828; padding: 16px 20px; border-radius: 10px; margin-bottom: 18px; font-size: 0.95rem; font-weight: 600; }
.success-message { display: none; text-align: center; padding: 50px 20px; }
.success-message h2 { font-size: 1.6rem; color: #222; margin-bottom: 12px; font-weight: 800; }
.success-message p { color: #555; font-size: 1rem; }
.stripe-redirect-btn { display: inline-block; margin-top: 18px; background: #f57c00; color: #000; text-decoration: none; padding: 14px 30px; border-radius: 30px; font-weight: 800; font-size: 1rem; transition: all 0.25s; }
.stripe-redirect-btn:hover { background: #e06c00; transform: translateY(-2px); }
.footer { background: #111; color: #ccc; text-align: center; padding: 30px 20px; font-size: 0.9rem; }
.footer a { color: #f57c00; text-decoration: none; font-weight: 700; }
.debug-box { background: #fffde7; border: 2px solid #fbc02d; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 0.85rem; color: #333; white-space: pre-wrap; word-break: break-all; display: none; }
@media (max-width: 768px) {
  body { padding-top: 90px; font-size: 18px; }
  .menu-toggle { display: block; }
  .menu { width: 100%; display: none; flex-direction: column; align-items: center; background: #fff; padding: 15px 0; margin-top: 10px; border-top: 1px solid #eaeaea; }
  .menu.activo { display: flex; }
  .menu a { font-size: 1rem; padding: 12px 0; width: 100%; text-align: center; }
  .menu .btn-menu { margin-top: 10px; }
  .header-contenido { flex-direction: row; flex-wrap: wrap; }
  .hero { min-height: 40vh; }
  .hero h1 { font-size: 1.9rem; }
  .hero .subtitulo { font-size: 1rem; }
  .escudo-grande { width: 110px; }
  .benefits-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .form-body { padding: 20px; }
  .container { padding: 24px 16px 40px; }
}
</style>
</head>
<body>

<header class="header">
  <div class="header-contenido">
    <div class="logo">
      <a href="${WEB_URL}">
        <img src="${ESCUDO}" alt="CD Bustarviejo">
        <span>Club Deportivo Bustarviejo</span>
      </a>
    </div>
    <button class="menu-toggle" id="menuToggle">&#9776;</button>
    <nav class="menu" id="mainMenu">
      <a href="${WEB_URL}">INICIO</a>
      <a href="${WEB_URL}equipos.html">EQUIPOS</a>
      <a href="${WEB_URL}patrocinadores.html">PATROCINADORES</a>
      <a class="btn-menu" href="#">HAZTE SOCIO</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="contenido">
    <img class="escudo-grande" src="${ESCUDO}" alt="Escudo CD Bustarviejo">
    <h1>&#161;Hazte Socio!</h1>
    <p class="subtitulo">Deporte, valores y comunidad</p>
  </div>
</section>

<div class="container">

  <div class="benefits">
    <h3>&#11088; &#191;Por qu&#233; ser socio?</h3>
    <div class="benefits-grid">
      <div class="benefit-item"><h4>&#128154; Apoyo esencial al club</h4><p>Tu aportaci&#243;n es vital para el desarrollo de nuestros j&#243;venes deportistas</p></div>
      <div class="benefit-item"><h4>&#128101; Fuerza para la comunidad</h4><p>&#218;nete a la gran familia del club y vive la pasi&#243;n por el deporte</p></div>
      <div class="benefit-item"><h4>&#127881; Eventos inolvidables</h4><p>Participa en las actividades del club y comparte experiencias &#250;nicas</p></div>
      <div class="benefit-item"><h4>&#10024; Compromiso con el deporte base</h4><p>Contribuye al crecimiento y formaci&#243;n de nuestros deportistas</p></div>
    </div>
  </div>

  <div class="share-box">
    <h3>&#129309; &#191;Conoces a m&#225;s personas que quieran apoyar al club?</h3>
    <p>&#161;Comparte este enlace con familiares y amigos!</p>
    <button class="share-btn" id="shareBtn">&#128172; Compartir por WhatsApp</button>
  </div>

  <div class="form-card">
    <div class="form-header"><h2>&#128101; Formulario de Inscripci&#243;n como Socio</h2></div>
    <div class="form-body">
      <div class="error-message" id="errorMsg"></div>
      <div class="debug-box" id="debugBox"></div>

      ${referralBanner}

      <div id="formContent">
        <form id="memberForm" autocomplete="on">

          <div class="form-group">
            <label>Tipo de Inscripci&#243;n *</label>
            <div class="radio-group" id="tipoInscripcionGroup">
              <div class="radio-option selected" data-value="Nueva Inscripci&#243;n">
                <div class="radio-content"><h4>&#127381; Nueva Inscripci&#243;n</h4><p>Primera vez como socio del club</p></div>
              </div>
              <div class="radio-option" data-value="Renovaci&#243;n">
                <div class="radio-content"><h4>&#128260; Renovaci&#243;n</h4><p>Ya fui socio en temporadas anteriores</p></div>
              </div>
            </div>
          </div>

          <h3 class="section-title">Datos del nuevo socio</h3>

          <div class="form-row">
            <div class="form-group">
              <label for="nombre_completo">Nombre y Apellidos *</label>
              <input type="text" id="nombre_completo" autocomplete="name" placeholder="Ej: Juan Garc&#237;a L&#243;pez" required>
            </div>
            <div class="form-group">
              <label for="dni">DNI *</label>
              <input type="text" id="dni" autocomplete="off" placeholder="12345678A" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="telefono">Tel&#233;fono M&#243;vil *</label>
              <input type="tel" id="telefono" autocomplete="tel" placeholder="600123456" required>
            </div>
            <div class="form-group">
              <label for="email">Correo Electr&#243;nico *</label>
              <input type="email" id="email" autocomplete="email" placeholder="correo@ejemplo.com" required>
            </div>
          </div>

          <div class="form-group">
            <label for="direccion">Direcci&#243;n Completa *</label>
            <input type="text" id="direccion" autocomplete="street-address" placeholder="Calle, n&#250;mero, piso..." required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="municipio">Municipio *</label>
              <input type="text" id="municipio" autocomplete="address-level2" placeholder="Bustarviejo" required>
            </div>
            <div class="form-group">
              <label for="fecha_nacimiento">Fecha de Nacimiento</label>
              <input type="date" id="fecha_nacimiento">
            </div>
          </div>

          <div class="payment-box">
            <h3>&#128179; Pago: 25&#8364; /temporada</h3>
            <p style="font-size:0.85rem;color:#555;margin-bottom:16px;">Elige c&#243;mo prefieres pagar. El pago se realiza de forma segura a trav&#233;s de Stripe.</p>

            <div id="paymentGroup">
              <div class="payment-type-option selected" data-value="unico">
                <div style="flex:1;"><div class="pto-title">&#128179; Pago &#218;nico</div><div class="pto-desc">Un solo pago por tarjeta para esta temporada</div></div>
                <div class="pto-price">25&#8364;</div>
              </div>

              <div class="payment-type-option" data-value="suscripcion">
                <div style="flex:1;"><div class="pto-title">&#128260; Suscripci&#243;n Anual <span class="pto-badge">RECOMENDADO</span></div><div class="pto-desc">Se renueva autom&#225;ticamente cada a&#241;o. Puedes cancelar cuando quieras.</div></div>
                <div class="pto-price">25&#8364;<span style="font-size:12px;font-weight:400;">/a&#241;o</span></div>
              </div>
            </div>

            <div class="stripe-badge">&#128274; Pago seguro con Stripe</div>
          </div>

          <div class="privacy-notice">
            <p>&#128274; <strong>Protecci&#243;n de Datos (RGPD):</strong> Al enviar este formulario, consientes el tratamiento de tus datos personales por el CD Bustarviejo para la gesti&#243;n de tu membres&#237;a. Tus datos ser&#225;n tratados de forma confidencial. Puedes ejercer tus derechos enviando un email a <a href="mailto:cdbustarviejo@gmail.com">cdbustarviejo@gmail.com</a>.</p>
          </div>

          <button type="submit" class="submit-btn" id="submitBtn">&#127881; Registrarme y Pagar con Tarjeta</button>
        </form>
      </div>

      <div class="success-message" id="successMsg">
        <div style="font-size:5rem;margin-bottom:20px;">&#127881;</div>
        <h2>&#161;Redirigiendo al pago!</h2>
        <p>Ser&#225;s redirigido a la pasarela de pago segura de Stripe.</p>
        <p style="margin-top:12px;font-size:13px;color:#94a3b8;">Si no se redirige autom&#225;ticamente:</p>
        <a href="#" class="stripe-redirect-btn" id="stripeLink">Ir a pagar &#8594;</a>
      </div>

      <div class="success-message" id="paidMsg">
        <div style="font-size:5rem;margin-bottom:20px;">&#9989;</div>
        <h2>&#161;Bienvenido/a a la familia!</h2>
        <p>Tu pago se ha completado correctamente.</p>
        <p style="margin-top:15px;">Recibir&#225;s tu <strong>carnet virtual</strong> por email en breve.</p>
      </div>

    </div>
  </div>
</div>

<footer class="footer">
  <p>&#169; Club Deportivo Bustarviejo &#183; <a href="${WEB_URL}">Volver a la web</a></p>
</footer>

<script>
(function() {
  var CHECKOUT_URL = '${checkoutUrl}';
  var REF_CODE = '${refCode}';
  var CURRENT_PAGE = window.location.href.split('?')[0];

  // Estado del formulario
  var tipoInscripcion = 'Nueva Inscripcion';
  var tipoPago = 'unico';

  // ── Check retorno de Stripe ──
  var params = new URLSearchParams(window.location.search);
  if (params.get('paid') === 'ok') {
    var fc = document.getElementById('formContent');
    if (fc) fc.style.display = 'none';
    var pm = document.getElementById('paidMsg');
    if (pm) pm.style.display = 'block';
  }
  if (params.get('canceled') === 'socio') {
    showError('El pago fue cancelado. Puedes intentar de nuevo.');
  }

  // ── Menu toggle ──
  document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('mainMenu').classList.toggle('activo');
  });

  // ── WhatsApp share ──
  document.getElementById('shareBtn').addEventListener('click', function(e) {
    e.preventDefault();
    var shareUrl = CURRENT_PAGE + (REF_CODE ? '?ref=' + REF_CODE : '');
    var msg = 'Hazte socio del CD Bustarviejo por solo 25 euros al anio! Apoya al deporte base de nuestro pueblo\\n\\n' + shareUrl;
    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
  });

  // ── Tipo Inscripcion selector ──
  var tipoOptions = document.querySelectorAll('#tipoInscripcionGroup .radio-option');
  for (var i = 0; i < tipoOptions.length; i++) {
    tipoOptions[i].addEventListener('click', function() {
      for (var j = 0; j < tipoOptions.length; j++) {
        tipoOptions[j].classList.remove('selected');
      }
      this.classList.add('selected');
      tipoInscripcion = this.getAttribute('data-value');
    });
  }

  // ── Payment type selector ──
  var payOptions = document.querySelectorAll('#paymentGroup .payment-type-option');
  for (var i = 0; i < payOptions.length; i++) {
    payOptions[i].addEventListener('click', function() {
      for (var j = 0; j < payOptions.length; j++) {
        payOptions[j].classList.remove('selected');
      }
      this.classList.add('selected');
      tipoPago = this.getAttribute('data-value');
    });
  }

  // ── Form submit ──
  document.getElementById('memberForm').addEventListener('submit', function(e) {
    e.preventDefault();
    hideError();

    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    var nombre = document.getElementById('nombre_completo').value.trim();
    var dniVal = document.getElementById('dni').value.trim();
    var tel = document.getElementById('telefono').value.trim();
    var emailVal = document.getElementById('email').value.trim();
    var dir = document.getElementById('direccion').value.trim();
    var mun = document.getElementById('municipio').value.trim();
    var fNac = document.getElementById('fecha_nacimiento').value || '';

    if (!nombre || !dniVal || !tel || !emailVal || !dir || !mun) {
      showError('Por favor, completa todos los campos obligatorios.');
      btn.disabled = false;
      btn.textContent = 'Registrarme y Pagar con Tarjeta';
      return;
    }

    var payload = {
      nombre_completo: nombre,
      dni: dniVal,
      telefono: tel,
      email: emailVal,
      direccion: dir,
      municipio: mun,
      fecha_nacimiento: fNac,
      tipo_pago: tipoPago,
      tipo_inscripcion: tipoInscripcion,
      referido_por: REF_CODE,
      es_segundo_progenitor: false,
      success_url: CURRENT_PAGE + '?paid=ok',
      cancel_url: CURRENT_PAGE + '?canceled=socio'
    };

    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(res) {
      return res.json().then(function(data) {
        return { ok: res.ok, data: data };
      });
    })
    .then(function(result) {
      if (!result.ok || result.data.error) {
        showError(result.data.error || 'Error al procesar el registro.');
        btn.disabled = false;
        btn.textContent = 'Registrarme y Pagar con Tarjeta';
        return;
      }
      if (result.data.url) {
        document.getElementById('formContent').style.display = 'none';
        document.getElementById('successMsg').style.display = 'block';
        document.getElementById('stripeLink').href = result.data.url;
        window.location.href = result.data.url;
      } else {
        showError('No se pudo obtener el enlace de pago.');
        btn.disabled = false;
        btn.textContent = 'Registrarme y Pagar con Tarjeta';
      }
    })
    .catch(function(err) {
      showError('Error de conexion. Intentalo de nuevo. (' + (err.message || '') + ')');
      btn.disabled = false;
      btn.textContent = 'Registrarme y Pagar con Tarjeta';
    });
  });

  function showError(msg) {
    var el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function hideError() {
    document.getElementById('errorMsg').style.display = 'none';
  }
})();
</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error en publicMemberForm:', error);
    return new Response('<h1>Error al cargar el formulario</h1>', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});