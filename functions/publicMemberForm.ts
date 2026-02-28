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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  line-height: 1.6;
  min-height: 100vh;
}
body::before {
  content: '';
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/96c551202_fondo.jpg') center/cover no-repeat;
  opacity: 0.18;
  z-index: -1;
}

/* ═══ NAVBAR — estilo web CD Bustarviejo ═══ */
.navbar {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #1a1a1a;
}
.navbar-brand img { width: 44px; height: 44px; object-fit: contain; }
.navbar-brand span { font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }
.navbar-links { display: flex; align-items: center; gap: 8px; }
.navbar-links a {
  text-decoration: none; color: #333; font-size: 14px; font-weight: 500;
  padding: 8px 16px; border-radius: 8px; transition: all 0.2s;
}
.navbar-links a:hover { background: #f5f5f5; }
.navbar-links .btn-activo {
  background: #f97316; color: white; font-weight: 700;
  border-radius: 12px; padding: 10px 22px;
}

/* ═══ HEADER ═══ */
.page-header {
  text-align: center;
  padding: 50px 20px 30px;
}
.page-header img { width: 80px; height: 80px; border-radius: 20px; margin-bottom: 16px; }
.page-header h1 {
  font-size: 32px; font-weight: 800;
  background: linear-gradient(135deg, #f97316, #fbbf24);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 6px;
}
.page-header p { color: #94a3b8; font-size: 16px; }

/* ═══ CONTAINER ═══ */
.container { max-width: 720px; margin: 0 auto; padding: 0 16px 60px; }

/* ═══ BENEFITS ═══ */
.benefits {
  background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 24px;
  color: #1a1a1a;
}
.benefits h3 { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #166534; }
.benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.benefit-item {
  background: white; border-radius: 14px; padding: 16px;
  border: 1px solid #dcfce7; transition: transform 0.2s;
}
.benefit-item:hover { transform: translateY(-2px); }
.benefit-item h4 { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #1a1a1a; }
.benefit-item p { font-size: 13px; color: #64748b; line-height: 1.4; }

/* ═══ SHARE BOX ═══ */
.share-box {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 20px; padding: 28px; text-align: center;
  margin-bottom: 24px; color: white;
}
.share-box h3 { font-size: 17px; margin-bottom: 6px; }
.share-box p { font-size: 14px; opacity: 0.85; margin-bottom: 16px; }
.share-btn {
  background: white; color: #7c3aed; border: none; border-radius: 50px;
  padding: 12px 28px; font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
}
.share-btn:hover { transform: scale(1.03); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }

/* ═══ FORM CARD ═══ */
.form-card {
  background: #1e293b;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #334155;
  margin-bottom: 24px;
}
.form-header {
  background: linear-gradient(135deg, #059669, #10b981);
  padding: 20px 28px;
}
.form-header h2 { font-size: 20px; font-weight: 700; color: white; }
.form-body { padding: 28px; }

/* ═══ FORM ELEMENTS ═══ */
.form-group { margin-bottom: 18px; }
.form-group label {
  display: block; font-size: 13px; font-weight: 600;
  color: #94a3b8; margin-bottom: 6px;
}
.form-group input, .form-group select {
  width: 100%; padding: 12px 16px; border-radius: 12px;
  border: 2px solid #334155; background: #0f172a;
  color: #e2e8f0; font-size: 15px; transition: border-color 0.2s;
  font-family: inherit;
}
.form-group input:focus, .form-group select:focus {
  outline: none; border-color: #f97316;
}
.form-group input::placeholder { color: #475569; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ═══ RADIO OPTIONS ═══ */
.radio-group { display: flex; flex-direction: column; gap: 10px; }
.radio-option {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 14px;
  border: 2px solid #334155; cursor: pointer;
  transition: all 0.2s; background: #0f172a;
}
.radio-option:hover { border-color: #475569; }
.radio-option.selected { border-color: #10b981; background: rgba(16,185,129,0.08); }
.radio-option input { display: none; }
.radio-content h4 { font-size: 15px; font-weight: 600; color: #e2e8f0; }
.radio-content p { font-size: 12px; color: #64748b; }

/* ═══ PAYMENT BOX ═══ */
.payment-box {
  background: rgba(16,185,129,0.06);
  border: 2px solid #059669;
  border-radius: 16px; padding: 24px;
  margin: 24px 0;
}
.payment-box h3 { font-size: 18px; color: #10b981; margin-bottom: 10px; }
.payment-type-option {
  display: flex; align-items: center; gap: 12px;
  padding: 14px; border-radius: 12px;
  border: 2px solid #334155; margin-bottom: 10px;
  cursor: pointer; transition: all 0.2s;
}
.payment-type-option:hover { border-color: #475569; }
.payment-type-option.selected { border-color: #f97316; background: rgba(249,115,22,0.06); }
.payment-type-option input { display: none; }
.pto-title { font-size: 15px; font-weight: 600; }
.pto-desc { font-size: 12px; color: #64748b; }
.pto-price { font-size: 22px; font-weight: 800; color: #f97316; white-space: nowrap; }
.pto-badge {
  background: #f97316; color: white; font-size: 10px;
  padding: 2px 8px; border-radius: 50px; font-weight: 700;
  margin-left: 6px; vertical-align: middle;
}
.stripe-badge {
  text-align: center; font-size: 12px; color: #64748b;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;
}

/* ═══ SECTION TITLE ═══ */
.section-title {
  font-size: 16px; font-weight: 700; color: #e2e8f0;
  margin: 28px 0 14px; padding-bottom: 10px;
  border-bottom: 2px solid #334155;
}

/* ═══ REFERRAL BANNER ═══ */
.referral-banner {
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.3);
  border-radius: 12px; padding: 14px 18px;
  margin-bottom: 20px; font-size: 14px; color: #fbbf24;
}

/* ═══ PRIVACY ═══ */
.privacy-notice {
  background: rgba(100,116,139,0.1);
  border-radius: 12px; padding: 16px;
  margin: 20px 0; font-size: 12px; color: #64748b; line-height: 1.5;
}
.privacy-notice a { color: #f97316; }

/* ═══ SUBMIT ═══ */
.submit-btn {
  display: block; width: 100%;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white; border: none; border-radius: 16px;
  padding: 18px; font-size: 18px; font-weight: 800;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit;
}
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(249,115,22,0.3); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

/* ═══ MESSAGES ═══ */
.error-message {
  display: none; background: #7f1d1d; color: #fecaca;
  padding: 14px 18px; border-radius: 12px;
  margin-bottom: 16px; font-size: 14px;
}
.success-message {
  display: none; text-align: center; padding: 40px 20px;
}
.success-message h2 { font-size: 24px; color: #10b981; margin-bottom: 10px; }
.success-message p { color: #94a3b8; }
.stripe-redirect-btn {
  display: inline-block; margin-top: 16px;
  background: #f97316; color: white; text-decoration: none;
  padding: 12px 28px; border-radius: 12px; font-weight: 700;
}

/* ═══ FOOTER ═══ */
.footer {
  text-align: center; padding: 24px 20px;
  font-size: 12px; color: #475569;
  border-top: 1px solid #1e293b;
}
.footer a { color: #f97316; text-decoration: none; font-weight: 600; }

/* ═══ RESPONSIVE ═══ */
@media (max-width: 768px) {
  .navbar { padding: 0 12px; height: 60px; }
  .navbar-brand img { width: 36px; height: 36px; }
  .navbar-brand span { font-size: 15px; }
  .navbar-links a:not(.btn-activo) { display: none; }
  .page-header h1 { font-size: 24px; }
  .benefits-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .form-body { padding: 20px; }
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