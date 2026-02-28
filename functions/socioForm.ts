// FORMULARIO PÚBLICO DE SOCIO - FUNCIÓN NUEVA (sin caché)
// Devuelve HTML puro, sin <form>, sin addEventListener, solo onclick inline

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    let refCode = '';
    try {
      const url = new URL(req.url);
      refCode = url.searchParams.get('ref') || '';
    } catch {}

    const reqUrl = new URL(req.url);
    const checkoutUrl = reqUrl.origin + reqUrl.pathname.replace('/socioForm', '/publicMemberCheckout');

    const ESCUDO = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/img/escudo.png';
    const WEB_URL = 'https://manuelbermudo2804-tech.github.io/cdBustarviejo-web/';
    const FONDO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/96c551202_fondo.jpg';
    const TS = Date.now();

    const refBanner = refCode
      ? `<div style="background:#fff5f0;border:2px solid #f57c00;border-radius:10px;padding:16px 20px;margin-bottom:22px;font-size:0.95rem;color:#222">&#127873; <b>&#161;Te han invitado!</b> Al registrarte, quien te invito recibira un premio.</div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hazte Socio - CD Bustarviejo</title>
<meta name="build" content="sf-${TS}">
<link rel="icon" href="${ESCUDO}">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Montserrat',sans-serif;background:#fff;color:#222;line-height:1.7;font-size:17px;padding-top:70px}
header{position:fixed;top:0;left:0;width:100%;z-index:999;background:#fff;border-bottom:1px solid #e5e5e5;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.hdr{max-width:1100px;margin:auto;padding:12px 20px;display:flex;justify-content:space-between;align-items:center}
.hdr img{width:40px;margin-right:12px}
.hdr a{text-decoration:none;color:#222;display:flex;align-items:center;font-weight:700;font-size:1rem}
nav a{text-decoration:none;color:#222;font-weight:700;font-size:.85rem;text-transform:uppercase;margin-left:20px}
nav a:hover{color:#f57c00}
.hero-s{position:relative;min-height:45vh;background:url('${FONDO}') center/cover;display:flex;align-items:center;justify-content:center}
.hero-s::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,.5)}
.hero-s div{position:relative;text-align:center;color:#fff;padding:30px 20px}
.hero-s img{width:120px;margin-bottom:16px}
.hero-s h1{font-size:2.4rem;font-weight:800}
.hero-s p{font-size:1.1rem;opacity:.9}
.w{max-width:900px;margin:0 auto;padding:30px 20px 50px}
.card-s{background:#fff;border-radius:12px;padding:30px;margin-bottom:24px;box-shadow:0 8px 24px rgba(0,0,0,.06)}
.card-s h3{font-size:1.2rem;font-weight:800;margin-bottom:16px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.gi{background:#f5f5f5;border-radius:10px;padding:18px}
.gi h4{font-size:.95rem;font-weight:800;margin-bottom:4px}
.gi p{font-size:.85rem;color:#555;line-height:1.4}
.share-s{background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px}
.share-s h3{font-size:1.1rem;font-weight:800;margin-bottom:6px}
.share-s p{font-size:.9rem;color:#555;margin-bottom:14px}
.obtn{background:#f57c00;color:#000;border:none;border-radius:30px;padding:12px 26px;font-size:.95rem;font-weight:800;cursor:pointer;font-family:inherit}
.fcard{background:#fff;border-radius:12px;overflow:hidden;margin-bottom:24px;box-shadow:0 8px 24px rgba(0,0,0,.06)}
.fcard-h{background:#f57c00;padding:18px 24px}
.fcard-h h2{font-size:1.15rem;font-weight:800;color:#000}
.fcard-b{padding:24px}
.fgroup{margin-bottom:18px}
.fgroup label{display:block;font-size:.8rem;font-weight:700;margin-bottom:6px;text-transform:uppercase}
.fgroup input{width:100%;padding:12px 16px;border-radius:8px;border:1px solid #ddd;font-size:1rem;font-family:inherit}
.fgroup input:focus{outline:none;border-color:#f57c00;box-shadow:0 0 0 3px rgba(245,124,0,.12)}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.optbox{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:10px;border:2px solid #e5e5e5;cursor:pointer;background:#fafafa;margin-bottom:10px;transition:border-color .15s}
.optbox:hover{border-color:#ccc}
.optbox.act{border-color:#f57c00;background:rgba(245,124,0,.04)}
.optbox h4{font-size:.95rem;font-weight:700}
.optbox p{font-size:.78rem;color:#777}
.optbox .price{font-size:1.3rem;font-weight:800;color:#f57c00;white-space:nowrap;margin-left:auto}
.optbox .badge{background:#f57c00;color:#fff;font-size:.6rem;padding:2px 8px;border-radius:20px;font-weight:800;margin-left:6px;text-transform:uppercase;vertical-align:middle}
.paybox{background:#f9fafb;border:2px solid #f57c00;border-radius:10px;padding:22px;margin:24px 0}
.paybox h3{font-size:1.1rem;font-weight:800;margin-bottom:10px}
.notice{background:#f5f5f5;border-radius:10px;padding:16px;margin:20px 0;font-size:.78rem;color:#666;line-height:1.5}
.notice a{color:#f57c00}
.gobtn{display:block;width:100%;background:#f57c00;color:#000;border:none;border-radius:8px;padding:16px;font-size:1.05rem;font-weight:800;cursor:pointer;font-family:inherit;transition:background .2s}
.gobtn:hover{background:#e06c00}
.gobtn:disabled{opacity:.5;cursor:not-allowed}
.erbox{display:none;background:#fff5f5;color:#c62828;border:2px solid #c62828;padding:14px 18px;border-radius:10px;margin-bottom:16px;font-size:.9rem;font-weight:600}
.okbox{display:none;text-align:center;padding:40px 20px}
.okbox h2{font-size:1.4rem;font-weight:800;margin-bottom:10px}
.okbox p{color:#555;font-size:.95rem}
.slink{display:inline-block;margin-top:16px;background:#f57c00;color:#000;text-decoration:none;padding:12px 26px;border-radius:30px;font-weight:800;font-size:.95rem}
footer{background:#111;color:#ccc;text-align:center;padding:24px 20px;font-size:.85rem}
footer a{color:#f57c00;text-decoration:none;font-weight:700}
.stripe-s{text-align:center;font-size:.75rem;color:#999;margin-top:12px;padding-top:12px;border-top:1px solid #eaeaea}
@media(max-width:768px){
body{padding-top:80px;font-size:16px}
.hero-s{min-height:35vh}
.hero-s h1{font-size:1.8rem}
.hero-s img{width:90px}
.grid2,.frow{grid-template-columns:1fr}
.fcard-b{padding:18px}
.w{padding:20px 14px 40px}
nav{display:none}
}
</style>
</head>
<body>

<header>
<div class="hdr">
<a href="${WEB_URL}"><img src="${ESCUDO}" alt="CDB"> Club Deportivo Bustarviejo</a>
<nav>
<a href="${WEB_URL}">INICIO</a>
<a href="${WEB_URL}equipos.html">EQUIPOS</a>
<a href="#">HAZTE SOCIO</a>
</nav>
</div>
</header>

<section class="hero-s">
<div>
<img src="${ESCUDO}" alt="Escudo">
<h1>&#161;Hazte Socio!</h1>
<p>Deporte, valores y comunidad</p>
</div>
</section>

<div class="w">

<div class="card-s">
<h3>&#11088; &#191;Por que ser socio?</h3>
<div class="grid2">
<div class="gi"><h4>&#128154; Apoyo al club</h4><p>Tu aportacion es vital para nuestros jovenes deportistas</p></div>
<div class="gi"><h4>&#128101; Comunidad</h4><p>Unete a la gran familia del club</p></div>
<div class="gi"><h4>&#127881; Eventos</h4><p>Participa en actividades y experiencias unicas</p></div>
<div class="gi"><h4>&#10024; Deporte base</h4><p>Contribuye al crecimiento deportivo</p></div>
</div>
</div>

<div class="share-s">
<h3>&#129309; &#191;Conoces a alguien mas?</h3>
<p>&#161;Comparte este enlace!</p>
<button class="obtn" onclick="window.open('https://api.whatsapp.com/send?text='+encodeURIComponent('Hazte socio del CD Bustarviejo por solo 25 euros!\\n\\n'+location.href.split('?')[0]),'_blank')">&#128172; Compartir por WhatsApp</button>
</div>

<div class="fcard">
<div class="fcard-h"><h2>&#128101; Formulario de Inscripcion</h2></div>
<div class="fcard-b">

<div class="erbox" id="ER"></div>
${refBanner}

<div id="FORM">

<div class="fgroup">
<label>Tipo de Inscripcion *</label>
<div id="GRP_TIPO">
<div class="optbox act" data-v="nueva" onclick="pick(this,'GRP_TIPO')"><div><h4>&#127381; Nueva Inscripcion</h4><p>Primera vez como socio</p></div></div>
<div class="optbox" data-v="renovacion" onclick="pick(this,'GRP_TIPO')"><div><h4>&#128260; Renovacion</h4><p>Ya fui socio en temporadas anteriores</p></div></div>
</div>
</div>

<h3 style="font-size:1rem;font-weight:800;margin:24px 0 14px;padding-bottom:10px;border-bottom:2px solid #eaeaea">Datos del socio</h3>

<div class="frow">
<div class="fgroup"><label>Nombre y Apellidos *</label><input type="text" id="F1" placeholder="Juan Garcia Lopez"></div>
<div class="fgroup"><label>DNI *</label><input type="text" id="F2" placeholder="12345678A"></div>
</div>
<div class="frow">
<div class="fgroup"><label>Telefono *</label><input type="tel" id="F3" placeholder="600123456"></div>
<div class="fgroup"><label>Email *</label><input type="email" id="F4" placeholder="correo@ejemplo.com"></div>
</div>
<div class="fgroup"><label>Direccion *</label><input type="text" id="F5" placeholder="Calle, numero, piso..."></div>
<div class="frow">
<div class="fgroup"><label>Municipio *</label><input type="text" id="F6" placeholder="Bustarviejo"></div>
<div class="fgroup"><label>Fecha Nacimiento</label><input type="date" id="F7"></div>
</div>

<div class="paybox">
<h3>&#128179; Cuota: 25&#8364; / temporada</h3>
<p style="font-size:.82rem;color:#555;margin-bottom:14px">Pago seguro con Stripe.</p>
<div id="GRP_PAGO">
<div class="optbox act" data-v="unico" onclick="pick(this,'GRP_PAGO')"><div style="flex:1"><h4>&#128179; Pago Unico</h4><p>Un solo pago por tarjeta</p></div><div class="price">25&#8364;</div></div>
<div class="optbox" data-v="suscripcion" onclick="pick(this,'GRP_PAGO')"><div style="flex:1"><h4>&#128260; Suscripcion Anual <span class="badge">RECOMENDADO</span></h4><p>Se renueva cada ano. Cancela cuando quieras.</p></div><div class="price">25&#8364;<span style="font-size:11px;font-weight:400">/ano</span></div></div>
</div>
<div class="stripe-s">&#128274; Pago seguro con Stripe</div>
</div>

<div class="notice">
<p>&#128274; <b>RGPD:</b> Al enviar consientes el tratamiento de datos por CD Bustarviejo. Email: <a href="mailto:cdbustarviejo@gmail.com">cdbustarviejo@gmail.com</a></p>
</div>

<button type="button" class="gobtn" id="BTN" onclick="go()">&#127881; Registrarme y Pagar con Tarjeta</button>

</div>

<div class="okbox" id="OK1">
<div style="font-size:4rem;margin-bottom:16px">&#127881;</div>
<h2>&#161;Redirigiendo al pago!</h2>
<p>Seras redirigido a Stripe.</p>
<p style="margin-top:10px;font-size:.8rem;color:#94a3b8">Si no se redirige:</p>
<a href="#" class="slink" id="SURL" target="_blank">Ir a pagar &#8594;</a>
</div>

<div class="okbox" id="OK2">
<div style="font-size:4rem;margin-bottom:16px">&#9989;</div>
<h2>&#161;Bienvenido/a!</h2>
<p>Tu pago se ha completado correctamente.</p>
<p style="margin-top:12px">Recibiras tu <b>carnet virtual</b> por email.</p>
</div>

</div>
</div>

</div>

<footer><p>&#169; CD Bustarviejo &#183; <a href="${WEB_URL}">Volver a la web</a></p></footer>

<script>
// BUILD sf-${TS} - FUNCION NUEVA socioForm
var CK='${checkoutUrl}';
var RC='${refCode}';
var PG=location.href.split('?')[0];

// Retorno Stripe
try{var q=new URLSearchParams(location.search);if(q.get('paid')==='ok'){document.getElementById('FORM').style.display='none';document.getElementById('OK2').style.display='block'}if(q.get('canceled')==='socio'){err('El pago fue cancelado. Puedes intentar de nuevo.')}}catch(x){}

function pick(el,gid){
var g=document.getElementById(gid);
if(!g)return;
var ch=g.children;
for(var i=0;i<ch.length;i++){ch[i].classList.remove('act')}
el.classList.add('act');
}

function val(gid){
var g=document.getElementById(gid);
if(!g)return '';
var s=g.querySelector('.act');
return s?s.getAttribute('data-v'):'';
}

function err(m){var e=document.getElementById('ER');e.textContent=m;e.style.display='block';e.scrollIntoView({behavior:'smooth',block:'center'})}
function clrErr(){var e=document.getElementById('ER');e.style.display='none'}

function go(){
clrErr();
var b=document.getElementById('BTN');
b.disabled=true;b.textContent='Procesando...';

var f1=(document.getElementById('F1').value||'').trim();
var f2=(document.getElementById('F2').value||'').trim();
var f3=(document.getElementById('F3').value||'').trim();
var f4=(document.getElementById('F4').value||'').trim();
var f5=(document.getElementById('F5').value||'').trim();
var f6=(document.getElementById('F6').value||'').trim();
var f7=document.getElementById('F7').value||'';

if(!f1||!f2||!f3||!f4||!f5||!f6){
err('Por favor, completa todos los campos obligatorios.');
b.disabled=false;b.textContent='Registrarme y Pagar con Tarjeta';
return;
}

var ti=val('GRP_TIPO');
var tp=val('GRP_PAGO');

var body=JSON.stringify({
nombre_completo:f1,dni:f2,telefono:f3,email:f4,direccion:f5,municipio:f6,
fecha_nacimiento:f7,
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
document.getElementById('FORM').style.display='none';
document.getElementById('OK1').style.display='block';
document.getElementById('SURL').href=r.url;
location.href=r.url;
}else{
err(r.error||'Error al procesar.');
b.disabled=false;b.textContent='Registrarme y Pagar con Tarjeta';
}
}catch(pe){
err('Error en la respuesta.');
b.disabled=false;b.textContent='Registrarme y Pagar con Tarjeta';
}
};
x.onerror=function(){
err('Error de conexion.');
b.disabled=false;b.textContent='Registrarme y Pagar con Tarjeta';
};
x.send(body);
}
</script>
</body>
</html>`;

    return new Response(html, { headers });
  } catch (error) {
    return new Response('<h1>Error</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
});