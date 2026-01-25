import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop(); // 'socio' o 'femenino'
  const refCode = url.searchParams.get('ref') || '';
  
  // HTML Común
  const htmlHead = `
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CD Bustarviejo - Únete al Club</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .animate-fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
  `;

  // --- PÁGINA FEMENINO ---
  if (path === 'femenino') {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      ${htmlHead}
      <body class="bg-black min-h-screen text-white">
        <div class="relative min-h-[60vh] flex items-center justify-center bg-[url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/8c92c8030_ChatGPTImage4dic202516_29_25.png')] bg-cover bg-center">
          <div class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black"></div>
          <div class="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
            <span class="bg-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">Fútbol Femenino</span>
            <h1 class="text-4xl md:text-6xl font-black mb-4 leading-tight">
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-orange-400">
                ¡ÚNETE AL EQUIPO!
              </span>
            </h1>
            <p class="text-xl text-white/90 mb-8">CD Bustarviejo Femenino. Más que un equipo, una familia.</p>
            <button onclick="document.getElementById('form-section').scrollIntoView({behavior: 'smooth'})" class="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105">
              ¡QUIERO APUNTARME! <i class="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>

        <div id="form-section" class="bg-gradient-to-b from-black to-gray-900 py-16 px-4">
          <div class="max-w-xl mx-auto bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
            <h2 class="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
              <i class="fas fa-clipboard-list text-pink-500"></i> Formulario de Interés
            </h2>
            
            <form id="interestForm" class="space-y-4">
              <input type="hidden" name="referral_code" value="${refCode}">
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-gray-400 mb-1">NOMBRE JUGADORA *</label>
                  <input type="text" name="nombre_jugadora" required class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition">
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-400 mb-1">FECHA NACIMIENTO</label>
                  <input type="date" name="fecha_nacimiento" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-400 mb-1">NOMBRE MADRE/PADRE/TUTOR *</label>
                <input type="text" name="nombre_padre" required class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition">
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-gray-400 mb-1">EMAIL *</label>
                  <input type="email" name="email" required class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition">
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-400 mb-1">TELÉFONO *</label>
                  <input type="tel" name="telefono" required class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition">
                </div>
              </div>
              
              <div>
                 <label class="block text-xs font-bold text-gray-400 mb-1">EXPERIENCIA PREVIA</label>
                 <select name="experiencia_previa" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 transition">
                   <option value="" class="bg-gray-900">Selecciona...</option>
                   <option value="Sin experiencia" class="bg-gray-900">Sin experiencia</option>
                   <option value="1-2 años" class="bg-gray-900">1-2 años</option>
                   <option value="Más de 2 años" class="bg-gray-900">Más de 2 años</option>
                 </select>
              </div>

              <button type="submit" id="submitBtn" class="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all mt-6">
                ENVIAR SOLICITUD
              </button>
            </form>
          </div>
          
          <div id="successMessage" class="hidden max-w-xl mx-auto mt-8 text-center bg-green-900/50 border border-green-500/50 rounded-2xl p-8">
            <div class="text-5xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold text-white mb-2">¡Solicitud Recibida!</h3>
            <p class="text-green-200">Gracias por tu interés. Nos pondremos en contacto contigo muy pronto.</p>
          </div>
        </div>

        <script>
          document.getElementById('interestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = "Enviando...";

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Inyectar el código de referido en el payload si existe
            if('${refCode}') {
               data.referido_por_codigo = '${refCode}';
            }

            try {
              // Llamar a la función del backend existente
              // NOTA: Asumimos que la función está en el mismo dominio o accesible
              const response = await fetch('/functions/submitFemeninoInterest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });

              const result = await response.json();
              if (result.success) {
                document.getElementById('interestForm').classList.add('hidden');
                document.getElementById('successMessage').classList.remove('hidden');
                window.scrollTo({ top: document.getElementById('successMessage').offsetTop - 100, behavior: 'smooth' });
              } else {
                throw new Error(result.error || 'Error al enviar');
              }
            } catch (err) {
              alert('Error: ' + err.message);
              btn.disabled = false;
              btn.innerText = originalText;
            }
          });
        </script>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  // --- PÁGINA SOCIO (DEFAULT) ---
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    ${htmlHead}
    <body class="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 min-h-screen flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-fade-in">
        
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-center text-white">
          <div class="w-20 h-20 bg-white p-1 rounded-2xl mx-auto shadow-lg mb-4">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" class="w-full h-full object-cover rounded-xl" alt="Logo">
          </div>
          <h1 class="text-2xl font-bold mb-1">Hazte Socio</h1>
          <p class="text-purple-100 text-sm">CD Bustarviejo • Temporada 24/25</p>
        </div>

        <div class="p-6 md:p-8">
          <div class="flex items-center justify-between mb-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <div class="flex items-center gap-3">
              <div class="bg-purple-200 p-2 rounded-full text-purple-700"><i class="fas fa-id-card"></i></div>
              <div>
                <p class="font-bold text-gray-800">Cuota Anual</p>
                <p class="text-xs text-gray-500">Pago único</p>
              </div>
            </div>
            <span class="text-2xl font-black text-purple-700">25€</span>
          </div>

          <form id="socioForm" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
              <input type="text" name="nombre_completo" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" placeholder="Tu nombre y apellidos">
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">DNI / NIE</label>
                <input type="text" name="dni" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                <input type="tel" name="telefono" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition">
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" name="email" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" placeholder="tu@email.com">
            </div>

            <div class="grid grid-cols-2 gap-3">
               <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Municipio</label>
                  <input type="text" name="municipio" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition" placeholder="Bustarviejo">
               </div>
               <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección</label>
                  <input type="text" name="direccion" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition">
               </div>
            </div>

            <button type="submit" id="payBtn" class="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 mt-4">
              <span>Pagar y Unirse</span> <i class="fas fa-arrow-right"></i>
            </button>
            
            <p class="text-center text-xs text-gray-400 mt-2">
              <i class="fas fa-lock"></i> Pago seguro procesado por Stripe
            </p>
          </form>
        </div>
      </div>

      <script>
        document.getElementById('socioForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('payBtn');
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
          btn.disabled = true;

          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          const refCode = '${refCode}';

          try {
            // Llamar a stripeCheckout (Backend Function)
            // Se asume que stripeCheckout acepta CORS y public access con metadata específica
            const response = await fetch('/functions/stripeCheckout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: 2500, // 25.00 EUR
                name: 'Cuota Socio - ' + data.nombre_completo,
                currency: 'eur',
                successUrl: window.location.href + '?payment=success', // Simple retorno
                cancelUrl: window.location.href,
                metadata: {
                   tipo: 'alta_socio_referido',
                   nombre_completo: data.nombre_completo,
                   dni: data.dni,
                   email: data.email,
                   telefono: data.telefono,
                   municipio: data.municipio,
                   direccion: data.direccion,
                   referral_code: refCode
                }
              })
            });

            const result = await response.json();
            if (result.url) {
              window.location.href = result.url;
            } else {
              throw new Error(result.error || 'Error iniciando pago');
            }
          } catch (err) {
            alert('Error: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '<span>Pagar y Unirse</span> <i class="fas fa-arrow-right"></i>';
          }
        });

        // Check for success param
        if (new URLSearchParams(window.location.search).get('payment') === 'success') {
          document.body.innerHTML = \`
            <div class="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm animate-fade-in">
              <div class="text-6xl mb-4">✅</div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">¡Bienvenido!</h2>
              <p class="text-gray-600">El pago se ha realizado correctamente. Ya eres socio del club.</p>
              <p class="text-xs text-gray-400 mt-4">Revisa tu email para más detalles.</p>
            </div>
          \`;
        }
      </script>
    </body>
    </html>
  `;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
});