import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const card = "bg-white/10 backdrop-blur-sm rounded-2xl md:rounded-3xl border border-white/20 p-4 md:p-8";

const slides = [
  // ===== 1. BIENVENIDA =====
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4 md:px-6">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 md:w-56 md:h-56 rounded-full border-4 border-white/40 shadow-2xl mb-4 md:mb-8" />
        <h1 className="text-[12vw] md:text-[8vw] font-black leading-none drop-shadow-lg">CD Bustarviejo</h1>
        <p className="text-[5vw] md:text-[3.5vw] font-light opacity-90 mt-2 md:mt-4">Reunión de Familias</p>
        <p className="text-[4vw] md:text-[2.5vw] opacity-90 mt-2 md:mt-4 font-semibold">Temporada 2025–2026</p>
        <div className="mt-6 md:mt-12 animate-bounce opacity-60 text-[3.5vw] md:text-[1.8vw]">Desliza o pulsa → para avanzar</div>
      </div>
    ),
  },

  // ===== 2. NO SOMOS UNA EXTRAESCOLAR =====
  {
    id: "not_extraescolar",
    bg: "from-red-800 via-red-900 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <div className="text-center mb-4 md:mb-[3vh]">
          <p className="text-[5vw] md:text-[2.5vw] opacity-60 line-through mb-1 md:mb-2">"Es como una extraescolar, ¿no?"</p>
          <h2 className="text-[9vw] md:text-[5.5vw] font-black leading-none">🚫 NO.</h2>
          <div className="w-32 md:w-48 h-1 bg-red-500 mx-auto mt-2 md:mt-4 rounded-full" />
        </div>

        <div className="bg-white/10 border-2 border-red-400/40 rounded-2xl md:rounded-3xl p-4 md:p-[3vw] mb-4 md:mb-[3vh]">
          <h3 className="text-[5.5vw] md:text-[3vw] font-black text-center mb-3 md:mb-[2vh]">Somos una Asociación Sin Ánimo de Lucro</h3>
          <div className="space-y-3 md:space-y-[2vh]">
            {[
              { icon: "🏛️", text: "Una entidad legalmente constituida — no un servicio que se contrata" },
              { icon: "🤝", text: "Un proyecto COMUNITARIO que existe porque personas del pueblo decidieron crearlo" },
              { icon: "❤️", text: "Aquí no hay clientes. Hay FAMILIAS que forman parte de algo más grande" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 md:gap-[1.5vw]">
                <span className="text-[6vw] md:text-[3.5vw] flex-shrink-0">{item.icon}</span>
                <p className="text-[3.8vw] md:text-[2.2vw] leading-snug opacity-90">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-2xl md:rounded-3xl p-3 md:p-[2vw] text-center">
          <p className="text-[4.5vw] md:text-[2.5vw] font-black">⚠️ Una extraescolar cobra, da un servicio y se desentiende.<br/>Nosotros pedimos IMPLICACIÓN porque esto es DE TODOS.</p>
        </div>
      </div>
    ),
  },

  // ===== 3. CÓMO SOBREVIVIMOS =====
  {
    id: "how_we_survive",
    bg: "from-slate-900 via-slate-800 to-emerald-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">💰 ¿Cómo sobrevive el club?</h2>
        <p className="text-[4vw] md:text-[2.2vw] opacity-70 text-center mb-4 md:mb-[3vh]">Con total transparencia</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] mb-4 md:mb-[3vh]">
          <div className={`${card} border-green-400/30`}>
            <h3 className="text-[5vw] md:text-[2.8vw] font-bold mb-2 md:mb-[1.5vh]">💚 Nuestros ingresos</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p className="text-[3.5vw] md:text-[2vw]">📋 <strong>Cuotas de las familias</strong> — nuestra base principal</p>
              <p className="text-[3.5vw] md:text-[2vw]">🏛️ <strong>Pequeña subvención del Ayuntamiento</strong> — ayuda, pero no es suficiente</p>
              <p className="text-[3.5vw] md:text-[2vw]">🤝 <strong>Patrocinadores locales</strong> — colaboraciones puntuales</p>
            </div>
          </div>

          <div className={`${card} border-orange-400/30`}>
            <h3 className="text-[5vw] md:text-[2.8vw] font-bold mb-2 md:mb-[1.5vh]">🔥 Nuestros gastos</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p className="text-[3.5vw] md:text-[2vw]">⚽ Federación, seguros, árbitros</p>
              <p className="text-[3.5vw] md:text-[2vw]">🏟️ Mantenimiento de instalaciones</p>
              <p className="text-[3.5vw] md:text-[2vw]">👕 Material deportivo y equipación</p>
              <p className="text-[3.5vw] md:text-[2vw]">📱 Herramientas de gestión (app, etc.)</p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-2xl md:rounded-3xl p-3 md:p-[2vw]">
          <div className="space-y-2 md:space-y-[1.5vh]">
            <div className="flex items-start gap-2 md:gap-[1vw]">
              <span className="text-[5vw] md:text-[3vw] flex-shrink-0">👷</span>
              <p className="text-[3.5vw] md:text-[2.2vw]"><strong>Solo 2 personas reciben una pequeña compensación</strong> (coordinador y un entrenador, unas horas). El resto de entrenadores y toda la junta directiva son <strong>100% voluntarios</strong>.</p>
            </div>
            <div className="flex items-start gap-2 md:gap-[1vw]">
              <span className="text-[5vw] md:text-[3vw] flex-shrink-0">⏰</span>
              <p className="text-[3.5vw] md:text-[2.2vw]">Personas que dedican <strong>su tiempo libre</strong> — tardes, fines de semana, festivos — por los niños y niñas del pueblo.</p>
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">🚀 Proyectos en marcha</h2>
        <p className="text-[4vw] md:text-[2.2vw] opacity-70 text-center mb-4 md:mb-[3vh]">Vuestras cuotas se invierten en mejorar</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] mb-4 md:mb-[3vh]">
          {[
            { icon: "🚶", title: "Acera para subir al campo", desc: "Acceso seguro para familias y jugadores", status: "En desarrollo" },
            { icon: "🛡️", title: "Protecciones de las vallas", desc: "Seguridad en todo el perímetro del campo", status: "En desarrollo" },
            { icon: "🏟️", title: "Gradas y zona de entrenamientos", desc: "Proyecto de mejora integral de las instalaciones", status: "En proyecto" },
            { icon: "👕", title: "Cambio de proveedor de ropa", desc: "Mejor calidad y precios más competitivos", status: "Próx. temporada" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-2 md:gap-[1vw] mb-1 md:mb-2">
                <span className="text-[6vw] md:text-[3.5vw]">{item.icon}</span>
                <h3 className="text-[4.5vw] md:text-[2.5vw] font-bold">{item.title}</h3>
              </div>
              <p className="text-[3.5vw] md:text-[1.8vw] opacity-80 mb-1 md:mb-2">{item.desc}</p>
              <span className="inline-block bg-emerald-500/30 border border-emerald-400/40 rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[2.8vw] md:text-[1.4vw] font-semibold">{item.status}</span>
            </div>
          ))}
        </div>

        <div className={`${card} text-center`}>
          <p className="text-[4vw] md:text-[2.2vw]">💡 Todas las iniciativas buscan <strong>mejorar el club minimizando el impacto económico</strong> en las familias. Cada decisión se medita.</p>
        </div>
      </div>
    ),
  },

  // ===== 5. POR QUÉ LA APP =====
  {
    id: "why_needed",
    bg: "from-red-700 to-red-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-4 md:mb-[3vh] leading-none">🚨 ¿Por qué necesitamos la app?</h2>
        <div className="flex flex-col gap-3 md:gap-[2vh]">
          {[
            { icon: "📋", title: "Gestión imposible sin ella", desc: "Con alrededor de 130 jugadores y familias — y creciendo — necesitamos una herramienta centralizada." },
            { icon: "💬", title: "WhatsApp genera problemas", desc: "Los grupos se descontrolan, se pierde información, hay malentendidos y no hay forma de gestionar pagos ni convocatorias." },
            { icon: "⚖️", title: "Igualdad y transparencia", desc: "Todos los padres reciben la misma información al mismo tiempo. Sin favoritismos." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <p className="text-[5vw] md:text-[3vw] font-bold mb-1">{item.icon} {item.title}</p>
              <p className="text-[3.5vw] md:text-[2.2vw] opacity-85 leading-snug">{item.desc}</p>
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5.5vw] font-black text-center mb-2 md:mb-[2vh] leading-none">⚠️ Es OBLIGATORIA</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-90 text-center mb-4 md:mb-[3vh]">No es opcional. Es el único canal oficial del club.</p>
        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-2xl md:rounded-3xl p-4 md:p-[3vw]">
          <div className="space-y-4 md:space-y-[2.5vh]">
            {[
              { icon: "📱", title: "Sin app → No puedes inscribir a tus hijos", desc: "Las inscripciones se hacen exclusivamente por la app" },
              { icon: "💳", title: "Sin inscripción → No puedes pagar", desc: "Los pagos se gestionan dentro de la app" },
              { icon: "💛", title: "Sin pagar → Problema para todos", desc: "El club siempre escucha a familias con dificultades. Hablad con nosotros." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 md:gap-[1.5vw]">
                <span className="text-[6vw] md:text-[4vw] flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[4.5vw] md:text-[2.8vw] font-bold">{item.title}</p>
                  <p className="text-[3.5vw] md:text-[2vw] opacity-80">{item.desc}</p>
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
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5.5vw] font-black text-center mb-2 md:mb-[2vh] leading-none">🆓 ¡100% GRATUITA!</h2>
        <p className="text-[4vw] md:text-[2.8vw] opacity-90 text-center mb-4 md:mb-[4vh]">No cuesta nada. Ni ahora ni nunca.</p>
        <div className="grid grid-cols-3 gap-2 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          {[
            { icon: "💰", val: "0€", sub: "Sin coste" },
            { icon: "📱", val: "Tu móvil", sub: "Y un email" },
            { icon: "⏱️", val: "5 min", sub: "Para instalarla" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[7vw] md:text-[5vw] mb-1 md:mb-2">{item.icon}</div>
              <p className="text-[5vw] md:text-[3vw] font-bold">{item.val}</p>
              <p className="text-[2.8vw] md:text-[1.8vw] opacity-80 mt-0.5 md:mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-white/15 rounded-2xl md:rounded-3xl p-3 md:p-[2vw] border border-white/20 w-full text-center">
          <p className="text-[3.5vw] md:text-[2.2vw]">💚 El club ha invertido en esta herramienta. Solo necesitamos que <strong>todas las familias colaboren usándola</strong>.</p>
        </div>
      </div>
    ),
  },

  // ===== 8. ADIÓS WHATSAPP =====
  {
    id: "bye_whatsapp",
    bg: "from-slate-800 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[7vw] md:text-[4.5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">🔄 Adiós WhatsApp, emails y papeles</h2>
        <p className="text-[3.5vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">Todo en un solo sitio</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-[1.5vw]">
          {[
            { icon: "💬", old: "Grupos de WhatsApp", now: "Chat integrado por categoría" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios y notificaciones al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Pagos, asistencia y datos automáticos" },
            { icon: "📝", old: "Google Forms / papeles", now: "Inscripciones digitales con documentos" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado del club" },
            { icon: "📞", old: "Llamadas para todo", now: "Chat directo con entrenador" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-1 md:gap-[1vw] mb-1 md:mb-2">
                <span className="text-[5vw] md:text-[3.5vw]">{item.icon}</span>
                <span className="text-[3vw] md:text-[2vw] text-red-400 line-through">{item.old}</span>
              </div>
              <p className="text-[3.5vw] md:text-[2.2vw] text-green-400 font-bold">✅ {item.now}</p>
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
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[7vw] md:text-[4.5vw] font-black text-center mb-4 md:mb-[3vh] leading-none">📱 Así se ve por dentro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-[1.5vw] w-full flex-1 max-h-[65vh]">
          {[
            { label: "Panel principal", icon: "🏠", items: ["Próximos partidos", "Alertas y avisos", "Accesos rápidos", "Chat y anuncios"] },
            { label: "Convocatorias", icon: "🏆", items: ["Rival y hora", "Confirmar asistencia", "Transporte", "Cómo llegar"] },
            { label: "Chat de equipo", icon: "💬", items: ["Mensajes grupales", "Fotos y archivos", "Encuestas rápidas", "Audio y emojis"] },
            { label: "Mis pagos", icon: "💳", items: ["Estado de cuotas", "Subir justificante", "Histórico", "Recibos PDF"] },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1 md:gap-[1vh]">
              <div className="bg-gradient-to-b from-white/15 to-white/5 rounded-2xl md:rounded-3xl border-2 border-white/20 p-2 md:p-[1.5vw] shadow-2xl w-full flex-1 flex flex-col justify-center">
                <div className="text-[7vw] md:text-[5vw] text-center mb-1 md:mb-[1.5vh]">{item.icon}</div>
                <div className="space-y-1 md:space-y-[1vh]">
                  {item.items.map((line, j) => (
                    <div key={j} className="bg-white/10 rounded-lg md:rounded-xl px-1 md:px-[1vw] py-0.5 md:py-[0.8vh] text-[2.5vw] md:text-[1.6vw]">{line}</div>
                  ))}
                </div>
              </div>
              <span className="text-[2.5vw] md:text-[1.6vw] font-bold opacity-70">{item.label}</span>
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">📲 Cómo instalar la app</h2>
        <p className="text-[3.5vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">NO es de tienda — se instala desde el navegador en 1 minuto</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw]">
          {[
            { icon: "🍎", title: "iPhone / iPad", color: "text-blue-300", steps: ["Abrir Safari (obligatorio)", "Ir al enlace de la app", "Pulsar ⬆️ (compartir)", '"Añadir a pantalla de inicio"', "Confirmar → ¡Listo!"] },
            { icon: "🤖", title: "Android", color: "text-green-300", steps: ["Abrir Chrome", "Ir al enlace de la app", "Pulsar ⋮ (3 puntos)", '"Instalar aplicación"', "Confirmar → ¡Listo!"] },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="text-[7vw] md:text-[5vw] text-center mb-1 md:mb-[1vh]">{item.icon}</div>
              <h3 className="text-[5vw] md:text-[3vw] font-bold text-center mb-2 md:mb-[2vh]">{item.title}</h3>
              <ol className="space-y-1 md:space-y-[1.2vh]">
                {item.steps.map((step, j) => (
                  <li key={j} className="flex gap-1 md:gap-[0.8vw] text-[3.5vw] md:text-[2.2vw]">
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">👨‍👩‍👧 Registro e inscripción</h2>
        <p className="text-[3.5vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">Proceso sencillo paso a paso</p>
        <div className="space-y-2 md:space-y-[1.5vh]">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código — sin contraseña" },
            { step: "2", title: "Verificar código del club", desc: "El club te dará un código para confirmar tu identidad" },
            { step: "3", title: "Seleccionar tu perfil", desc: "Familia (hijos menores) o Jugador +18" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos, foto tipo carnet y documentos" },
            { step: "5", title: "Elegir forma de pago", desc: "Cuota única o fraccionada en 3 plazos" },
          ].map((item, i) => (
            <div key={i} className={`${card} flex items-center gap-2 md:gap-[1.5vw]`}>
              <div className="w-10 h-10 md:w-[5vw] md:h-[5vw] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[5vw] md:text-[3vw] font-black">{item.step}</div>
              <div>
                <h3 className="text-[4vw] md:text-[2.8vw] font-bold">{item.title}</h3>
                <p className="text-[3vw] md:text-[2vw] opacity-80">{item.desc}</p>
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">🔞 Jugadores +18</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">Se gestionan ellos mismos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] mb-4 md:mb-[3vh]">
          <div className={card}>
            <div className="text-[7vw] md:text-[5vw] mb-1 md:mb-[1vh]">🚫</div>
            <h3 className="text-[4.5vw] md:text-[2.8vw] font-bold mb-1 md:mb-2">NO los deis de alta como hijos</h3>
            <p className="text-[3.5vw] md:text-[2vw] opacity-85 leading-snug">Un jugador mayor de 18 <strong>NO puede estar dado de alta por un padre</strong>.</p>
          </div>
          <div className={card}>
            <div className="text-[7vw] md:text-[5vw] mb-1 md:mb-[1vh]">✅</div>
            <h3 className="text-[4.5vw] md:text-[2.8vw] font-bold mb-1 md:mb-2">Se registran solos</h3>
            <p className="text-[3.5vw] md:text-[2vw] opacity-85 leading-snug">Se instalan la app, eligen "Jugador +18", y gestionan sus propias convocatorias y pagos.</p>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl md:rounded-3xl p-3 md:p-[2vw] text-center">
          <p className="text-[4vw] md:text-[2.5vw] font-bold">⚠️ Si tenéis un hijo mayor de 18, decídselo: tiene que instalarse la app él mismo con su email.</p>
        </div>
      </div>
    ),
  },

  // ===== 13. ACCESO JUVENIL =====
  {
    id: "minor_access",
    bg: "from-violet-700 to-purple-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">🧑‍🎓 Acceso Juvenil (13–17)</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">Para que los chavales se gestionen solos</p>
        <div className={`${card} w-full`}>
          <div className="space-y-3 md:space-y-[2vh]">
            {[
              { icon: "📱", text: "Los menores de 13 a 17 años pueden tener su propio acceso con su email" },
              { icon: "👨‍👩‍👧", text: "El padre/madre debe autorizar el acceso desde su cuenta" },
              { icon: "✅", text: "El menor ve convocatorias, calendario, evaluaciones y anuncios" },
              { icon: "🚫", text: "NO tienen chat ni acceso a pagos ni datos sensibles" },
              { icon: "🎯", text: "Así el chaval puede confirmar sus propias convocatorias" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 md:gap-[1.5vw]">
                <span className="text-[5vw] md:text-[3.5vw] flex-shrink-0">{item.icon}</span>
                <p className="text-[3.5vw] md:text-[2.2vw] leading-snug">{item.text}</p>
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">🏆 Convocatorias</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">El entrenador convoca → tú confirmas</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[2vw] mb-4 md:mb-[3vh]">
          {[
            { icon: "📩", title: "Te llega aviso", desc: "Notificación cuando tu hijo es convocado" },
            { icon: "✅", title: "Confirmas", desc: '"Asistirá", "No asistirá" o "Duda" — un toque' },
            { icon: "🚗", title: "Transporte", desc: "Ofrece o pide plazas para partidos fuera" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[7vw] md:text-[5vw] mb-1 md:mb-[1vh]">{item.icon}</div>
              <h3 className="text-[4vw] md:text-[2.5vw] font-bold mb-1 md:mb-2">{item.title}</h3>
              <p className="text-[3vw] md:text-[1.8vw] opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className={`${card} text-center`}>
          <p className="text-[3.5vw] md:text-[2.2vw]">💡 <strong>Confirma siempre rápido</strong> para que el entrenador pueda planificar.</p>
        </div>
      </div>
    ),
  },

  // ===== 15. PAGOS =====
  {
    id: "payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">💳 Pagos y Cuotas</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-90 text-center mb-4 md:mb-[3vh]">Transparente y sencillo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] mb-4 md:mb-[3vh]">
          <div className={card}>
            <h3 className="text-[5vw] md:text-[3vw] font-bold mb-2 md:mb-[2vh]">💰 Formas de pago</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p className="text-[3.5vw] md:text-[2.2vw]">✅ <strong>Pago único</strong> — toda la cuota de una vez</p>
              <p className="text-[3.5vw] md:text-[2.2vw]">✅ <strong>3 plazos</strong> — Junio, Septiembre, Diciembre</p>
            </div>
          </div>
          <div className={card}>
            <h3 className="text-[5vw] md:text-[3vw] font-bold mb-2 md:mb-[2vh]">📄 Proceso</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p className="text-[3.5vw] md:text-[2.2vw]">1️⃣ Selecciona el pago pendiente</p>
              <p className="text-[3.5vw] md:text-[2.2vw]">2️⃣ Paga por transferencia o tarjeta</p>
              <p className="text-[3.5vw] md:text-[2.2vw]">3️⃣ Sube el justificante</p>
              <p className="text-[3.5vw] md:text-[2.2vw]">4️⃣ El club lo valida</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl md:rounded-3xl p-3 md:p-[2vw] text-center">
          <p className="text-[4vw] md:text-[2.5vw] font-bold">⚠️ Los jugadores con pagos pendientes <strong>no serán convocados</strong>.</p>
        </div>
      </div>
    ),
  },

  // ===== 16. COMUNICACIÓN =====
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">💬 Comunicación</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[3vh]">3 canales — todo dentro de la app</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[2vw] mb-4 md:mb-[3vh]">
          {[
            { icon: "⚽", title: "Chat de Equipo", desc: "Grupal con entrenador y familias" },
            { icon: "🎓", title: "Chat Coordinador", desc: "Privado 1-a-1 para temas personales" },
            { icon: "🔔", title: "Mensajes del Club", desc: "Avisos oficiales y recordatorios" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[7vw] md:text-[5vw] mb-1 md:mb-[1vh]">{item.icon}</div>
              <h3 className="text-[4vw] md:text-[2.5vw] font-bold mb-1 md:mb-2">{item.title}</h3>
              <p className="text-[3vw] md:text-[1.8vw] opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-3 md:p-[2vw] text-center">
          <p className="text-[4vw] md:text-[2.5vw] font-bold">🚫 Los grupos de WhatsApp del club se eliminarán. Toda la comunicación será por la app.</p>
        </div>
      </div>
    ),
  },

  // ===== 17. COMPETICIÓN + TIENDA + EXTRAS =====
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-2 md:mb-[1.5vh] leading-none">✨ Y mucho más...</h2>
        <p className="text-[4vw] md:text-[2.5vw] opacity-80 text-center mb-4 md:mb-[4vh]">La app sigue creciendo</p>
        <div className="grid grid-cols-3 gap-2 md:gap-[1.5vw] w-full">
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
              <div className="text-[6vw] md:text-[4.5vw] mb-0.5 md:mb-[0.5vh]">{item.icon}</div>
              <p className="text-[3vw] md:text-[2.2vw] font-bold">{item.title}</p>
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
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 className="text-[8vw] md:text-[5vw] font-black text-center mb-4 md:mb-[3vh] leading-none">❓ Preguntas Frecuentes</h2>
        <div className="space-y-2 md:space-y-[1.2vh]">
          {[
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se invita al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — se envía un código nuevo. No hay contraseña." },
            { q: "¿Mi hijo de 15 puede usar la app?", a: "Sí, con acceso juvenil. Tú lo autorizas." },
            { q: "¿Mi hijo de 19 puede estar en mi cuenta?", a: "No. Los mayores de 18 se registran solos." },
            { q: "¿Quién ve mis datos?", a: "Solo administradores y entrenadores. Cumplimos LOPD." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <h3 className="text-[3.5vw] md:text-[2.5vw] font-bold mb-0.5 md:mb-1">{item.q}</h3>
              <p className="text-[3vw] md:text-[2vw] opacity-80">{item.a}</p>
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
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 md:w-56 md:h-56 rounded-full border-4 border-white/40 shadow-2xl mb-4 md:mb-8" />
        <h2 className="text-[12vw] md:text-[8vw] font-black leading-none mb-2 md:mb-[2vh]">¡Gracias!</h2>
        <p className="text-[5vw] md:text-[3.5vw] opacity-90">¿Alguna pregunta?</p>
        <p className="text-[3.5vw] md:text-[2.5vw] opacity-70 mt-2 md:mt-[2vh]">Estamos aquí para ayudaros 💪</p>
        <div className={`${card} mt-4 md:mt-[4vh] max-w-full md:max-w-[70vw]`}>
          <p className="text-[3vw] md:text-[2.2vw] opacity-80 mb-1 md:mb-2">Si necesitáis ayuda con la app:</p>
          <p className="text-[4.5vw] md:text-[3vw] font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
          <p className="text-[2.8vw] md:text-[1.8vw] opacity-60 mt-1 md:mt-2">o escribid al coordinador por el chat</p>
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-3 md:p-[2vw] mt-3 md:mt-[3vh] max-w-full md:max-w-[70vw]">
          <p className="text-[4vw] md:text-[2.5vw] font-bold">📱 ¡Instaladla HOY! No dejéis para mañana lo que podéis hacer en 5 minutos.</p>
        </div>
      </div>
    ),
  },
];

export default function FamilyPresentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const total = slides.length;

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

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
      {/* Scrollable content */}
      <div className="h-full w-full overflow-y-auto pb-12 md:pb-16">{slide.content}</div>

      {/* Desktop nav arrows */}
      {current > 0 && (
        <button onClick={goPrev} className="hidden md:flex absolute left-[1vw] top-1/2 -translate-y-1/2 w-[5vw] h-[5vw] rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center transition-all">
          <ChevronLeft style={{width:'3vw', height:'3vw'}} />
        </button>
      )}
      {current < total - 1 && (
        <button onClick={goNext} className="hidden md:flex absolute right-[1vw] top-1/2 -translate-y-1/2 w-[5vw] h-[5vw] rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center transition-all">
          <ChevronRight style={{width:'3vw', height:'3vw'}} />
        </button>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 md:px-[2vw] py-2 md:py-[1vh] bg-black/30 backdrop-blur-sm">
        {/* Progress dots — hidden on mobile, shown on desktop */}
        <div className="hidden md:flex gap-[0.4vw] flex-wrap max-w-[60%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? "bg-white scale-150" : "bg-white/40 hover:bg-white/60"}`}
              style={{width:'0.8vw', height:'0.8vw'}}
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
        <div className="hidden md:flex items-center gap-[1.5vw] text-white/70" style={{fontSize:'1.5vw'}}>
          <span>{current + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize style={{width:'2vw', height:'2vw'}} /> : <Maximize style={{width:'2vw', height:'2vw'}} />}
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