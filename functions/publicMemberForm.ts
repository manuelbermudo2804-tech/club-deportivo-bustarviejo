import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// PÁGINA PÚBLICA - Formulario de Alta de Socio
// Devuelve HTML completo con estilo web CD Bustarviejo
// Al enviar, llama a publicMemberCheckout para crear socio + redirigir a Stripe
// VERSION: 2026-02-28-v5 - Sin <form>, sin submit, solo botón con onclick inline

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
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
    const checkoutUrl = reqUrl.origin + reqUrl.pathname.replace('/publicMemberForm', '/publicMemberCheckout');

    const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
    const WEB_URL = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';

    const referralBanner = refCode
      ? '<div style="background:#fff5f0;border:2px solid #f57c00;border-radius:10px;padding:16px 20px;margin-bottom:22px;font-size:0.95rem;color:#222;">&#127873; <strong>&#161;Te han invitado!</strong> Al registrarte, quien te invito recibira un premio.</div>'
      : '';

    // VERSION TAG para evitar cachés
    const VERSION = 'v5-' + Date.now();

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hazte Socio - CD Bustarviejo</title>
<meta name="version" content="${VERSION}">
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Montserrat',Arial,sans-serif;background:#fff;color:#222;line-height:1.8;font-size:19px;padding-top:80px}
.header{position:fixed;top:0;left:0;width:100%;z-index:1000;background:#fff;border-bottom:1px solid #eaeaea;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.header-contenido{max-width:1200px;margin:auto;padding:14px 22px;display:flex;justify-content:space-between;align-items:center}
.logo{display:flex;align-items:center;gap:14px;font-weight:700;font-size:1.1rem;margin-right:30px}
.logo img{width:44px}
.logo a{text-decoration:none;color:#222;display:flex;align-items:center;gap:14px}
.menu{display:flex;gap:26px;align-items:center}
.menu a{text-decoration:none;color:#222;font-weight:700;font-size:0.95rem;text-transform:uppercase}
.menu a:hover{color:#f57c00}
.btn-menu{background:#f57c00;color:#000;padding:12px 20px;border-radius:30px;font-weight:800;font-size:0.85rem;text-decoration:none}
.menu-toggle{display:none;font-size:2.2rem;background:none;border:none;cursor:pointer;margin-left:auto}
.hero{position:relative;min-height:50vh;background-image:url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/96c551202_fondo.jpg');background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center}
.hero::before{content:"";position:absolute;inset:0;background:rgba(0,0,0,0.5)}
.hero .contenido{position:relative;text-align:center;color:#fff;padding:40px 20px;max-width:800px}
.escudo-grande{width:140px;margin-bottom:20px}
.hero h1{font-size:2.8rem;margin-bottom:10px;font-weight:800}
.hero .subtitulo{font-size:1.2rem;opacity:0.95}
.cnt{max-width:950px;margin:0 auto;padding:40px 22px 60px}
.benefits{background:#fff;border-radius:10px;padding:40px;margin-bottom:30px;box-shadow:0 12px 30px rgba(0,0,0,0.07)}
.benefits h3{font-size:1.4rem;font-weight:800;margin-bottom:20px;color:#222}
.bg{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.bi{background:#f5f5f5;border-radius:12px;padding:20px;transition:transform 0.2s,box-shadow 0.2s}
.bi:hover{transform:translateY(-4px);box-shadow:0 8px 20px rgba(0,0,0,0.1)}
.bi h4{font-size:1rem;font-weight:800;margin-bottom:6px;color:#222}
.bi p{font-size:0.9rem;color:#555;line-height:1.5}
.sbox{background:#f5f5f5;border-radius:10px;padding:30px;text-align:center;margin-bottom:30px;box-shadow:0 12px 30px rgba(0,0,0,0.07)}
.sbox h3{font-size:1.2rem;font-weight:800;margin-bottom:8px;color:#222}
.sbox p{font-size:0.95rem;color:#555;margin-bottom:18px}
.sbtn{background:#f57c00;color:#000;border:none;border-radius:30px;padding:14px 30px;font-size:1rem;font-weight:800;cursor:pointer;transition:all 0.25s;font-family:inherit;display:inline-block;text-decoration:none}
.sbtn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(245,124,0,0.3)}
.fc{background:#fff;border-radius:10px;overflow:hidden;margin-bottom:30px;box-shadow:0 12px 30px rgba(0,0,0,0.07)}
.fh{background:#f57c00;padding:22px 30px}
.fh h2{font-size:1.3rem;font-weight:800;color:#000}
.fb{padding:30px}
.fg{margin-bottom:20px}
.fg label{display:block;font-size:0.85rem;font-weight:700;color:#222;margin-bottom:8px;text-transform:uppercase}
.fg input{width:100%;padding:14px 18px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#222;font-size:1rem;transition:border-color 0.2s;font-family:inherit}
.fg input:focus{outline:none;border-color:#f57c00;box-shadow:0 0 0 3px rgba(245,124,0,0.15)}
.fg input::placeholder{color:#999}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.rg{display:flex;flex-direction:column;gap:12px}
.ro{display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:10px;border:2px solid #eaeaea;cursor:pointer;transition:all 0.2s;background:#fafafa;user-select:none}
.ro:hover{border-color:#ccc}
.ro.sel{border-color:#f57c00;background:rgba(245,124,0,0.04)}
.ro *{pointer-events:none}
.ro h4{font-size:1rem;font-weight:700;color:#222}
.ro p{font-size:0.8rem;color:#777}
.pb{background:#f9fafb;border:2px solid #f57c00;border-radius:10px;padding:26px;margin:28px 0}
.pb h3{font-size:1.2rem;color:#222;margin-bottom:12px;font-weight:800}
.pto{display:flex;align-items:center;gap:14px;padding:16px;border-radius:10px;border:2px solid #eaeaea;margin-bottom:12px;cursor:pointer;transition:all 0.2s;background:#fff;user-select:none}
.pto:hover{border-color:#ccc}
.pto.sel{border-color:#f57c00;background:rgba(245,124,0,0.04)}
.pto *{pointer-events:none}
.pto-t{font-size:1rem;font-weight:700;color:#222}
.pto-d{font-size:0.8rem;color:#777}
.pto-p{font-size:1.4rem;font-weight:800;color:#f57c00;white-space:nowrap}
.pto-b{background:#f57c00;color:#fff;font-size:0.65rem;padding:3px 10px;border-radius:30px;font-weight:800;margin-left:8px;vertical-align:middle;text-transform:uppercase}
.stitle{font-size:1.1rem;font-weight:800;color:#222;margin:30px 0 16px;padding-bottom:12px;border-bottom:2px solid #eaeaea}
.pn{background:#f5f5f5;border-radius:10px;padding:18px;margin:24px 0;font-size:0.8rem;color:#666;line-height:1.6}
.pn a{color:#f57c00}
.subbtn{display:block;width:100%;background:#f57c00;color:#000;border:none;border-radius:8px;padding:18px;font-size:1.1rem;font-weight:800;cursor:pointer;transition:all 0.25s;font-family:inherit}
.subbtn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(245,124,0,0.35);background:#e06c00}
.subbtn:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none}
.errmsg{display:none;background:#fff5f5;color:#c62828;border:2px solid #c62828;padding:16px 20px;border-radius:10px;margin-bottom:18px;font-size:0.95rem;font-weight:600}
.sucmsg{display:none;text-align:center;padding:50px 20px}
.sucmsg h2{font-size:1.6rem;color:#222;margin-bottom:12px;font-weight:800}
.sucmsg p{color:#555;font-size:1rem}
.strbtn{display:inline-block;margin-top:18px;background:#f57c00;color:#000;text-decoration:none;padding:14px 30px;border-radius:30px;font-weight:800;font-size:1rem;transition:all 0.25s}
.strbtn:hover{background:#e06c00;transform:translateY(-2px)}
.footer{background:#111;color:#ccc;text-align:center;padding:30px 20px;font-size:0.9rem}
.footer a{color:#f57c00;text-decoration:none;font-weight:700}
.stripe-badge{text-align:center;font-size:0.8rem;color:#999;margin-top:14px;padding-top:14px;border-top:1px solid #eaeaea}
@media(max-width:768px){
  body{padding-top:90px;font-size:18px}
  .menu-toggle{display:block}
  .menu{width:100%;display:none;flex-direction:column;align-items:center;background:#fff;padding:15px 0;margin-top:10px;border-top:1px solid #eaeaea}
  .menu.activo{display:flex}
  .menu a{font-size:1rem;padding:12px 0;width:100%;text-align:center}
  .menu .btn-menu{margin-top:10px}
  .header-contenido{flex-direction:row;flex-wrap:wrap}
  .hero{min-height:40vh}
  .hero h1{font-size:1.9rem}
  .hero .subtitulo{font-size:1rem}
  .escudo-grande{width:110px}
  .bg{grid-template-columns:1fr}
  .fr{grid-template-columns:1fr}
  .fb{padding:20px}
  .cnt{padding:24px 16px 40px}
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
    <button class="menu-toggle" onclick="document.getElementById('mainMenu').classList.toggle('activo')">&#9776;</button>
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

<div class="cnt">

  <div class="benefits">
    <h3>&#11088; &#191;Por que ser socio?</h3>
    <div class="bg">
      <div class="bi"><h4>&#128154; Apoyo esencial al club</h4><p>Tu aportacion es vital para el desarrollo de nuestros jovenes deportistas</p></div>
      <div class="bi"><h4>&#128101; Fuerza para la comunidad</h4><p>Unete a la gran familia del club y vive la pasion por el deporte</p></div>
      <div class="bi"><h4>&#127881; Eventos inolvidables</h4><p>Participa en las actividades del club y comparte experiencias unicas</p></div>
      <div class="bi"><h4>&#10024; Compromiso con el deporte base</h4><p>Contribuye al crecimiento y formacion de nuestros deportistas</p></div>
    </div>
  </div>

  <div class="sbox">
    <h3>&#129309; &#191;Conoces a mas personas que quieran apoyar al club?</h3>
    <p>&#161;Comparte este enlace con familiares y amigos!</p>
    <a class="sbtn" href="javascript:void(0)" onclick="window.open('https://api.whatsapp.com/send?text='+encodeURIComponent('Hazte socio del CD Bustarviejo por solo 25 euros al ano! Apoya al deporte base\\n\\n'+location.href.split('?')[0]),'_blank')">&#128172; Compartir por WhatsApp</a>
  </div>

  <div class="fc">
    <div class="fh"><h2>&#128101; Formulario de Inscripcion como Socio</h2></div>
    <div class="fb">
      <div class="errmsg" id="E"></div>

      ${referralBanner}

      <div id="F">

        <div class="fg">
          <label>Tipo de Inscripcion *</label>
          <div class="rg" id="TG">
            <div class="ro sel" data-v="nueva" onclick="selOpt(this,'TG','ro')">
              <div><h4>&#127381; Nueva Inscripcion</h4><p>Primera vez como socio del club</p></div>
            </div>
            <div class="ro" data-v="renovacion" onclick="selOpt(this,'TG','ro')">
              <div><h4>&#128260; Renovacion</h4><p>Ya fui socio en temporadas anteriores</p></div>
            </div>
          </div>
        </div>

        <h3 class="stitle">Datos del nuevo socio</h3>

        <div class="fr">
          <div class="fg">
            <label>Nombre y Apellidos *</label>
            <input type="text" id="I1" autocomplete="name" placeholder="Ej: Juan Garcia Lopez">
          </div>
          <div class="fg">
            <label>DNI *</label>
            <input type="text" id="I2" autocomplete="off" placeholder="12345678A">
          </div>
        </div>

        <div class="fr">
          <div class="fg">
            <label>Telefono Movil *</label>
            <input type="tel" id="I3" autocomplete="tel" placeholder="600123456">
          </div>
          <div class="fg">
            <label>Correo Electronico *</label>
            <input type="email" id="I4" autocomplete="email" placeholder="correo@ejemplo.com">
          </div>
        </div>

        <div class="fg">
          <label>Direccion Completa *</label>
          <input type="text" id="I5" autocomplete="street-address" placeholder="Calle, numero, piso...">
        </div>

        <div class="fr">
          <div class="fg">
            <label>Municipio *</label>
            <input type="text" id="I6" autocomplete="address-level2" placeholder="Bustarviejo">
          </div>
          <div class="fg">
            <label>Fecha de Nacimiento</label>
            <input type="date" id="I7">
          </div>
        </div>

        <div class="pb">
          <h3>&#128179; Pago: 25&#8364; /temporada</h3>
          <p style="font-size:0.85rem;color:#555;margin-bottom:16px;">Elige como prefieres pagar. El pago se realiza de forma segura a traves de Stripe.</p>

          <div id="PG">
            <div class="pto sel" data-v="unico" onclick="selOpt(this,'PG','pto')">
              <div style="flex:1"><div class="pto-t">&#128179; Pago Unico</div><div class="pto-d">Un solo pago por tarjeta para esta temporada</div></div>
              <div class="pto-p">25&#8364;</div>
            </div>
            <div class="pto" data-v="suscripcion" onclick="selOpt(this,'PG','pto')">
              <div style="flex:1"><div class="pto-t">&#128260; Suscripcion Anual <span class="pto-b">RECOMENDADO</span></div><div class="pto-d">Se renueva automaticamente cada ano. Puedes cancelar cuando quieras.</div></div>
              <div class="pto-p">25&#8364;<span style="font-size:12px;font-weight:400">/ano</span></div>
            </div>
          </div>

          <div class="stripe-badge">&#128274; Pago seguro con Stripe</div>
        </div>

        <div class="pn">
          <p>&#128274; <strong>Proteccion de Datos (RGPD):</strong> Al enviar este formulario, consientes el tratamiento de tus datos personales por el CD Bustarviejo para la gestion de tu membresia. Tus datos seran tratados de forma confidencial. Puedes ejercer tus derechos enviando un email a <a href="mailto:cdbustarviejo@outlook.es">cdbustarviejo@outlook.es</a>.</p>
        </div>

        <button type="button" class="subbtn" id="SB" onclick="doSubmit()">&#127881; Registrarme y Pagar con Tarjeta</button>

      </div>

      <div class="sucmsg" id="SM">
        <div style="font-size:5rem;margin-bottom:20px">&#127881;</div>
        <h2>&#161;Redirigiendo al pago!</h2>
        <p>Seras redirigido a la pasarela de pago segura de Stripe.</p>
        <p style="margin-top:12px;font-size:13px;color:#94a3b8">Si no se redirige automaticamente:</p>
        <a href="#" class="strbtn" id="SL" target="_blank">Ir a pagar &#8594;</a>
      </div>

      <div class="sucmsg" id="PM">
        <div style="font-size:5rem;margin-bottom:20px">&#9989;</div>
        <h2>&#161;Bienvenido/a a la familia!</h2>
        <p>Tu pago se ha completado correctamente.</p>
        <p style="margin-top:15px">Recibiras tu <strong>carnet virtual</strong> por email en breve.</p>
      </div>

    </div>
  </div>
</div>

<footer class="footer">
  <p>&#169; Club Deportivo Bustarviejo &#183; <a href="${WEB_URL}">Volver a la web</a></p>
</footer>

<script>
// VERSION ${VERSION} - SIN form, solo onclick inline
var CK='${checkoutUrl}';
var RC='${refCode}';
var PG=location.href.split('?')[0];

// Check retorno Stripe
try{
  var p=new URLSearchParams(location.search);
  if(p.get('paid')==='ok'){document.getElementById('F').style.display='none';document.getElementById('PM').style.display='block'}
  if(p.get('canceled')==='socio'){showE('El pago fue cancelado. Puedes intentar de nuevo.')}
}catch(x){}

function selOpt(el,gid,cls){
  var g=document.getElementById(gid);
  if(!g)return;
  var all=g.getElementsByClassName(cls);
  for(var i=0;i<all.length;i++){all[i].classList.remove('sel')}
  el.classList.add('sel');
}

function getSelVal(gid,cls){
  var g=document.getElementById(gid);
  if(!g)return'';
  var s=g.querySelector('.'+cls+'.sel');
  return s?s.getAttribute('data-v'):'';
}

function showE(m){var e=document.getElementById('E');if(e){e.textContent=m;e.style.display='block';e.scrollIntoView({behavior:'smooth',block:'center'})}}
function hideE(){var e=document.getElementById('E');if(e)e.style.display='none'}

function doSubmit(){
  hideE();
  var btn=document.getElementById('SB');
  btn.disabled=true;btn.textContent='Procesando...';

  var n=(document.getElementById('I1').value||'').trim();
  var d=(document.getElementById('I2').value||'').trim();
  var t=(document.getElementById('I3').value||'').trim();
  var em=(document.getElementById('I4').value||'').trim();
  var di=(document.getElementById('I5').value||'').trim();
  var mu=(document.getElementById('I6').value||'').trim();
  var fn=document.getElementById('I7').value||'';

  if(!n||!d||!t||!em||!di||!mu){
    showE('Por favor, completa todos los campos obligatorios.');
    btn.disabled=false;btn.textContent='Registrarme y Pagar con Tarjeta';
    return;
  }

  var ti=getSelVal('TG','ro');
  var tp=getSelVal('PG','pto');

  var body=JSON.stringify({
    nombre_completo:n,dni:d,telefono:t,email:em,direccion:di,municipio:mu,
    fecha_nacimiento:fn,
    tipo_pago:tp||'unico',
    tipo_inscripcion:ti==='renovacion'?'Renovacion':'Nueva Inscripcion',
    referido_por:RC,
    es_segundo_progenitor:false,
    success_url:PG+'?paid=ok',
    cancel_url:PG+'?canceled=socio'
  });

  var x=new XMLHttpRequest();
  x.open('POST',CK,true);
  x.setRequestHeader('Content-Type','application/json');
  x.onload=function(){
    try{
      var r=JSON.parse(x.responseText);
      if(x.status>=200&&x.status<300&&r.url){
        document.getElementById('F').style.display='none';
        document.getElementById('SM').style.display='block';
        document.getElementById('SL').href=r.url;
        location.href=r.url;
      }else{
        showE(r.error||'Error al procesar el registro.');
        btn.disabled=false;btn.textContent='Registrarme y Pagar con Tarjeta';
      }
    }catch(pe){
      showE('Error al procesar la respuesta.');
      btn.disabled=false;btn.textContent='Registrarme y Pagar con Tarjeta';
    }
  };
  x.onerror=function(){
    showE('Error de conexion. Intentalo de nuevo.');
    btn.disabled=false;btn.textContent='Registrarme y Pagar con Tarjeta';
  };
  x.send(body);
}
</script>
</body>
</html>`;

    return new Response(html, { headers: corsHeaders });
  } catch (error) {
    console.error('Error en publicMemberForm:', error);
    return new Response('<h1>Error al cargar el formulario</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});