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
    // Extraer parámetros de referido de la URL
    let refCode = '';
    try {
      const url = new URL(req.url);
      refCode = url.searchParams.get('ref') || '';
    } catch {}

    // Obtener la URL base del checkout endpoint (misma base que esta función)
    const reqUrl = new URL(req.url);
    const checkoutUrl = reqUrl.href.replace('/publicMemberForm', '/publicMemberCheckout');

    const html = generarHTML(refCode, checkoutUrl);
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

function generarHTML(refCode, checkoutUrl) {
  const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
  const WEB_URL = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hazte Socio — C.D. Bustarviejo</title>
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', Arial, sans-serif;
  background: #fff;
  color: #222;
  line-height: 1.8;
  font-size: 19px;
  padding-top: 80px;
}

/* ═══ HEADER FIJO — estilo web CD Bustarviejo ═══ */
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

/* ═══ HERO ═══ */
.hero {
  position: relative; min-height: 50vh;
  background-image: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/96c551202_fondo.jpg');
  background-size: cover; background-position: center;
  display: flex; align-items: center; justify-content: center;
}
.hero::before { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
.hero .contenido {
  position: relative; text-align: center; color: #fff;
  padding: 40px 20px; max-width: 800px;
}
.escudo-grande { width: 140px; margin-bottom: 20px; }
.hero h1 { font-size: 2.8rem; margin-bottom: 10px; font-weight: 800; }
.hero .subtitulo { font-size: 1.2rem; opacity: 0.95; }

/* ═══ CONTAINER ═══ */
.container { max-width: 950px; margin: 0 auto; padding: 40px 22px 60px; }

/* ═══ BENEFITS ═══ */
.benefits {
  background: #fff; border-radius: 10px; padding: 40px;
  margin-bottom: 30px; box-shadow: 0 12px 30px rgba(0,0,0,0.07);
}
.benefits h3 { font-size: 1.4rem; font-weight: 800; margin-bottom: 20px; color: #222; }
.benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.benefit-item {
  background: #f5f5f5; border-radius: 12px; padding: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.benefit-item:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
.benefit-item h4 { font-size: 1rem; font-weight: 800; margin-bottom: 6px; color: #222; }
.benefit-item p { font-size: 0.9rem; color: #555; line-height: 1.5; }

/* ═══ SHARE BOX ═══ */
.share-box {
  background: #f5f5f5; border-radius: 10px; padding: 30px;
  text-align: center; margin-bottom: 30px;
  box-shadow: 0 12px 30px rgba(0,0,0,0.07);
}
.share-box h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; color: #222; }
.share-box p { font-size: 0.95rem; color: #555; margin-bottom: 18px; }
.share-btn {
  background: #f57c00; color: #000; border: none; border-radius: 30px;
  padding: 14px 30px; font-size: 1rem; font-weight: 800; cursor: pointer;
  transition: all 0.25s; font-family: inherit;
}
.share-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245,124,0,0.3); }

/* ═══ FORM CARD ═══ */
.form-card {
  background: #fff; border-radius: 10px; overflow: hidden;
  margin-bottom: 30px; box-shadow: 0 12px 30px rgba(0,0,0,0.07);
}
.form-header {
  background: #f57c00; padding: 22px 30px;
}
.form-header h2 { font-size: 1.3rem; font-weight: 800; color: #000; }
.form-body { padding: 30px; }

/* ═══ FORM ELEMENTS ═══ */
.form-group { margin-bottom: 20px; }
.form-group label {
  display: block; font-size: 0.85rem; font-weight: 700;
  color: #222; margin-bottom: 8px; text-transform: uppercase;
}
.form-group input, .form-group select {
  width: 100%; padding: 14px 18px; border-radius: 8px;
  border: 1px solid #ddd; background: #fff;
  color: #222; font-size: 1rem; transition: border-color 0.2s;
  font-family: inherit;
}
.form-group input:focus, .form-group select:focus {
  outline: none; border-color: #f57c00; box-shadow: 0 0 0 3px rgba(245,124,0,0.15);
}
.form-group input::placeholder { color: #999; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

/* ═══ RADIO OPTIONS ═══ */
.radio-group { display: flex; flex-direction: column; gap: 12px; }
.radio-option {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px; border-radius: 10px;
  border: 2px solid #eaeaea; cursor: pointer;
  transition: all 0.2s; background: #fafafa;
}
.radio-option:hover { border-color: #ccc; }
.radio-option.selected { border-color: #f57c00; background: rgba(245,124,0,0.04); }
.radio-option input { display: none; }
.radio-content h4 { font-size: 1rem; font-weight: 700; color: #222; }
.radio-content p { font-size: 0.8rem; color: #777; }

/* ═══ PAYMENT BOX ═══ */
.payment-box {
  background: #f9fafb; border: 2px solid #f57c00;
  border-radius: 10px; padding: 26px; margin: 28px 0;
}
.payment-box h3 { font-size: 1.2rem; color: #222; margin-bottom: 12px; font-weight: 800; }
.payment-type-option {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; border-radius: 10px;
  border: 2px solid #eaeaea; margin-bottom: 12px;
  cursor: pointer; transition: all 0.2s; background: #fff;
}
.payment-type-option:hover { border-color: #ccc; }
.payment-type-option.selected { border-color: #f57c00; background: rgba(245,124,0,0.04); }
.payment-type-option input { display: none; }
.pto-title { font-size: 1rem; font-weight: 700; color: #222; }
.pto-desc { font-size: 0.8rem; color: #777; }
.pto-price { font-size: 1.4rem; font-weight: 800; color: #f57c00; white-space: nowrap; }
.pto-badge {
  background: #f57c00; color: #fff; font-size: 0.65rem;
  padding: 3px 10px; border-radius: 30px; font-weight: 800;
  margin-left: 8px; vertical-align: middle; text-transform: uppercase;
}
.stripe-badge {
  text-align: center; font-size: 0.8rem; color: #999;
  margin-top: 14px; padding-top: 14px; border-top: 1px solid #eaeaea;
}

/* ═══ SECTION TITLE ═══ */
.section-title {
  font-size: 1.1rem; font-weight: 800; color: #222;
  margin: 30px 0 16px; padding-bottom: 12px;
  border-bottom: 2px solid #eaeaea;
}

/* ═══ REFERRAL BANNER ═══ */
.referral-banner {
  background: #fff5f0; border: 2px solid #f57c00;
  border-radius: 10px; padding: 16px 20px;
  margin-bottom: 22px; font-size: 0.95rem; color: #222;
}

/* ═══ PRIVACY ═══ */
.privacy-notice {
  background: #f5f5f5; border-radius: 10px; padding: 18px;
  margin: 24px 0; font-size: 0.8rem; color: #666; line-height: 1.6;
}
.privacy-notice a { color: #f57c00; }

/* ═══ SUBMIT ═══ */
.submit-btn {
  display: block; width: 100%;
  background: #f57c00; color: #000;
  border: none; border-radius: 8px;
  padding: 18px; font-size: 1.1rem; font-weight: 800;
  cursor: pointer; transition: all 0.25s;
  font-family: inherit;
}
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(245,124,0,0.35); background: #e06c00; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

/* ═══ MESSAGES ═══ */
.error-message {
  display: none; background: #fff5f5; color: #c62828; border: 2px solid #c62828;
  padding: 16px 20px; border-radius: 10px;
  margin-bottom: 18px; font-size: 0.95rem; font-weight: 600;
}
.success-message {
  display: none; text-align: center; padding: 50px 20px;
}
.success-message h2 { font-size: 1.6rem; color: #222; margin-bottom: 12px; font-weight: 800; }
.success-message p { color: #555; font-size: 1rem; }
.stripe-redirect-btn {
  display: inline-block; margin-top: 18px;
  background: #f57c00; color: #000; text-decoration: none;
  padding: 14px 30px; border-radius: 30px; font-weight: 800; font-size: 1rem;
  transition: all 0.25s;
}
.stripe-redirect-btn:hover { background: #e06c00; transform: translateY(-2px); }

/* ═══ FOOTER ═══ */
.footer {
  background: #111; color: #ccc; text-align: center;
  padding: 30px 20px; font-size: 0.9rem;
}
.footer a { color: #f57c00; text-decoration: none; font-weight: 700; }

/* ═══ RESPONSIVE ═══ */
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

<!-- NAVBAR -->
<nav class="navbar">
  <a class="navbar-brand" href="${WEB_URL}">
    <img src="${ESCUDO}" alt="CD Bustarviejo">
    <span>C.D. Bustarviejo</span>
  </a>
  <div class="navbar-links">
    <a href="${WEB_URL}">Inicio</a>
    <a href="${WEB_URL}equipos.html">Equipos</a>
    <a href="${WEB_URL}patrocinadores.html">Patrocinadores</a>
    <a class="btn-activo" href="#">HAZTE SOCIO</a>
  </div>
</nav>

<!-- HEADER -->
<div class="page-header">
  <img src="${ESCUDO}" alt="Escudo CD Bustarviejo">
  <h1>🎉 ¡Hazte Socio del CD Bustarviejo!</h1>
  <p>Forma parte de nuestra gran familia deportiva</p>
</div>

<div class="container">

  <!-- BENEFITS -->
  <div class="benefits">
    <h3>⭐ ¿Por qué ser socio?</h3>
    <div class="benefits-grid">
      <div class="benefit-item"><h4>💚 Apoyo esencial al club</h4><p>Tu aportación es vital para el desarrollo de nuestros jóvenes deportistas</p></div>
      <div class="benefit-item"><h4>👥 Fuerza para la comunidad</h4><p>Únete a la gran familia del club y vive la pasión por el deporte</p></div>
      <div class="benefit-item"><h4>🎉 Eventos inolvidables</h4><p>Participa en las actividades del club y comparte experiencias únicas</p></div>
      <div class="benefit-item"><h4>✨ Compromiso con el deporte base</h4><p>Contribuye al crecimiento y formación de nuestros deportistas</p></div>
    </div>
  </div>

  <!-- SHARE -->
  <div class="share-box">
    <h3>🤝 ¿Conoces a más personas que quieran apoyar al club?</h3>
    <p>¡Comparte este enlace con familiares y amigos!</p>
    <button class="share-btn" onclick="shareWhatsApp()">💬 Compartir por WhatsApp</button>
  </div>

  <!-- FORM -->
  <div class="form-card">
    <div class="form-header"><h2>👥 Formulario de Inscripción como Socio</h2></div>
    <div class="form-body">
      <div class="error-message" id="errorMsg"></div>

      ${refCode ? `<div class="referral-banner">🎁 <strong>¡Te han invitado!</strong> Al registrarte, quien te invitó recibirá un premio.</div>` : ''}

      <div id="formContent">
        <form id="memberForm" autocomplete="on">
          <!-- Tipo inscripción -->
          <div class="form-group">
            <label>Tipo de Inscripción *</label>
            <div class="radio-group">
              <label class="radio-option selected" onclick="selectRadioOption(this)">
                <input type="radio" name="tipo_inscripcion" value="Nueva Inscripción" checked>
                <div class="radio-content"><h4>🆕 Nueva Inscripción</h4><p>Primera vez como socio del club</p></div>
              </label>
              <label class="radio-option" onclick="selectRadioOption(this)">
                <input type="radio" name="tipo_inscripcion" value="Renovación">
                <div class="radio-content"><h4>🔄 Renovación</h4><p>Ya fui socio en temporadas anteriores</p></div>
              </label>
            </div>
          </div>

          <h3 class="section-title">Datos del nuevo socio</h3>

          <div class="form-row">
            <div class="form-group">
              <label for="nombre_completo">Nombre y Apellidos *</label>
              <input type="text" id="nombre_completo" name="nombre_completo" autocomplete="name" placeholder="Ej: Juan García López" required>
            </div>
            <div class="form-group">
              <label for="dni">DNI *</label>
              <input type="text" id="dni" name="dni" autocomplete="off" placeholder="12345678A" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="telefono">Teléfono Móvil *</label>
              <input type="tel" id="telefono" name="telefono" autocomplete="tel" placeholder="600123456" required>
            </div>
            <div class="form-group">
              <label for="email">Correo Electrónico *</label>
              <input type="email" id="email" name="email" autocomplete="email" placeholder="correo@ejemplo.com" required>
            </div>
          </div>

          <div class="form-group">
            <label for="direccion">Dirección Completa *</label>
            <input type="text" id="direccion" name="direccion" autocomplete="street-address" placeholder="Calle, número, piso..." required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="municipio">Municipio *</label>
              <input type="text" id="municipio" name="municipio" autocomplete="address-level2" placeholder="Bustarviejo" required>
            </div>
            <div class="form-group">
              <label for="fecha_nacimiento">Fecha de Nacimiento</label>
              <input type="date" id="fecha_nacimiento" name="fecha_nacimiento">
            </div>
          </div>

          <!-- Pago -->
          <div class="payment-box">
            <h3>💳 Pago: 25€ /temporada</h3>
            <p style="font-size:13px;color:#6ee7b7;margin-bottom:16px;">Elige cómo prefieres pagar. El pago se realiza de forma segura a través de Stripe.</p>

            <label class="payment-type-option selected" onclick="selectPayment(this)">
              <input type="radio" name="tipo_pago" value="unico" checked>
              <div style="flex:1;"><div class="pto-title">💳 Pago Único</div><div class="pto-desc">Un solo pago por tarjeta para esta temporada</div></div>
              <div class="pto-price">25€</div>
            </label>

            <label class="payment-type-option" onclick="selectPayment(this)">
              <input type="radio" name="tipo_pago" value="suscripcion">
              <div style="flex:1;"><div class="pto-title">🔄 Suscripción Anual <span class="pto-badge">RECOMENDADO</span></div><div class="pto-desc">Se renueva automáticamente cada año. Puedes cancelar cuando quieras.</div></div>
              <div class="pto-price">25€<span style="font-size:12px;font-weight:400;">/año</span></div>
            </label>

            <div class="stripe-badge">🔒 Pago seguro con Stripe</div>
          </div>

          <div class="privacy-notice">
            <p>🔒 <strong>Protección de Datos (RGPD):</strong> Al enviar este formulario, consientes el tratamiento de tus datos personales por el CD Bustarviejo para la gestión de tu membresía. Tus datos serán tratados de forma confidencial. Puedes ejercer tus derechos enviando un email a <a href="mailto:cdbustarviejo@gmail.com">cdbustarviejo@gmail.com</a>.</p>
          </div>

          <button type="submit" class="submit-btn" id="submitBtn">🎉 Registrarme y Pagar con Tarjeta</button>
        </form>
      </div>

      <div class="success-message" id="successMsg">
        <div style="font-size:5rem;margin-bottom:20px;">🎉</div>
        <h2>¡Redirigiendo al pago!</h2>
        <p>Serás redirigido a la pasarela de pago segura de Stripe.</p>
        <p style="margin-top:12px;font-size:13px;color:#94a3b8;">Si no se redirige automáticamente:</p>
        <a href="#" class="stripe-redirect-btn" id="stripeLink">Ir a pagar →</a>
      </div>

      <div class="success-message" id="paidMsg">
        <div style="font-size:5rem;margin-bottom:20px;">✅</div>
        <h2>¡Bienvenido/a a la familia!</h2>
        <p>Tu pago se ha completado correctamente.</p>
        <p style="margin-top:15px;">Recibirás tu <strong>carnet virtual</strong> por email en breve.</p>
      </div>

    </div>
  </div>
</div>

<div class="footer">
  C.D. Bustarviejo · <a href="${WEB_URL}">${WEB_URL}</a>
</div>

<script>
const CHECKOUT_URL = '${checkoutUrl}';
const REF_CODE = '${refCode}';
const CURRENT_PAGE_URL = window.location.href.split('?')[0];

// Check if returning from Stripe
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('paid') === 'ok') {
    document.getElementById('formContent').style.display = 'none';
    document.getElementById('paidMsg').style.display = 'block';
  }
  if (params.get('canceled') === 'socio') {
    showError('El pago fue cancelado. Puedes intentar de nuevo.');
  }
})();

function selectRadioOption(el) {
  el.closest('.radio-group').querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;
}
function selectPayment(el) {
  document.querySelectorAll('.payment-type-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input').checked = true;
}
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg; el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function shareWhatsApp() {
  const shareUrl = CURRENT_PAGE_URL + (REF_CODE ? '?ref=' + REF_CODE : '');
  const msg = '⚽ ¡Hazte socio del CD Bustarviejo por solo 25€/año! Apoya al deporte base de nuestro pueblo 💚\\n\\n👉 ' + shareUrl;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

document.getElementById('memberForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  document.getElementById('errorMsg').style.display = 'none';
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Procesando...';

  const fd = new FormData(this);
  const body = {
    nombre_completo: fd.get('nombre_completo'),
    dni: fd.get('dni'),
    telefono: fd.get('telefono'),
    email: fd.get('email'),
    direccion: fd.get('direccion'),
    municipio: fd.get('municipio'),
    fecha_nacimiento: fd.get('fecha_nacimiento') || '',
    tipo_pago: fd.get('tipo_pago'),
    referido_por: REF_CODE,
    es_segundo_progenitor: false,
    success_url: CURRENT_PAGE_URL.split('?')[0] + '?paid=ok',
    cancel_url: CURRENT_PAGE_URL.split('?')[0] + '?canceled=socio',
  };

  // Validate
  if (!body.nombre_completo || !body.dni || !body.telefono || !body.email || !body.direccion || !body.municipio) {
    showError('Por favor, completa todos los campos obligatorios.');
    btn.disabled = false;
    btn.textContent = '🎉 Registrarme y Pagar con Tarjeta';
    return;
  }

  try {
    const res = await fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Error al procesar el registro.');
      btn.disabled = false;
      btn.textContent = '🎉 Registrarme y Pagar con Tarjeta';
      return;
    }

    if (data.url) {
      document.getElementById('formContent').style.display = 'none';
      document.getElementById('successMsg').style.display = 'block';
      document.getElementById('stripeLink').href = data.url;
      setTimeout(() => { window.location.href = data.url; }, 1500);
    }
  } catch (err) {
    showError('Error de conexión. Inténtalo de nuevo.');
    btn.disabled = false;
    btn.textContent = '🎉 Registrarme y Pagar con Tarjeta';
  }
});
</script>
</body>
</html>`;
}