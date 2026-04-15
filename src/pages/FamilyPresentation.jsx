import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Clases reutilizables — compactas con vh para desktop
const card = "bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-2 md:p-[1.2vh_1.5vw]";
const slideWrap = "flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-3 md:py-0";
const titleClass = "text-[7vw] md:text-[4.5vh] font-black text-center leading-none";
const subtitleClass = "text-[3.5vw] md:text-[2.2vh] opacity-80 text-center";

const slides = [
  // 1. BIENVENIDA
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-24 h-24 md:w-[14vh] md:h-[14vh] rounded-full border-4 border-white/40 shadow-2xl mb-3 md:mb-[3vh]" />
        <h1 className="text-[11vw] md:text-[8vh] font-black leading-none drop-shadow-lg">CD Bustarviejo</h1>
        <p className="text-[5vw] md:text-[3.5vh] font-light opacity-90 mt-2 md:mt-[1.5vh]">Reunión de Familias</p>
        <p className="text-[4vw] md:text-[2.8vh] opacity-90 mt-1 md:mt-[1vh] font-semibold">Temporada 2025–2026</p>
        <div className="mt-5 md:mt-[4vh] animate-bounce opacity-60 text-[3.5vw] md:text-[1.8vh]">Desliza o pulsa → para avanzar</div>
      </div>
    ),
  },

  // 2. NO SOMOS UNA EXTRAESCOLAR
  {
    id: "not_extraescolar",
    bg: "from-red-800 via-red-900 to-slate-900",
    content: (
      <div className={slideWrap}>
        <div className="text-center mb-2 md:mb-[1.5vh]">
          <p className="text-[3.5vw] md:text-[2vh] opacity-60 line-through mb-1">"Es como una extraescolar, ¿no?"</p>
          <h2 className="text-[8vw] md:text-[7vh] font-black leading-none">🚫 NO.</h2>
          <div className="w-20 md:w-[8vw] h-1 bg-red-500 mx-auto mt-1 md:mt-[1vh] rounded-full" />
        </div>
        <div className="bg-white/10 border-2 border-red-400/40 rounded-xl p-3 md:p-[1.5vh_2vw] mb-2 md:mb-[1.5vh]">
          <h3 className="text-[4vw] md:text-[2.5vh] font-black text-center mb-1 md:mb-[1vh]">Somos una Asociación Sin Ánimo de Lucro</h3>
          <div className="space-y-1.5 md:space-y-[0.8vh]">
            {[
              { icon: "🏛️", text: "Una entidad legalmente constituida — no un servicio que se contrata" },
              { icon: "🤝", text: "Un proyecto COMUNITARIO que existe porque personas del pueblo decidieron crearlo" },
              { icon: "❤️", text: "Aquí no hay clientes. Hay FAMILIAS que forman parte de algo más grande" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[4.5vw] md:text-[2.5vh] flex-shrink-0">{item.icon}</span>
                <p className="text-[3vw] md:text-[1.9vh] leading-snug opacity-90">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-xl p-2 md:p-[1vh_2vw] text-center">
          <p className="text-[3.2vw] md:text-[2vh] font-black">⚠️ Una extraescolar cobra y se desentiende. Nosotros pedimos IMPLICACIÓN porque es DE TODOS.</p>
        </div>
      </div>
    ),
  },

  // 3. CÓMO SOBREVIVIMOS
  {
    id: "how_we_survive",
    bg: "from-slate-900 via-slate-800 to-emerald-900",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>💰 ¿Cómo sobrevive el club?</h2>
        <p className={`${subtitleClass} mb-2 md:mb-[1.5vh]`}>Con total transparencia</p>
        <div className="grid grid-cols-2 gap-2 md:gap-[1vw] mb-2 md:mb-[1.5vh]">
          <div className={`${card} border-green-400/30`}>
            <h3 className="text-[3.8vw] md:text-[2.2vh] font-bold mb-1">💚 Ingresos</h3>
            <div className="space-y-0.5 md:space-y-[0.4vh]">
              <p className="text-[2.8vw] md:text-[1.8vh]">📋 <strong>Cuotas familias</strong></p>
              <p className="text-[2.8vw] md:text-[1.8vh]">🏛️ <strong>Subvención Ayto.</strong></p>
              <p className="text-[2.8vw] md:text-[1.8vh]">🤝 <strong>Patrocinadores</strong></p>
            </div>
          </div>
          <div className={`${card} border-orange-400/30`}>
            <h3 className="text-[3.8vw] md:text-[2.2vh] font-bold mb-1">🔥 Gastos</h3>
            <div className="space-y-0.5 md:space-y-[0.4vh]">
              <p className="text-[2.8vw] md:text-[1.8vh]">⚽ Federación, árbitros</p>
              <p className="text-[2.8vw] md:text-[1.8vh]">🏟️ Instalaciones</p>
              <p className="text-[2.8vw] md:text-[1.8vh]">👕 Material deportivo</p>
              <p className="text-[2.8vw] md:text-[1.8vh]">📱 App y gestión</p>
            </div>
          </div>
        </div>
        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-xl p-2 md:p-[1vh_1.5vw]">
          <div className="space-y-1 md:space-y-[0.5vh]">
            <div className="flex items-start gap-2">
              <span className="text-[4vw] md:text-[2vh] flex-shrink-0">👷</span>
              <p className="text-[3vw] md:text-[1.8vh]"><strong>Solo 2 personas reciben compensación</strong>. El resto son <strong>100% voluntarios</strong>.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[4vw] md:text-[2vh] flex-shrink-0">⏰</span>
              <p className="text-[3vw] md:text-[1.8vh]">Personas que dedican <strong>su tiempo libre</strong> por los niños del pueblo.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // 4. PROYECTOS EN MARCHA
  {
    id: "projects",
    bg: "from-emerald-700 via-teal-800 to-slate-900",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>🚀 Proyectos en marcha</h2>
        <p className={`${subtitleClass} mb-2 md:mb-[1.5vh]`}>Vuestras cuotas se invierten en mejorar</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-[0.8vw] mb-2 md:mb-[1vh]">
          {[
            { icon: "🚶", title: "Acera al campo", status: "En desarrollo" },
            { icon: "🛡️", title: "Vallas protegidas", status: "En desarrollo" },
            { icon: "🏋️", title: "Zona de físico", status: "En proyecto" },
            { icon: "🎉", title: "San Isidro", status: "Confirmado" },
            { icon: "🏆", title: "Torneo fin temporada", status: "Próx. junio" },
            { icon: "👕", title: "Nuevo proveedor ropa", status: "Próx. temporada" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[4vw] md:text-[2.2vh]">{item.icon}</span>
                <h3 className="text-[3vw] md:text-[1.7vh] font-bold leading-tight">{item.title}</h3>
              </div>
              <span className="inline-block bg-emerald-500/30 border border-emerald-400/40 rounded-full px-1.5 py-0.5 text-[2.2vw] md:text-[1.3vh] font-semibold">{item.status}</span>
            </div>
          ))}
        </div>
        <div className={`${card} text-center`}>
          <p className="text-[3vw] md:text-[1.8vh]">💡 Todas las iniciativas buscan <strong>mejorar el club minimizando el impacto económico</strong> en las familias.</p>
        </div>
      </div>
    ),
  },

  // 5. TRANSICIÓN
  {
    id: "transition",
    bg: "from-slate-900 via-orange-900 to-slate-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-6">
        <div className="text-[14vw] md:text-[10vh] mb-3 md:mb-[4vh]">📱</div>
        <h2 className="text-[8vw] md:text-[6vh] font-black leading-none mb-3 md:mb-[3vh]">Y para gestionar<br/>todo esto...</h2>
        <div className="w-20 md:w-[8vw] h-1 bg-orange-500 rounded-full mb-3 md:mb-[3vh]" />
        <p className="text-[5vw] md:text-[3.5vh] font-bold opacity-90">Hemos creado una herramienta</p>
        <p className="text-[3.5vw] md:text-[2vh] opacity-60 mt-2 md:mt-[2vh]">que nos ayuda a organizarnos mejor →</p>
      </div>
    ),
  },

  // 6. POR QUÉ LA APP
  {
    id: "why_needed",
    bg: "from-orange-700 to-red-800",
    content: (
      <div className={slideWrap}>
        <h2 className={`${titleClass} mb-2 md:mb-[2vh]`}>📱 ¿Por qué una app propia?</h2>
        <div className="flex flex-col gap-2 md:gap-[1.5vh]">
          {[
            { icon: "📋", title: "130 jugadores y creciendo", desc: "Gestionar tantas familias, pagos, convocatorias y documentos requiere una herramienta centralizada." },
            { icon: "💬", title: "WhatsApp se nos queda corto", desc: "Los grupos no permiten gestionar pagos ni convocatorias. La información se pierde." },
            { icon: "⚖️", title: "Igualdad y transparencia", desc: "Todas las familias reciben la misma información al mismo tiempo." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <p className="text-[4.5vw] md:text-[2.5vh] font-bold mb-0.5">{item.icon} {item.title}</p>
              <p className="text-[3.2vw] md:text-[1.8vh] opacity-85 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 7. CANAL OFICIAL
  {
    id: "mandatory",
    bg: "from-slate-800 to-orange-900",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>📱 Canal oficial del club</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>Necesitamos que todas las familias la utilicen</p>
        <div className="bg-orange-500/20 border-2 border-orange-400/40 rounded-xl p-3 md:p-[2vh_2vw]">
          <div className="space-y-3 md:space-y-[1.5vh]">
            {[
              { icon: "📱", title: "Inscripciones por la app", desc: "Para inscribir a tus hijos necesitas la app" },
              { icon: "💳", title: "Pagos y justificantes", desc: "Se gestionan desde la app" },
              { icon: "💛", title: "Estamos para ayudar", desc: "Si tenéis cualquier dificultad, hablad con nosotros" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[5vw] md:text-[3vh] flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[4vw] md:text-[2.3vh] font-bold">{item.title}</p>
                  <p className="text-[3.2vw] md:text-[1.7vh] opacity-80">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 8. ES GRATIS
  {
    id: "free",
    bg: "from-green-600 to-emerald-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw]">
        <h2 className={titleClass}>🆓 ¡100% GRATUITA!</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[3vh]`}>No cuesta nada. Ni ahora ni nunca.</p>
        <div className="grid grid-cols-3 gap-2 md:gap-[1.5vw] w-full max-w-3xl mb-3 md:mb-[3vh]">
          {[
            { icon: "💰", val: "0€", sub: "Sin coste" },
            { icon: "📱", val: "Tu móvil", sub: "Y un email" },
            { icon: "⏱️", val: "5 min", sub: "Para instalarla" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[6vw] md:text-[4vh] mb-0.5">{item.icon}</div>
              <p className="text-[5vw] md:text-[2.5vh] font-bold">{item.val}</p>
              <p className="text-[2.5vw] md:text-[1.5vh] opacity-80">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-white/15 rounded-xl p-2.5 md:p-[1.5vh_2vw] border border-white/20 w-full max-w-3xl text-center">
          <p className="text-[3.2vw] md:text-[1.9vh]">💚 El club ha invertido en esta herramienta. Solo necesitamos que <strong>todas las familias colaboren usándola</strong>.</p>
        </div>
      </div>
    ),
  },

  // 9. ADIÓS WHATSAPP
  {
    id: "bye_whatsapp",
    bg: "from-slate-800 to-slate-900",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>🔄 Todo en un solo sitio</h2>
        <p className={`${subtitleClass} mb-2 md:mb-[1.5vh]`}>Centralizamos la comunicación poco a poco</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-[0.8vw]">
          {[
            { icon: "💬", old: "Grupos WhatsApp", now: "Chat por categoría" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Datos automáticos" },
            { icon: "📝", old: "Google Forms", now: "Inscripciones digitales" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado" },
            { icon: "📞", old: "Llamadas para todo", now: "Chat con entrenador" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[4vw] md:text-[2.2vh]">{item.icon}</span>
                <span className="text-[2.8vw] md:text-[1.5vh] text-red-400 line-through">{item.old}</span>
              </div>
              <p className="text-[3vw] md:text-[1.6vh] text-green-400 font-bold">✅ {item.now}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 10. ASÍ SE VE
  {
    id: "screenshots",
    bg: "from-gray-900 to-gray-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw]">
        <h2 className={`${titleClass} mb-3 md:mb-[2vh]`}>📱 Así se ve por dentro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-[1vw] w-full">
          {[
            { label: "Panel principal", icon: "🏠", items: ["Próximos partidos", "Alertas y avisos", "Accesos rápidos"] },
            { label: "Convocatorias", icon: "🏆", items: ["Rival y hora", "Confirmar asistencia", "Transporte"] },
            { label: "Chat de equipo", icon: "💬", items: ["Mensajes grupales", "Fotos y archivos", "Encuestas"] },
            { label: "Mis pagos", icon: "💳", items: ["Estado de cuotas", "Subir justificante", "Recibos PDF"] },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="bg-gradient-to-b from-white/15 to-white/5 rounded-xl border-2 border-white/20 p-2 md:p-[1vh_1vw] shadow-2xl w-full flex flex-col justify-center">
                <div className="text-[6vw] md:text-[4vh] text-center mb-1">{item.icon}</div>
                <div className="space-y-0.5 md:space-y-[0.5vh]">
                  {item.items.map((line, j) => (
                    <div key={j} className="bg-white/10 rounded-lg px-1.5 py-0.5 text-[2.5vw] md:text-[1.5vh] text-center">{line}</div>
                  ))}
                </div>
              </div>
              <span className="text-[2.5vw] md:text-[1.4vh] font-bold opacity-70">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 11. CÓMO INSTALAR
  {
    id: "install",
    bg: "from-blue-600 to-blue-800",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>📲 Cómo instalar la app</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>NO es de tienda — se instala desde el navegador en 1 minuto</p>
        <div className="grid grid-cols-2 gap-2 md:gap-[1.5vw]">
          {[
            { icon: "🍎", title: "iPhone / iPad", color: "text-blue-300", steps: ["Abrir Safari", "Ir al enlace de la app", "Pulsar ⬆️ (compartir)", '"Añadir a inicio"', "¡Listo!"] },
            { icon: "🤖", title: "Android", color: "text-green-300", steps: ["Abrir Chrome", "Ir al enlace de la app", "Pulsar ⋮ (3 puntos)", '"Instalar app"', "¡Listo!"] },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="text-[6vw] md:text-[3.5vh] text-center mb-0.5">{item.icon}</div>
              <h3 className="text-[4.5vw] md:text-[2.2vh] font-bold text-center mb-1">{item.title}</h3>
              <ol className="space-y-0.5 md:space-y-[0.5vh]">
                {item.steps.map((step, j) => (
                  <li key={j} className="flex gap-1 text-[3.2vw] md:text-[1.7vh]">
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

  // 12. REGISTRO
  {
    id: "register",
    bg: "from-emerald-600 to-emerald-800",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>👨‍👩‍👧 Registro e inscripción</h2>
        <p className={`${subtitleClass} mb-2 md:mb-[1.5vh]`}>Proceso sencillo paso a paso</p>
        <div className="space-y-1.5 md:space-y-[1vh]">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código — sin contraseña" },
            { step: "2", title: "Verificar código del club", desc: "Para confirmar tu identidad" },
            { step: "3", title: "Seleccionar tu perfil", desc: "Familia (hijos menores) o Jugador +18" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos, foto carnet y documentos" },
            { step: "5", title: "Elegir forma de pago", desc: "Cuota única o 3 plazos" },
          ].map((item, i) => (
            <div key={i} className={`${card} flex items-center gap-2`}>
              <div className="w-8 h-8 md:w-[4vh] md:h-[4vh] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[4.5vw] md:text-[2vh] font-black">{item.step}</div>
              <div>
                <h3 className="text-[3.8vw] md:text-[2vh] font-bold leading-tight">{item.title}</h3>
                <p className="text-[2.8vw] md:text-[1.5vh] opacity-80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 13. JUGADORES +18
  {
    id: "adults",
    bg: "from-amber-700 to-orange-800",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>🔞 Jugadores +18</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>Se gestionan ellos mismos</p>
        <div className="grid grid-cols-2 gap-2 md:gap-[1.5vw] mb-3 md:mb-[2vh]">
          <div className={card}>
            <div className="text-[6vw] md:text-[3.5vh] mb-1">🚫</div>
            <h3 className="text-[4vw] md:text-[2.2vh] font-bold mb-0.5">NO los deis de alta como hijos</h3>
            <p className="text-[3vw] md:text-[1.6vh] opacity-85 leading-snug">Un jugador +18 <strong>NO puede estar dado de alta por un padre</strong>.</p>
          </div>
          <div className={card}>
            <div className="text-[6vw] md:text-[3.5vh] mb-1">✅</div>
            <h3 className="text-[4vw] md:text-[2.2vh] font-bold mb-0.5">Se registran solos</h3>
            <p className="text-[3vw] md:text-[1.6vh] opacity-85 leading-snug">Se instalan la app, eligen "Jugador +18", y gestionan todo ellos.</p>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-2 md:p-[1.2vh_2vw] text-center">
          <p className="text-[3.5vw] md:text-[2vh] font-bold">⚠️ Si tenéis un hijo mayor de 18, decídselo: tiene que instalarse la app él mismo.</p>
        </div>
      </div>
    ),
  },

  // 14. ACCESO JUVENIL
  {
    id: "minor_access",
    bg: "from-violet-700 to-purple-900",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>🧑‍🎓 Acceso Juvenil (13–17)</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>Para que los chavales se gestionen solos</p>
        <div className={`${card} w-full`}>
          <div className="space-y-2 md:space-y-[1vh]">
            {[
              { icon: "📱", text: "Los menores de 13–17 pueden tener su propio acceso con su email" },
              { icon: "👨‍👩‍👧", text: "El padre/madre debe autorizar el acceso desde su cuenta" },
              { icon: "✅", text: "Ve convocatorias, calendario, evaluaciones y anuncios" },
              { icon: "🚫", text: "NO tienen chat ni acceso a pagos ni datos sensibles" },
              { icon: "🎯", text: "Así el chaval confirma sus propias convocatorias" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[4.5vw] md:text-[2.5vh] flex-shrink-0">{item.icon}</span>
                <p className="text-[3.2vw] md:text-[1.8vh] leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 15. CONVOCATORIAS
  {
    id: "callups",
    bg: "from-amber-600 to-red-700",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>🏆 Convocatorias</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>El entrenador convoca → tú confirmas</p>
        <div className="grid grid-cols-3 gap-2 md:gap-[1vw] mb-3 md:mb-[2vh]">
          {[
            { icon: "📩", title: "Te llega aviso", desc: "Notificación al ser convocado" },
            { icon: "✅", title: "Confirmas", desc: '"Asistirá" o "No" — un toque' },
            { icon: "🚗", title: "Transporte", desc: "Ofrece o pide plazas" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[6vw] md:text-[3.5vh] mb-0.5">{item.icon}</div>
              <h3 className="text-[3.5vw] md:text-[1.8vh] font-bold mb-0.5">{item.title}</h3>
              <p className="text-[2.8vw] md:text-[1.4vh] opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className={`${card} text-center`}>
          <p className="text-[3.2vw] md:text-[1.9vh]">💡 <strong>Confirma siempre rápido</strong> para que el entrenador pueda planificar.</p>
        </div>
      </div>
    ),
  },

  // 16. PAGOS
  {
    id: "payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>💳 Pagos y Cuotas</h2>
        <p className={`${subtitleClass} mb-2 md:mb-[1.5vh]`}>Transparente y sencillo</p>
        <div className="grid grid-cols-2 gap-2 md:gap-[1vw] mb-2 md:mb-[1.5vh]">
          <div className={card}>
            <h3 className="text-[4.5vw] md:text-[2.2vh] font-bold mb-1">💰 Formas de pago</h3>
            <div className="space-y-1 md:space-y-[0.5vh]">
              <p className="text-[3.2vw] md:text-[1.7vh]">✅ <strong>Pago único</strong></p>
              <p className="text-[3.2vw] md:text-[1.7vh]">✅ <strong>3 plazos</strong> (Jun, Sep, Dic)</p>
            </div>
          </div>
          <div className={card}>
            <h3 className="text-[4.5vw] md:text-[2.2vh] font-bold mb-1">📄 Proceso</h3>
            <div className="space-y-1 md:space-y-[0.5vh]">
              <p className="text-[3.2vw] md:text-[1.7vh]">1️⃣ Selecciona pago</p>
              <p className="text-[3.2vw] md:text-[1.7vh]">2️⃣ Paga (transfer. o tarjeta)</p>
              <p className="text-[3.2vw] md:text-[1.7vh]">3️⃣ Sube justificante</p>
              <p className="text-[3.2vw] md:text-[1.7vh]">4️⃣ El club lo valida</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-2 md:p-[1vh_2vw] text-center">
          <p className="text-[3.5vw] md:text-[2vh] font-bold">⚠️ Los jugadores con pagos pendientes <strong>no serán convocados</strong>.</p>
        </div>
      </div>
    ),
  },

  // 17. COMUNICACIÓN
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className={slideWrap}>
        <h2 className={titleClass}>💬 Comunicación</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>3 canales — todo dentro de la app</p>
        <div className="grid grid-cols-3 gap-2 md:gap-[1vw] mb-3 md:mb-[2vh]">
          {[
            { icon: "⚽", title: "Chat de Equipo", desc: "Grupal con entrenador" },
            { icon: "🎓", title: "Chat Coordinador", desc: "Privado 1-a-1" },
            { icon: "🔔", title: "Mensajes Club", desc: "Avisos oficiales" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[6vw] md:text-[3.5vh] mb-0.5">{item.icon}</div>
              <h3 className="text-[3.5vw] md:text-[1.8vh] font-bold mb-0.5">{item.title}</h3>
              <p className="text-[2.8vw] md:text-[1.4vh] opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-2 md:p-[1.2vh_2vw] text-center">
          <p className="text-[3.5vw] md:text-[1.9vh] font-bold">📲 Los grupos de WhatsApp se irán cerrando poco a poco.</p>
        </div>
      </div>
    ),
  },

  // 18. EXTRAS
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw]">
        <h2 className={`${titleClass} mb-2 md:mb-[2vh]`}>✨ Y mucho más...</h2>
        <p className={`${subtitleClass} mb-3 md:mb-[2vh]`}>La app sigue creciendo</p>
        <div className="grid grid-cols-3 gap-1.5 md:gap-[0.8vw] w-full max-w-4xl">
          {[
            { icon: "🏆", title: "Competición" },
            { icon: "🛍️", title: "Tienda ropa" },
            { icon: "🖼️", title: "Galería fotos" },
            { icon: "📋", title: "Encuestas" },
            { icon: "📄", title: "Documentos" },
            { icon: "📅", title: "Calendario" },
            { icon: "🤝", title: "Voluntariado" },
            { icon: "🎫", title: "Hacerse socio" },
            { icon: "🤖", title: "Asistente IA" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div className="text-[5vw] md:text-[3.5vh] mb-0.5">{item.icon}</div>
              <p className="text-[2.8vw] md:text-[1.6vh] font-bold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 19. FAQ
  {
    id: "faq",
    bg: "from-indigo-700 to-violet-800",
    content: (
      <div className={slideWrap}>
        <h2 className={`${titleClass} mb-2 md:mb-[2vh]`}>❓ Preguntas Frecuentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-[0.8vw]">
          {[
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se invita al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — código nuevo, sin contraseña." },
            { q: "¿Mi hijo de 15 puede usar la app?", a: "Sí, con acceso juvenil. Tú lo autorizas." },
            { q: "¿Mi hijo de 19 puede estar en mi cuenta?", a: "No. Los +18 se registran solos." },
            { q: "¿Quién ve mis datos?", a: "Solo administradores y entrenadores. LOPD." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <h3 className="text-[3.2vw] md:text-[1.8vh] font-bold mb-0.5">{item.q}</h3>
              <p className="text-[2.8vw] md:text-[1.5vh] opacity-80">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 20. CIERRE
  {
    id: "end",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4 md:px-[4vw]">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-24 h-24 md:w-[12vh] md:h-[12vh] rounded-full border-4 border-white/40 shadow-2xl mb-3 md:mb-[3vh]" />
        <h2 className="text-[11vw] md:text-[7vh] font-black leading-none mb-2 md:mb-[1.5vh]">¡Gracias!</h2>
        <p className="text-[5vw] md:text-[3vh] opacity-90">¿Alguna pregunta?</p>
        <p className="text-[3.5vw] md:text-[1.8vh] opacity-70 mt-1 md:mt-[1vh]">Estamos aquí para ayudaros 💪</p>
        <div className={`${card} mt-3 md:mt-[2vh] max-w-full md:max-w-3xl`}>
          <p className="text-[2.8vw] md:text-[1.7vh] opacity-80 mb-0.5">Si necesitáis ayuda con la app:</p>
          <p className="text-[4vw] md:text-[2.3vh] font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
        </div>
        <div className="bg-orange-500/20 border border-orange-400/30 rounded-xl p-2.5 md:p-[1.2vh_2vw] mt-2 md:mt-[1.5vh] max-w-full md:max-w-3xl">
          <p className="text-[3.5vw] md:text-[2vh] font-bold">📱 ¡Instaladla hoy! Son solo 5 minutos.</p>
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
  const BAR_H = 44; // bottom bar height in px

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-gradient-to-br ${slide.bg} transition-all duration-500 overflow-hidden select-none`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide content — NO scroll en desktop, scroll permitido en móvil */}
      <div
        className="w-full overflow-y-auto md:overflow-hidden transition-opacity duration-200 flex items-start md:items-center justify-center"
        style={{ height: `calc(100vh - ${BAR_H}px)`, height: `calc(100dvh - ${BAR_H}px)`, opacity: transitioning ? 0 : 1 }}
      >
        <div className="w-full max-w-[1400px] mx-auto h-full">
          {slide.content}
        </div>
      </div>

      {/* Desktop nav arrows */}
      {current > 0 && (
        <button onClick={goPrev} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center transition-all z-10">
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {current < total - 1 && (
        <button onClick={goNext} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center transition-all z-10">
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 md:px-6 bg-black/30 backdrop-blur-sm z-10" style={{ height: BAR_H }}>
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

        <div className="md:hidden flex items-center gap-2">
          <button onClick={goPrev} disabled={current === 0} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/80 text-sm font-medium">{current + 1}/{total}</span>
          <button onClick={goNext} disabled={current === total - 1} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-30">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-4 text-white/70 text-lg">
          <span>{current + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>

        <button onClick={toggleFullscreen} className="md:hidden w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* Desktop click zones */}
      <div className="hidden md:flex absolute inset-0 pointer-events-none">
        <div className="w-1/4 h-full pointer-events-auto cursor-pointer" onClick={goPrev} />
        <div className="w-1/2 h-full" />
        <div className="w-1/4 h-full pointer-events-auto cursor-pointer" onClick={goNext} />
      </div>
    </div>
  );
}