import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const card = "bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/20 p-3 md:p-5";

const slides = [
  // ===== 1. BIENVENIDA =====
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4 md:px-6">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white/40 shadow-2xl mb-4 md:mb-6" />
        <h1 className="text-[12vw] md:text-7xl font-black leading-none drop-shadow-lg">CD Bustarviejo</h1>
        <p className="text-[5vw] md:text-3xl font-light opacity-90 mt-2 md:mt-3">Reunión de Familias</p>
        <p className="text-[4vw] md:text-2xl opacity-90 mt-2 md:mt-3 font-semibold">Temporada 2025–2026</p>
        <div className="mt-6 md:mt-8 animate-bounce opacity-60 text-[3.5vw] md:text-base">Desliza o pulsa → para avanzar</div>
      </div>
    ),
  },

  // ===== 2. NO SOMOS UNA EXTRAESCOLAR =====
  {
    id: "not_extraescolar",
    bg: "from-red-800 via-red-900 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-2 md:py-4">
        <div className="text-center mb-2 md:mb-4">
          <p className="text-[3.5vw] md:text-xl opacity-60 line-through mb-1">"Es como una extraescolar, ¿no?"</p>
          <h2 className="text-[8vw] md:text-6xl font-black leading-none">🚫 NO.</h2>
          <div className="w-24 md:w-36 h-1 bg-red-500 mx-auto mt-1 md:mt-3 rounded-full" />
        </div>

        <div className="bg-white/10 border-2 border-red-400/40 rounded-xl md:rounded-2xl p-3 md:p-6 mb-2 md:mb-4">
          <h3 className="text-[4.5vw] md:text-2xl font-black text-center mb-2 md:mb-3">Somos una Asociación Sin Ánimo de Lucro</h3>
          <div className="space-y-2 md:space-y-3">
            {[
              { icon: "🏛️", text: "Una entidad legalmente constituida — no un servicio que se contrata" },
              { icon: "🤝", text: "Un proyecto COMUNITARIO que existe porque personas del pueblo decidieron crearlo" },
              { icon: "❤️", text: "Aquí no hay clientes. Hay FAMILIAS que forman parte de algo más grande" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 md:gap-3">
                <span className="text-[5vw] md:text-2xl flex-shrink-0">{item.icon}</span>
                <p className="text-[3.2vw] md:text-lg leading-snug opacity-90">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-xl md:rounded-2xl p-2.5 md:p-4 text-center">
          <p className="text-[3.5vw] md:text-xl font-black">⚠️ Una extraescolar cobra y se desentiende.<br/>Nosotros pedimos IMPLICACIÓN porque es DE TODOS.</p>
        </div>
      </div>
    ),
  },

  // ===== 3. CÓMO SOBREVIVIMOS =====
  {
    id: "how_we_survive",
    bg: "from-slate-900 via-slate-800 to-emerald-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-2 md:py-4">
        <h2 className="text-[6.5vw] md:text-4xl font-black text-center mb-1 md:mb-2 leading-none">💰 ¿Cómo sobrevive el club?</h2>
        <p className="text-[3.2vw] md:text-lg opacity-70 text-center mb-2 md:mb-4">Con total transparencia</p>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4 mb-2 md:mb-4">
          <div className={`${card} border-green-400/30`}>
            <h3 className="text-[3.8vw] md:text-xl font-bold mb-1 md:mb-2">💚 Ingresos</h3>
            <div className="space-y-1 md:space-y-2">
              <p className="text-[2.8vw] md:text-base">📋 <strong>Cuotas familias</strong></p>
              <p className="text-[2.8vw] md:text-base">🏛️ <strong>Subvención Ayto.</strong></p>
              <p className="text-[2.8vw] md:text-base">🤝 <strong>Patrocinadores</strong></p>
            </div>
          </div>

          <div className={`${card} border-orange-400/30`}>
            <h3 className="text-[3.8vw] md:text-xl font-bold mb-1 md:mb-2">🔥 Gastos</h3>
            <div className="space-y-1 md:space-y-2">
              <p className="text-[2.8vw] md:text-base">⚽ Federación, árbitros</p>
              <p className="text-[2.8vw] md:text-base">🏟️ Instalaciones</p>
              <p className="text-[2.8vw] md:text-base">👕 Material deportivo</p>
              <p className="text-[2.8vw] md:text-base">📱 App y gestión</p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-xl md:rounded-3xl p-2.5 md:p-4">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-start gap-2 md:gap-2">
              <span className="text-[4vw] md:text-xl flex-shrink-0">👷</span>
              <p className="text-[3vw] md:text-lg"><strong>Solo 2 personas reciben compensación</strong>. El resto de entrenadores y la junta son <strong>100% voluntarios</strong>.</p>
            </div>
            <div className="flex items-start gap-2 md:gap-2">
              <span className="text-[4vw] md:text-xl flex-shrink-0">⏰</span>
              <p className="text-[3vw] md:text-lg">Personas que dedican <strong>su tiempo libre</strong> por los niños del pueblo.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ===== 4. PROYECTOS EN MARCHA =====
  {
    id: "projects",
    bg: "from-emerald-700 via-teal-800 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-2 md:py-4">
        <h2 className="text-[6.5vw] md:text-4xl font-black text-center mb-1 md:mb-2 leading-none">🚀 Proyectos en marcha</h2>
        <p className="text-[3.2vw] md:text-lg opacity-70 text-center mb-2 md:mb-4">Vuestras cuotas se invierten en mejorar</p>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4 mb-2 md:mb-4">
          {[
            { icon: "🚶", title: "Acera al campo", desc: "Acceso seguro", status: "En desarrollo" },
            { icon: "🛡️", title: "Vallas protegidas", desc: "Seguridad perímetro", status: "En desarrollo" },
            { icon: "🏋️", title: "Zona de físico", desc: "Parte trasera del campo", status: "En proyecto" },
            { icon: "🎉", title: "San Isidro (15 mayo)", desc: "Torneo fútbol chapa y más en la plaza", status: "Confirmado" },
            { icon: "🏆", title: "Torneo fin de temporada", desc: "Equipos invitados de fuera", status: "Próx. junio" },
            { icon: "👕", title: "Nuevo proveedor ropa", desc: "Mejor calidad/precio", status: "Próx. temporada" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-2">
                <span className="text-[4.5vw] md:text-2xl">{item.icon}</span>
                <h3 className="text-[3.2vw] md:text-lg font-bold leading-tight">{item.title}</h3>
              </div>
              <p className="text-[2.8vw] md:text-sm opacity-80 mb-0.5 md:mb-2">{item.desc}</p>
              <span className="inline-block bg-emerald-500/30 border border-emerald-400/40 rounded-full px-1.5 md:px-3 py-0.5 text-[2.5vw] md:text-xs font-semibold">{item.status}</span>
            </div>
          ))}
        </div>

        <div className={`${card} text-center`}>
          <p className="text-[3.2vw] md:text-lg">💡 Todas las iniciativas buscan <strong>mejorar el club minimizando el impacto económico</strong> en las familias.</p>
        </div>
      </div>
    ),
  },

  // ===== 5. TRANSICIÓN: Y AHORA... LA APP =====
  {
    id: "transition",
    bg: "from-slate-900 via-orange-900 to-slate-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-6 md:px-12">
        <div className="text-[15vw] md:text-7xl mb-4 md:mb-8">📱</div>
        <h2 className="text-[8vw] md:text-5xl font-black leading-none mb-3 md:mb-6">Y para gestionar<br/>todo esto...</h2>
        <div className="w-24 md:w-36 h-1 bg-orange-500 rounded-full mb-3 md:mb-6" />
        <p className="text-[5vw] md:text-2xl font-bold opacity-90">Hemos creado una app</p>
        <p className="text-[3.5vw] md:text-lg opacity-60 mt-2 md:mt-4">que lo cambia todo →</p>
      </div>
    ),
  },

  // ===== 6. POR QUÉ LA APP =====
  {
    id: "why_needed",
    bg: "from-red-700 to-red-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-4 md:mb-4 leading-none">🚨 ¿Por qué necesitamos la app?</h2>
        <div className="flex flex-col gap-3 md:gap-3">
          {[
            { icon: "📋", title: "Gestión imposible sin ella", desc: "Con alrededor de 130 jugadores y familias — y creciendo — necesitamos una herramienta centralizada." },
            { icon: "💬", title: "WhatsApp genera problemas", desc: "Los grupos se descontrolan, se pierde información, hay malentendidos y no hay forma de gestionar pagos ni convocatorias." },
            { icon: "⚖️", title: "Igualdad y transparencia", desc: "Todos los padres reciben la misma información al mismo tiempo. Sin favoritismos." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <p className="text-[5vw] md:text-xl font-bold mb-1">{item.icon} {item.title}</p>
              <p className="text-[3.5vw] md:text-lg opacity-85 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 6. ES OBLIGATORIA =====
  {
    id: "mandatory",
    bg: "from-slate-900 to-slate-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-5xl font-black text-center mb-2 md:mb-3 leading-none">⚠️ Es OBLIGATORIA</h2>
        <p className="text-[4vw] md:text-lg opacity-90 text-center mb-4 md:mb-4">No es opcional. Es el único canal oficial del club.</p>
        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-2xl md:rounded-3xl p-4 md:p-6">
          <div className="space-y-4 md:space-y-3">
            {[
              { icon: "📱", title: "Sin app → No puedes inscribir a tus hijos", desc: "Las inscripciones se hacen exclusivamente por la app" },
              { icon: "💳", title: "Sin inscripción → No puedes pagar", desc: "Los pagos se gestionan dentro de la app" },
              { icon: "💛", title: "Sin pagar → Problema para todos", desc: "El club siempre escucha a familias con dificultades. Hablad con nosotros." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 md:gap-3">
                <span className="text-[6vw] md:text-[4vw] flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[4.5vw] md:text-xl font-bold">{item.title}</p>
                  <p className="text-[3.5vw] md:text-base opacity-80">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ===== 7. ES GRATIS =====
  {
    id: "free",
    bg: "from-green-600 to-emerald-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-5xl font-black text-center mb-2 md:mb-3 leading-none">🆓 ¡100% GRATUITA!</h2>
        <p className="text-[4vw] md:text-xl opacity-90 text-center mb-4 md:mb-5">No cuesta nada. Ni ahora ni nunca.</p>
        <div className="grid grid-cols-3 gap-2 md:gap-4 w-full mb-4 md:mb-4">
          {[
            { icon: "💰", val: "0€", sub: "Sin coste" },
            { icon: "📱", val: "Tu móvil", sub: "Y un email" },
            { icon: "⏱️", val: "5 min", sub: "Para instalarla" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[7vw] md:text-4xl mb-1 md:mb-2">{item.icon}</div>
              <p className="text-[5vw] md:text-xl font-bold">{item.val}</p>
              <p className="text-[2.8vw] md:text-sm opacity-80 mt-0.5 md:mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-white/15 rounded-2xl md:rounded-3xl p-3 md:p-4 border border-white/20 w-full text-center">
          <p className="text-[3.5vw] md:text-lg">💚 El club ha invertido en esta herramienta. Solo necesitamos que <strong>todas las familias colaboren usándola</strong>.</p>
        </div>
      </div>
    ),
  },

  // ===== 8. ADIÓS WHATSAPP =====
  {
    id: "bye_whatsapp",
    bg: "from-slate-800 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[7vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">🔄 Adiós WhatsApp, emails y papeles</h2>
        <p className="text-[3.5vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">Todo en un solo sitio</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {[
            { icon: "💬", old: "Grupos de WhatsApp", now: "Chat integrado por categoría" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios y notificaciones al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Pagos, asistencia y datos automáticos" },
            { icon: "📝", old: "Google Forms / papeles", now: "Inscripciones digitales con documentos" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado del club" },
            { icon: "📞", old: "Llamadas para todo", now: "Chat directo con entrenador" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
                <span className="text-[5vw] md:text-2xl">{item.icon}</span>
                <span className="text-[3vw] md:text-base text-red-400 line-through">{item.old}</span>
              </div>
              <p className="text-[3.5vw] md:text-lg text-green-400 font-bold">✅ {item.now}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 9. ASÍ SE VE POR DENTRO =====
  {
    id: "screenshots",
    bg: "from-gray-900 to-gray-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[7vw] md:text-4xl font-black text-center mb-4 md:mb-4 leading-none">📱 Así se ve por dentro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full flex-1 max-h-[65vh]">
          {[
            { label: "Panel principal", icon: "🏠", items: ["Próximos partidos", "Alertas y avisos", "Accesos rápidos", "Chat y anuncios"] },
            { label: "Convocatorias", icon: "🏆", items: ["Rival y hora", "Confirmar asistencia", "Transporte", "Cómo llegar"] },
            { label: "Chat de equipo", icon: "💬", items: ["Mensajes grupales", "Fotos y archivos", "Encuestas rápidas", "Audio y emojis"] },
            { label: "Mis pagos", icon: "💳", items: ["Estado de cuotas", "Subir justificante", "Histórico", "Recibos PDF"] },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1 md:gap-2">
              <div className="bg-gradient-to-b from-white/15 to-white/5 rounded-2xl md:rounded-3xl border-2 border-white/20 p-2 md:p-3 shadow-2xl w-full flex-1 flex flex-col justify-center">
                <div className="text-[7vw] md:text-4xl text-center mb-1 md:mb-2">{item.icon}</div>
                <div className="space-y-1 md:space-y-[1vh]">
                  {item.items.map((line, j) => (
                    <div key={j} className="bg-white/10 rounded-lg md:rounded-xl px-1 md:px-2 py-0.5 md:py-1.5 text-[2.5vw] md:text-sm">{line}</div>
                  ))}
                </div>
              </div>
              <span className="text-[2.5vw] md:text-sm font-bold opacity-70">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 10. CÓMO INSTALAR =====
  {
    id: "install",
    bg: "from-blue-600 to-blue-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">📲 Cómo instalar la app</h2>
        <p className="text-[3.5vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">NO es de tienda — se instala desde el navegador en 1 minuto</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {[
            { icon: "🍎", title: "iPhone / iPad", color: "text-blue-300", steps: ["Abrir Safari (obligatorio)", "Ir al enlace de la app", "Pulsar ⬆️ (compartir)", '"Añadir a pantalla de inicio"', "Confirmar → ¡Listo!"] },
            { icon: "🤖", title: "Android", color: "text-green-300", steps: ["Abrir Chrome", "Ir al enlace de la app", "Pulsar ⋮ (3 puntos)", '"Instalar aplicación"', "Confirmar → ¡Listo!"] },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="text-[7vw] md:text-4xl text-center mb-1 md:mb-2">{item.icon}</div>
              <h3 className="text-[5vw] md:text-xl font-bold text-center mb-2 md:mb-3">{item.title}</h3>
              <ol className="space-y-1 md:space-y-2">
                {item.steps.map((step, j) => (
                  <li key={j} className="flex gap-1 md:gap-1.5 text-[3.5vw] md:text-lg">
                    <span className={`font-bold ${item.color}`}>{j+1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 11. REGISTRO =====
  {
    id: "register",
    bg: "from-emerald-600 to-emerald-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">👨‍👩‍👧 Registro e inscripción</h2>
        <p className="text-[3.5vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">Proceso sencillo paso a paso</p>
        <div className="space-y-2 md:space-y-2">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código — sin contraseña" },
            { step: "2", title: "Verificar código del club", desc: "El club te dará un código para confirmar tu identidad" },
            { step: "3", title: "Seleccionar tu perfil", desc: "Familia (hijos menores) o Jugador +18" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos, foto tipo carnet y documentos" },
            { step: "5", title: "Elegir forma de pago", desc: "Cuota única o fraccionada en 3 plazos" },
          ].map((item, i) => (
            <div key={i} className={`${card} flex items-center gap-2 md:gap-3`}>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[5vw] md:text-xl font-black">{item.step}</div>
              <div>
                <h3 className="text-[4vw] md:text-xl font-bold">{item.title}</h3>
                <p className="text-[3vw] md:text-base opacity-80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 12. JUGADORES +18 =====
  {
    id: "adults",
    bg: "from-amber-700 to-orange-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">🔞 Jugadores +18</h2>
        <p className="text-[4vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">Se gestionan ellos mismos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-4">
          <div className={card}>
            <div className="text-[7vw] md:text-4xl mb-1 md:mb-2">🚫</div>
            <h3 className="text-[4.5vw] md:text-xl font-bold mb-1 md:mb-2">NO los deis de alta como hijos</h3>
            <p className="text-[3.5vw] md:text-base opacity-85 leading-snug">Un jugador mayor de 18 <strong>NO puede estar dado de alta por un padre</strong>.</p>
          </div>
          <div className={card}>
            <div className="text-[7vw] md:text-4xl mb-1 md:mb-2">✅</div>
            <h3 className="text-[4.5vw] md:text-xl font-bold mb-1 md:mb-2">Se registran solos</h3>
            <p className="text-[3.5vw] md:text-base opacity-85 leading-snug">Se instalan la app, eligen "Jugador +18", y gestionan sus propias convocatorias y pagos.</p>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl md:rounded-3xl p-3 md:p-4 text-center">
          <p className="text-[4vw] md:text-lg font-bold">⚠️ Si tenéis un hijo mayor de 18, decídselo: tiene que instalarse la app él mismo con su email.</p>
        </div>
      </div>
    ),
  },

  // ===== 13. ACCESO JUVENIL =====
  {
    id: "minor_access",
    bg: "from-violet-700 to-purple-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">🧑‍🎓 Acceso Juvenil (13–17)</h2>
        <p className="text-[4vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">Para que los chavales se gestionen solos</p>
        <div className={`${card} w-full`}>
          <div className="space-y-3 md:space-y-3">
            {[
              { icon: "📱", text: "Los menores de 13 a 17 años pueden tener su propio acceso con su email" },
              { icon: "👨‍👩‍👧", text: "El padre/madre debe autorizar el acceso desde su cuenta" },
              { icon: "✅", text: "El menor ve convocatorias, calendario, evaluaciones y anuncios" },
              { icon: "🚫", text: "NO tienen chat ni acceso a pagos ni datos sensibles" },
              { icon: "🎯", text: "Así el chaval puede confirmar sus propias convocatorias" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 md:gap-3">
                <span className="text-[5vw] md:text-2xl flex-shrink-0">{item.icon}</span>
                <p className="text-[3.5vw] md:text-lg leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ===== 14. CONVOCATORIAS =====
  {
    id: "callups",
    bg: "from-amber-600 to-red-700",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">🏆 Convocatorias</h2>
        <p className="text-[4vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">El entrenador convoca → tú confirmas</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-4">
          {[
            { icon: "📩", title: "Te llega aviso", desc: "Notificación cuando tu hijo es convocado" },
            { icon: "✅", title: "Confirmas", desc: '"Asistirá", "No asistirá" o "Duda" — un toque' },
            { icon: "🚗", title: "Transporte", desc: "Ofrece o pide plazas para partidos fuera" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[7vw] md:text-4xl mb-1 md:mb-2">{item.icon}</div>
              <h3 className="text-[4vw] md:text-lg font-bold mb-1 md:mb-2">{item.title}</h3>
              <p className="text-[3vw] md:text-sm opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className={`${card} text-center`}>
          <p className="text-[3.5vw] md:text-lg">💡 <strong>Confirma siempre rápido</strong> para que el entrenador pueda planificar.</p>
        </div>
      </div>
    ),
  },

  // ===== 15. PAGOS =====
  {
    id: "payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">💳 Pagos y Cuotas</h2>
        <p className="text-[4vw] md:text-lg opacity-90 text-center mb-4 md:mb-4">Transparente y sencillo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-4">
          <div className={card}>
            <h3 className="text-[5vw] md:text-xl font-bold mb-2 md:mb-3">💰 Formas de pago</h3>
            <div className="space-y-2 md:space-y-2">
              <p className="text-[3.5vw] md:text-lg">✅ <strong>Pago único</strong> — toda la cuota de una vez</p>
              <p className="text-[3.5vw] md:text-lg">✅ <strong>3 plazos</strong> — Junio, Septiembre, Diciembre</p>
            </div>
          </div>
          <div className={card}>
            <h3 className="text-[5vw] md:text-xl font-bold mb-2 md:mb-3">📄 Proceso</h3>
            <div className="space-y-2 md:space-y-2">
              <p className="text-[3.5vw] md:text-lg">1️⃣ Selecciona el pago pendiente</p>
              <p className="text-[3.5vw] md:text-lg">2️⃣ Paga por transferencia o tarjeta</p>
              <p className="text-[3.5vw] md:text-lg">3️⃣ Sube el justificante</p>
              <p className="text-[3.5vw] md:text-lg">4️⃣ El club lo valida</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl md:rounded-3xl p-3 md:p-4 text-center">
          <p className="text-[4vw] md:text-lg font-bold">⚠️ Los jugadores con pagos pendientes <strong>no serán convocados</strong>.</p>
        </div>
      </div>
    ),
  },

  // ===== 16. COMUNICACIÓN =====
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">💬 Comunicación</h2>
        <p className="text-[4vw] md:text-lg opacity-80 text-center mb-4 md:mb-4">3 canales — todo dentro de la app</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-4">
          {[
            { icon: "⚽", title: "Chat de Equipo", desc: "Grupal con entrenador y familias" },
            { icon: "🎓", title: "Chat Coordinador", desc: "Privado 1-a-1 para temas personales" },
            { icon: "🔔", title: "Mensajes del Club", desc: "Avisos oficiales y recordatorios" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[7vw] md:text-4xl mb-1 md:mb-2">{item.icon}</div>
              <h3 className="text-[4vw] md:text-lg font-bold mb-1 md:mb-2">{item.title}</h3>
              <p className="text-[3vw] md:text-sm opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-3 md:p-4 text-center">
          <p className="text-[4vw] md:text-lg font-bold">🚫 Los grupos de WhatsApp del club se eliminarán. Toda la comunicación será por la app.</p>
        </div>
      </div>
    ),
  },

  // ===== 17. COMPETICIÓN + TIENDA + EXTRAS =====
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-2 md:mb-2 leading-none">✨ Y mucho más...</h2>
        <p className="text-[4vw] md:text-lg opacity-80 text-center mb-4 md:mb-5">La app sigue creciendo</p>
        <div className="grid grid-cols-3 gap-2 md:gap-3 w-full">
          {[
            { icon: "🏆", title: "Competición en directo" },
            { icon: "🛍️", title: "Tienda de ropa" },
            { icon: "🖼️", title: "Galería de fotos" },
            { icon: "📋", title: "Encuestas" },
            { icon: "📄", title: "Documentos" },
            { icon: "📅", title: "Calendario" },
            { icon: "🤝", title: "Voluntariado" },
            { icon: "🎫", title: "Hacerse socio" },
            { icon: "🤖", title: "Asistente IA" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[6vw] md:text-4xl mb-0.5 md:mb-[0.5vh]">{item.icon}</div>
              <p className="text-[3vw] md:text-lg font-bold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 18. FAQ =====
  {
    id: "faq",
    bg: "from-indigo-700 to-violet-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-12 py-4 md:py-4">
        <h2 className="text-[8vw] md:text-4xl font-black text-center mb-4 md:mb-4 leading-none">❓ Preguntas Frecuentes</h2>
        <div className="space-y-2 md:space-y-2">
          {[
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se invita al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — se envía un código nuevo. No hay contraseña." },
            { q: "¿Mi hijo de 15 puede usar la app?", a: "Sí, con acceso juvenil. Tú lo autorizas." },
            { q: "¿Mi hijo de 19 puede estar en mi cuenta?", a: "No. Los mayores de 18 se registran solos." },
            { q: "¿Quién ve mis datos?", a: "Solo administradores y entrenadores. Cumplimos LOPD." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <h3 className="text-[3.5vw] md:text-lg font-bold mb-0.5 md:mb-1">{item.q}</h3>
              <p className="text-[3vw] md:text-base opacity-80">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ===== 19. CIERRE =====
  {
    id: "end",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4 md:px-[4vw]">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-white/40 shadow-2xl mb-4 md:mb-8" />
        <h2 className="text-[12vw] md:text-6xl font-black leading-none mb-2 md:mb-3">¡Gracias!</h2>
        <p className="text-[5vw] md:text-2xl opacity-90">¿Alguna pregunta?</p>
        <p className="text-[3.5vw] md:text-lg opacity-70 mt-2 md:mt-3">Estamos aquí para ayudaros 💪</p>
        <div className={`${card} mt-4 md:mt-5 max-w-full md:max-w-3xl`}>
          <p className="text-[3vw] md:text-lg opacity-80 mb-1 md:mb-2">Si necesitáis ayuda con la app:</p>
          <p className="text-[4.5vw] md:text-xl font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
          <p className="text-[2.8vw] md:text-sm opacity-60 mt-1 md:mt-2">o escribid al coordinador por el chat</p>
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-3 md:p-4 mt-3 md:mt-4 max-w-full md:max-w-3xl">
          <p className="text-[4vw] md:text-lg font-bold">📱 ¡Instaladla HOY! No dejéis para mañana lo que podéis hacer en 5 minutos.</p>
        </div>
      </div>
    ),
  },
];

export default function FamilyPresentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const total = slides.length;

  const goTo = useCallback((idx) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTimeout(() => setTransitioning(false), 50);
    }, 200);
  }, [transitioning]);

  const goNext = useCallback(() => {
    if (current < total - 1) goTo(current + 1);
  }, [current, total, goTo]);
  const goPrev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  // Keyboard navigation
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

  // Fullscreen detection
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Touch swipe for mobile
  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const slide = slides[current];

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-gradient-to-br ${slide.bg} transition-all duration-500 overflow-hidden select-none`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Content container — capped at 1400px wide and centered for large screens */}
      <div
        className="h-full w-full overflow-y-auto pb-12 md:pb-16 transition-opacity duration-200 flex items-start md:items-center justify-center"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        <div className="w-full max-w-[1400px] mx-auto md:max-h-[calc(100vh-60px)]">
          {slide.content}
        </div>
      </div>

      {/* Desktop nav arrows */}
      {current > 0 && (
        <button onClick={goPrev} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center transition-all">
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {current < total - 1 && (
        <button onClick={goNext} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center transition-all">
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 md:px-6 py-2 md:py-2 bg-black/30 backdrop-blur-sm">
        {/* Progress dots — hidden on mobile, shown on desktop */}
        <div className="hidden md:flex gap-1 flex-wrap max-w-[60%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${i === current ? "bg-white scale-150" : "bg-white/40 hover:bg-white/60"}`}
              style={{width:'8px', height:'8px'}}
            />
          ))}
        </div>

        {/* Mobile: simple progress */}
        <div className="md:hidden flex items-center gap-2">
          <button onClick={goPrev} disabled={current === 0} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/80 text-sm font-medium">{current + 1}/{total}</span>
          <button onClick={goNext} disabled={current === total - 1} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-30">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Desktop: counter + fullscreen */}
        <div className="hidden md:flex items-center gap-[1.5vw] text-white/70" className="text-base">
          <span>{current + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile: fullscreen button */}
        <button onClick={toggleFullscreen} className="md:hidden w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* Desktop click zones (left/right thirds) */}
      <div className="hidden md:flex absolute inset-0 pointer-events-none">
        <div className="w-1/4 h-full pointer-events-auto" onClick={goPrev} />
        <div className="w-1/2 h-full" />
        <div className="w-1/4 h-full pointer-events-auto" onClick={goNext} />
      </div>
    </div>
  );
}