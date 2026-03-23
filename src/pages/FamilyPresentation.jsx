import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const slides = [
  // ── 1. BIENVENIDA ──
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-32 h-32 rounded-full border-4 border-white/40 shadow-2xl mb-8" />
        <h1 className="text-5xl md:text-7xl font-black mb-4 drop-shadow-lg">CD Bustarviejo</h1>
        <p className="text-2xl md:text-3xl font-light opacity-90 mb-2">Nueva App del Club</p>
        <p className="text-lg md:text-xl opacity-90 mt-2 font-semibold">Temporada 2026–2027</p>
        <p className="text-base opacity-70 mt-4">Reunión de Familias</p>
        <div className="mt-12 animate-bounce opacity-60 text-sm">Pulsa → para avanzar</div>
      </div>
    ),
  },

  // ── 2. POR QUÉ ES NECESARIA ──
  {
    id: "why_needed",
    bg: "from-red-700 to-red-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🚨</div>
        <h2 className="text-4xl md:text-5xl font-black mb-6">¿Por qué necesitamos esta app?</h2>
        <div className="flex flex-col gap-5 w-full max-w-2xl text-left">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <p className="text-lg font-bold mb-2">📋 Gestión imposible sin ella</p>
            <p className="text-sm opacity-85">Con alrededor de 130 jugadores y familias — y con la esperanza de seguir creciendo — necesitamos una herramienta centralizada. No podemos seguir con papeles, llamadas y mensajes dispersos.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <p className="text-lg font-bold mb-2">💬 WhatsApp genera problemas</p>
            <p className="text-sm opacity-85">Los grupos de WhatsApp se descontrolan, se pierde información, hay malentendidos y no hay forma de gestionar pagos, convocatorias ni asistencia por ahí.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <p className="text-lg font-bold mb-2">⚖️ Igualdad y transparencia</p>
            <p className="text-sm opacity-85">Todos los padres reciben la misma información al mismo tiempo. Sin favoritismos, sin "a mí no me han dicho nada".</p>
          </div>
        </div>
      </div>
    ),
  },

  // ── 3. ES OBLIGATORIA ──
  {
    id: "mandatory",
    bg: "from-slate-900 to-slate-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-7xl mb-6">⚠️</div>
        <h2 className="text-4xl md:text-5xl font-black mb-6">Es OBLIGATORIA</h2>
        <p className="text-xl opacity-90 mb-8">No es opcional. Es el único canal oficial del club.</p>
        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-2xl p-8 max-w-2xl w-full mb-6">
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">📱</span>
              <div>
                <p className="font-bold text-lg">Sin app → No puedes inscribir a tus hijos</p>
                <p className="text-sm opacity-80">Las inscripciones se hacen exclusivamente por la app</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">💳</span>
              <div>
                <p className="font-bold text-lg">Sin inscripción → No puedes pagar</p>
                <p className="text-sm opacity-80">Los pagos se gestionan dentro de la app</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">💛</span>
              <div>
                <p className="font-bold text-lg">Sin pagar → Problema para todos</p>
                <p className="text-sm opacity-80">El club siempre escucha a familias con dificultades. Hablad con nosotros. Pero los impagos acumulados son un problema serio que afecta a todo el club.</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm opacity-60 max-w-lg">No queremos ser estrictos — queremos que funcione para todos. Si tenéis cualquier problema, hablad con nosotros.</p>
      </div>
    ),
  },

  // ── 4. PERO ES GRATIS Y FÁCIL ──
  {
    id: "free",
    bg: "from-green-600 to-emerald-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-7xl mb-6">🆓</div>
        <h2 className="text-4xl md:text-6xl font-black mb-4">Pero... ¡es 100% GRATUITA!</h2>
        <p className="text-xl md:text-2xl opacity-90 mb-8">No cuesta nada. Ni ahora ni nunca.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-3xl mb-3">💰</div>
            <p className="font-bold">0€</p>
            <p className="text-xs opacity-80 mt-1">Sin coste para las familias</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-3xl mb-3">📱</div>
            <p className="font-bold">Solo necesitas tu móvil</p>
            <p className="text-xs opacity-80 mt-1">Y un email para acceder</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-3xl mb-3">⏱️</div>
            <p className="font-bold">5 minutos</p>
            <p className="text-xs opacity-80 mt-1">Es lo que tardas en instalarla</p>
          </div>
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-5 max-w-2xl border border-white/20">
          <p className="text-sm">💚 El club ha invertido en esta herramienta para facilitaros la vida. Solo necesitamos que <strong>todas las familias colaboren usándola</strong>.</p>
        </div>
      </div>
    ),
  },

  // ── 5. ADIÓS WHATSAPP ──
  {
    id: "bye_whatsapp",
    bg: "from-slate-800 to-slate-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🔄</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Adiós WhatsApp, emails y papeles</h2>
        <p className="text-xl opacity-80 mb-8">Todo en un solo sitio</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
          {[
            { icon: "💬", old: "Grupos de WhatsApp", now: "Chat integrado por categoría (controlado)" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios y notificaciones al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Pagos, asistencia y datos automáticos" },
            { icon: "📝", old: "Google Forms / papeles", now: "Inscripciones digitales con documentos" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado del club" },
            { icon: "📞", old: "Llamadas para todo", now: "Chat directo con entrenador y coordinador" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 text-left border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-red-400 line-through text-sm">{item.old}</span>
              </div>
              <p className="text-green-400 font-bold text-sm">✅ {item.now}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 6. ASÍ SE VE POR DENTRO ──
  {
    id: "screenshots",
    bg: "from-gray-900 to-gray-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-5xl mx-auto">
        <div className="text-6xl mb-4">📱</div>
        <h2 className="text-3xl md:text-5xl font-black mb-6">Así se ve la app por dentro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {[
            { label: "Panel principal", icon: "🏠", items: ["Próximos partidos", "Alertas y avisos", "Accesos rápidos", "Chat y anuncios"] },
            { label: "Convocatorias", icon: "🏆", items: ["Rival y hora", "Confirmar asistencia", "Transporte", "Cómo llegar"] },
            { label: "Chat de equipo", icon: "💬", items: ["Mensajes grupales", "Fotos y archivos", "Encuestas rápidas", "Audio y emojis"] },
            { label: "Mis pagos", icon: "💳", items: ["Estado de cuotas", "Subir justificante", "Histórico", "Recibos PDF"] },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="bg-gradient-to-b from-white/15 to-white/5 rounded-2xl border-2 border-white/20 p-5 shadow-2xl w-full" style={{aspectRatio:'9/16', display:'flex', flexDirection:'column', justifyContent:'center'}}>
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="space-y-2">
                  {item.items.map((line, j) => (
                    <div key={j} className="bg-white/10 rounded-lg px-3 py-2 text-xs text-left">{line}</div>
                  ))}
                </div>
              </div>
              <span className="text-xs font-bold opacity-70">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-sm opacity-60 mt-6">👉 En la demo en vivo veréis la app real funcionando</p>
      </div>
    ),
  },

  // ── 7. CÓMO INSTALAR ──
  {
    id: "install",
    bg: "from-blue-600 to-blue-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">📲</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Cómo instalar la app</h2>
        <p className="text-xl opacity-80 mb-8">NO es de tienda — se instala desde el navegador en 1 minuto</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="text-4xl mb-4">🍎</div>
            <h3 className="font-bold text-xl mb-4">iPhone / iPad</h3>
            <ol className="text-left space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-blue-300">1.</span> Abrir <strong>Safari</strong> (obligatorio)</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">2.</span> Ir al enlace de la app</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">3.</span> Pulsar ⬆️ (compartir)</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">4.</span> "Añadir a pantalla de inicio"</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">5.</span> Confirmar → ¡Listo!</li>
            </ol>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-xl mb-4">Android</h3>
            <ol className="text-left space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-green-300">1.</span> Abrir <strong>Chrome</strong></li>
              <li className="flex gap-2"><span className="font-bold text-green-300">2.</span> Ir al enlace de la app</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">3.</span> Pulsar ⋮ (3 puntos)</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">4.</span> "Instalar aplicación"</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">5.</span> Confirmar → ¡Listo!</li>
            </ol>
          </div>
        </div>
      </div>
    ),
  },

  // ── 8. REGISTRO PASO A PASO ──
  {
    id: "register",
    bg: "from-emerald-600 to-emerald-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">👨‍👩‍👧</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Registro e inscripción</h2>
        <p className="text-xl opacity-80 mb-8">Proceso sencillo paso a paso</p>
        <div className="flex flex-col gap-4 w-full max-w-2xl">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código de acceso — sin contraseña" },
            { step: "2", title: "Verificar código del club", desc: "El club te dará un código para confirmar tu identidad" },
            { step: "3", title: "Seleccionar tu perfil", desc: "Familia (si tienes hijos menores) o Jugador +18" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos, foto tipo carnet y documentos" },
            { step: "5", title: "Elegir categoría y pagar", desc: "Cuota única o fraccionada en 3 plazos" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 flex items-center gap-5 text-left border border-white/10">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black flex-shrink-0">{item.step}</div>
              <div>
                <h3 className="font-bold text-lg">{item.title}</h3>
                <p className="text-sm opacity-80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 9. JUGADORES +18 ──
  {
    id: "adults",
    bg: "from-amber-700 to-orange-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🔞</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Jugadores mayores de 18</h2>
        <p className="text-xl opacity-80 mb-8">Importante: se gestionan ellos mismos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-left">
            <div className="text-3xl mb-3">🚫</div>
            <h3 className="font-bold text-lg mb-2">NO los deis de alta como hijos</h3>
            <p className="text-sm opacity-85">Un jugador mayor de 18 años <strong>NO puede estar dado de alta por un padre</strong>. Debe registrarse él mismo con su propio email.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-left">
            <div className="text-3xl mb-3">✅</div>
            <h3 className="font-bold text-lg mb-2">Se registran solos</h3>
            <p className="text-sm opacity-85">Se instalan la app, eligen perfil "Jugador +18", y gestionan sus propias convocatorias, pagos y documentos.</p>
          </div>
        </div>
        <div className="mt-6 bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-5 max-w-2xl w-full">
          <p className="text-sm font-bold">⚠️ Si tenéis un hijo mayor de 18, decídselo: tiene que instalarse la app él mismo y registrarse con su email personal.</p>
        </div>
      </div>
    ),
  },

  // ── 10. ACCESO JUVENIL (13-17 años) ──
  {
    id: "minor_access",
    bg: "from-violet-700 to-purple-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🧑‍🎓</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Acceso Juvenil (13–17 años)</h2>
        <p className="text-xl opacity-80 mb-8">Para que los chavales se gestionen solos</p>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full border border-white/10 text-left">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">📱</span>
              <p className="text-sm">Los menores de 13 a 17 años pueden tener su <strong>propio acceso a la app</strong> con su email</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">👨‍👩‍👧</span>
              <p className="text-sm">El padre/madre debe <strong>autorizar</strong> el acceso desde su cuenta</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">✅</span>
              <p className="text-sm">El menor puede <strong>ver convocatorias, calendario, evaluaciones y anuncios</strong></p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">🚫</span>
              <p className="text-sm"><strong>NO tienen chat</strong> ni acceso a pagos ni datos sensibles</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">🎯</span>
              <p className="text-sm">Así el chaval puede <strong>confirmar sus propias convocatorias</strong> sin depender de los padres</p>
            </div>
          </div>
        </div>
        <p className="text-xs opacity-50 mt-4">El padre puede revocar el acceso del menor en cualquier momento</p>
      </div>
    ),
  },

  // ── 11. CONVOCATORIAS ──
  {
    id: "callups",
    bg: "from-amber-600 to-red-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Convocatorias</h2>
        <p className="text-xl opacity-80 mb-8">El entrenador convoca → tú confirmas</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">📩</div>
            <h3 className="font-bold mb-2">Te llega aviso</h3>
            <p className="text-sm opacity-80">Notificación cuando tu hijo es convocado</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold mb-2">Confirmas</h3>
            <p className="text-sm opacity-80">"Asistirá", "No asistirá" o "Duda" — un solo toque</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🚗</div>
            <h3 className="font-bold mb-2">Transporte compartido</h3>
            <p className="text-sm opacity-80">Ofrece o pide plazas para partidos fuera</p>
          </div>
        </div>
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-5 max-w-2xl border border-white/10">
          <p className="text-sm">💡 <strong>Confirma siempre rápido</strong> para que el entrenador pueda planificar.</p>
        </div>
      </div>
    ),
  },

  // ── 12. PAGOS ──
  {
    id: "payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">💳</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Pagos y Cuotas</h2>
        <p className="text-xl opacity-80 mb-8">Transparente y sencillo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-left">
            <h3 className="font-bold text-lg mb-3">💰 Formas de pago</h3>
            <ul className="space-y-2 text-sm">
              <li>✅ <strong>Pago único</strong> — toda la cuota de una vez</li>
              <li>✅ <strong>3 plazos</strong> — Junio, Septiembre, Diciembre</li>
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-left">
            <h3 className="font-bold text-lg mb-3">📄 Proceso</h3>
            <ul className="space-y-2 text-sm">
              <li>1️⃣ Selecciona el pago pendiente</li>
              <li>2️⃣ Paga por transferencia o tarjeta</li>
              <li>3️⃣ Sube el justificante (transferencia)</li>
              <li>4️⃣ El club lo valida</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl border border-yellow-400/30">
          <p className="text-sm">⚠️ Los jugadores con pagos pendientes <strong>no serán convocados</strong> a los partidos.</p>
        </div>
      </div>
    ),
  },

  // ── 13. COMUNICACIÓN ──
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">💬</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Comunicación</h2>
        <p className="text-xl opacity-80 mb-8">3 canales — todo dentro de la app</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">⚽</div>
            <h3 className="font-bold mb-2">Chat de Equipo</h3>
            <p className="text-sm opacity-80">Grupal con entrenador y familias de la categoría</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="font-bold mb-2">Chat Coordinador</h3>
            <p className="text-sm opacity-80">Privado 1-a-1 para temas personales</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🔔</div>
            <h3 className="font-bold mb-2">Mensajes del Club</h3>
            <p className="text-sm opacity-80">Avisos oficiales y recordatorios</p>
          </div>
        </div>
        <div className="mt-8 bg-red-500/20 border border-red-400/30 rounded-xl p-5 max-w-2xl">
          <p className="text-sm font-bold">🚫 Los grupos de WhatsApp del club se eliminarán. Toda la comunicación será por la app.</p>
        </div>
      </div>
    ),
  },

  // ── 14. COMPETICIÓN ──
  {
    id: "competition",
    bg: "from-rose-600 to-pink-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Competición en directo</h2>
        <p className="text-xl opacity-80 mb-8">Toda la info deportiva actualizada automáticamente</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {[
            { icon: "📊", title: "Clasificaciones", desc: "Posición de todos los equipos del club en liga" },
            { icon: "⚽", title: "Resultados", desc: "Marcadores actualizados jornada a jornada" },
            { icon: "🥇", title: "Goleadores", desc: "Tabla de máximos goleadores del club" },
            { icon: "📅", title: "Próximos partidos", desc: "Calendario con hora, rival y ubicación" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/10">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-lg mb-1">{item.title}</h3>
              <p className="text-sm opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm opacity-60 mt-6">📱 También hay una web pública de competición para compartir con cualquiera</p>
      </div>
    ),
  },

  // ── 15. MÁS FUNCIONES ──
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">✨</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Y mucho más...</h2>
        <p className="text-xl opacity-80 mb-8">La app sigue creciendo</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
          {[
            { icon: "🖼️", title: "Galería de fotos" },
            { icon: "📋", title: "Encuestas" },
            { icon: "📄", title: "Documentos" },
            { icon: "📅", title: "Calendario y eventos" },
            { icon: "🤝", title: "Voluntariado" },
            { icon: "🛍️", title: "Mercadillo" },
            { icon: "🎫", title: "Hacerse socio" },
            { icon: "🤖", title: "Asistente virtual" },
            { icon: "🖊️", title: "Firmas federación" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-xs font-bold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 16. FAQ ──
  {
    id: "faq",
    bg: "from-indigo-700 to-violet-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">❓</div>
        <h2 className="text-4xl md:text-5xl font-black mb-8">Preguntas Frecuentes</h2>
        <div className="flex flex-col gap-4 w-full max-w-2xl text-left">
          {[
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se invita al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta aunque estén en categorías distintas." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — el sistema te envía un código nuevo cada vez. No hay contraseña." },
            { q: "¿Mi hijo de 15 puede usar la app?", a: "Sí, con acceso juvenil. Tú lo autorizas y él ve convocatorias y calendario (sin chat)." },
            { q: "¿Mi hijo de 19 puede estar en mi cuenta?", a: "No. Los mayores de 18 se registran ellos mismos con su email." },
            { q: "¿Quién ve mis datos?", a: "Solo administradores y entrenadores del club. Cumplimos con la LOPD." },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <h3 className="font-bold text-sm mb-1">{item.q}</h3>
              <p className="text-xs opacity-80">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── 17. CIERRE ──
  {
    id: "end",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 rounded-full border-4 border-white/40 shadow-2xl mb-8" />
        <h2 className="text-4xl md:text-6xl font-black mb-4">¡Gracias!</h2>
        <p className="text-xl md:text-2xl opacity-90 mb-2">¿Alguna pregunta?</p>
        <p className="text-lg opacity-70 mt-4">Estamos aquí para ayudaros 💪</p>
        <div className="mt-10 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-md">
          <p className="text-sm opacity-80 mb-2">Si necesitáis ayuda con la app:</p>
          <p className="font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
          <p className="text-sm opacity-60 mt-2">o escribid al coordinador por el chat</p>
        </div>
        <div className="mt-8 bg-red-500/20 border border-red-400/30 rounded-xl p-4 max-w-md">
          <p className="text-sm font-bold">📱 ¡Instaladla HOY! No dejéis para mañana lo que podéis hacer en 5 minutos.</p>
        </div>
      </div>
    ),
  },
];

export default function FamilyPresentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const total = slides.length;

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const slide = slides[current];

  return (
    <div className={`fixed inset-0 z-[99999] bg-gradient-to-br ${slide.bg} transition-all duration-500 overflow-hidden select-none`}>
      <div className="h-full w-full overflow-y-auto">{slide.content}</div>

      {current > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {current < total - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-black/20">
        <div className="flex gap-1.5 flex-wrap max-w-[60%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white scale-150" : "bg-white/40 hover:bg-white/60"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 text-white/70 text-sm">
          <span>{current + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="absolute inset-0 flex pointer-events-none">
        <div className="w-1/4 h-full pointer-events-auto" onClick={goPrev} />
        <div className="w-1/2 h-full" />
        <div className="w-1/4 h-full pointer-events-auto" onClick={goNext} />
      </div>
    </div>
  );
}