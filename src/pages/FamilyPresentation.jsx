import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const card = "bg-white/10 backdrop-blur-sm rounded-2xl md:rounded-3xl border border-white/20 p-4 md:p-8";

// Responsive text helper — uses clamp() for fluid scaling between mobile and TV
const t = {
  hero: "clamp(2.5rem, 8vw, 12rem)",
  h1: "clamp(1.8rem, 5vw, 8rem)",
  h2: "clamp(1.4rem, 3.5vw, 5.5rem)",
  h3: "clamp(1.1rem, 2.8vw, 4.5rem)",
  body: "clamp(0.95rem, 2.2vw, 3.5rem)",
  small: "clamp(0.8rem, 1.8vw, 3rem)",
  tiny: "clamp(0.7rem, 1.5vw, 2.5rem)",
  icon: "clamp(2rem, 5vw, 8rem)",
  iconSm: "clamp(1.5rem, 3.5vw, 5.5rem)",
};

const slides = [
  // ═══════════════════════════════════════
  // 1. BIENVENIDA
  // ═══════════════════════════════════════
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4 md:px-6">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 md:w-56 md:h-56 rounded-full border-4 border-white/40 shadow-2xl mb-4 md:mb-8" />
        <h1 style={{fontSize:t.hero}} className="font-black drop-shadow-lg leading-none">CD Bustarviejo</h1>
        <p style={{fontSize:t.h2}} className="font-light opacity-90 mt-2 md:mt-4">Reunión de Familias</p>
        <p style={{fontSize:t.body}} className="opacity-90 mt-2 md:mt-4 font-semibold">Temporada 2026–2027</p>
        <div className="mt-6 md:mt-12 animate-bounce opacity-60" style={{fontSize:t.tiny}}>Desliza o pulsa → para avanzar</div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 2. QUIÉNES SOMOS — IMPACTO MÁXIMO
  // ═══════════════════════════════════════
  {
    id: "who_we_are",
    bg: "from-slate-900 via-slate-800 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        {/* Frase de impacto */}
        <div className="text-center mb-4 md:mb-[3vh]">
          <p style={{fontSize:t.h2}} className="text-red-400 font-black uppercase tracking-wider mb-2 md:mb-4">⛔ Esto NO es una extraescolar</p>
          <div className="w-32 md:w-64 h-1 bg-gradient-to-r from-orange-500 to-green-500 mx-auto rounded-full" />
        </div>

        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-4 md:mb-[3vh]">Somos una <span className="text-orange-400">Asociación sin ánimo de lucro</span></h2>

        <div className="flex flex-col gap-3 md:gap-[2vh] w-full">
          {[
            { icon: "🚫", title: "No somos una empresa", desc: "Nadie se lucra con el club. No hay beneficios, no hay accionistas, no hay negocio." },
            { icon: "🤝", title: "Esto es de TODOS", desc: "El club existe porque familias como la tuya deciden implicarse. Sin vosotros, no hay club." },
            { icon: "❤️", title: "Voluntarios por vocación", desc: "La junta directiva, la mayoría de entrenadores y todos los gestores dedican su tiempo libre sin cobrar un euro." },
            { icon: "🏛️", title: "Respaldados por el Ayuntamiento", desc: "Contamos con una pequeña subvención municipal. No cubre ni la mitad de los gastos." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-start gap-3 md:gap-[1.5vw]">
                <span style={{fontSize:t.iconSm}} className="flex-shrink-0">{item.icon}</span>
                <div>
                  <p style={{fontSize:t.h3}} className="font-bold">{item.title}</p>
                  <p style={{fontSize:t.body}} className="opacity-85 leading-snug">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 3. CÓMO SOBREVIVIMOS — TRANSPARENCIA TOTAL
  // ═══════════════════════════════════════
  {
    id: "how_we_survive",
    bg: "from-red-900 via-red-800 to-orange-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">💰 ¿Cómo sobrevive el club?</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">Con total transparencia</p>

        {/* Columna de ingresos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          <div className={card}>
            <h3 style={{fontSize:t.h3}} className="font-bold mb-3 md:mb-[2vh] text-green-400">📥 Nuestros ingresos</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <div className="flex items-center gap-2 md:gap-[1vw]">
                <div className="w-3 h-3 md:w-5 md:h-5 rounded-full bg-green-500 flex-shrink-0" />
                <p style={{fontSize:t.body}}><strong>Cuotas de las familias</strong> — la base principal</p>
              </div>
              <div className="flex items-center gap-2 md:gap-[1vw]">
                <div className="w-3 h-3 md:w-5 md:h-5 rounded-full bg-green-400 flex-shrink-0" />
                <p style={{fontSize:t.body}}><strong>Subvención del Ayuntamiento</strong> — pequeña ayuda</p>
              </div>
              <div className="flex items-center gap-2 md:gap-[1vw]">
                <div className="w-3 h-3 md:w-5 md:h-5 rounded-full bg-green-300 flex-shrink-0" />
                <p style={{fontSize:t.body}}><strong>Patrocinadores locales</strong> — lo que se consigue</p>
              </div>
            </div>
          </div>

          <div className={card}>
            <h3 style={{fontSize:t.h3}} className="font-bold mb-3 md:mb-[2vh] text-red-400">📤 Nuestros gastos</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              {["Federación y seguros obligatorios", "Material deportivo y balones", "Equipación y ropa", "Mantenimiento de instalaciones", "Coordinador y un entrenador (a tiempo parcial)", "Árbitros y desplazamientos"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 md:gap-[1vw]">
                  <div className="w-3 h-3 md:w-5 md:h-5 rounded-full bg-red-500/60 flex-shrink-0" />
                  <p style={{fontSize:t.body}}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mensaje de impacto */}
        <div className="bg-white/10 border-2 border-yellow-400/50 rounded-2xl md:rounded-3xl p-4 md:p-[2vw] w-full text-center">
          <p style={{fontSize:t.h3}} className="font-black text-yellow-300">⚠️ Solo 2 personas reciben una pequeña compensación:</p>
          <p style={{fontSize:t.body}} className="mt-1 md:mt-2 opacity-90">el coordinador y un entrenador, a tiempo parcial. <strong>Todos los demás — entrenadores, junta directiva, gestores — son 100% voluntarios.</strong></p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 4. LLAMADA A LA IMPLICACIÓN
  // ═══════════════════════════════════════
  {
    id: "involvement",
    bg: "from-emerald-800 via-green-800 to-teal-900",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <div className="text-center mb-4 md:mb-[3vh]">
          <p style={{fontSize:t.icon}} className="mb-2 md:mb-4">🙌</p>
          <h2 style={{fontSize:t.h1}} className="font-black leading-tight">Necesitamos que <span className="text-yellow-300">TODOS</span> rememos juntos</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          {[
            { icon: "💪", title: "Implícate", desc: "Cualquier ayuda importa: llevar a niños a partidos, echar una mano en eventos, proponer ideas…" },
            { icon: "📢", title: "Propón, no critiques", desc: "Si algo no te gusta, dilo con una solución. Todas las decisiones buscan mejorar minimizando el impacto en las familias." },
            { icon: "⏰", title: "Respeta los tiempos", desc: "Los voluntarios tienen familia, trabajo y vida. Responder WhatsApps a las 23h no es razonable." },
            { icon: "🎯", title: "Piensa en el proyecto", desc: "No somos perfectos, pero cada año intentamos que esto sea mejor para vuestros hijos." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-start gap-3 md:gap-[1.5vw]">
                <span style={{fontSize:t.iconSm}} className="flex-shrink-0">{item.icon}</span>
                <div>
                  <p style={{fontSize:t.h3}} className="font-bold">{item.title}</p>
                  <p style={{fontSize:t.body}} className="opacity-85 leading-snug">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-orange-500/20 border border-orange-400/40 rounded-2xl md:rounded-3xl p-4 md:p-[2vw] w-full text-center">
          <p style={{fontSize:t.h3}} className="font-black">Hacer viable un proyecto así cada año es un reto enorme.</p>
          <p style={{fontSize:t.body}} className="mt-1 md:mt-2 opacity-90">Pero juntos lo conseguimos. Gracias por formar parte de esto.</p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 5. PROYECTOS EN MARCHA
  // ═══════════════════════════════════════
  {
    id: "projects",
    bg: "from-blue-800 via-indigo-800 to-purple-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">🚀 Proyectos en marcha</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">Vuestras cuotas se invierten en mejorar el club</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          {[
            { icon: "🚶", title: "Acera para subir al campo", desc: "Acceso seguro y cómodo para todos, especialmente niños y personas mayores", tag: "EN CURSO" },
            { icon: "🛡️", title: "Protecciones de las vallas", desc: "Seguridad en todo el perímetro del campo para evitar accidentes", tag: "EN CURSO" },
            { icon: "🏟️", title: "Gradas y zona de entrenamientos", desc: "Proyecto para mejorar las instalaciones y tener zona de calentamiento", tag: "PROYECTO" },
            { icon: "👕", title: "Cambio de proveedor de ropa", desc: "Mejor calidad y precios más competitivos para la próxima temporada", tag: "PRÓXIMA TEMP." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-start gap-3 md:gap-[1.5vw]">
                <span style={{fontSize:t.iconSm}} className="flex-shrink-0">{item.icon}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 md:gap-[1vw] mb-1">
                    <p style={{fontSize:t.h3}} className="font-bold">{item.title}</p>
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-yellow-500/30 border border-yellow-400/50 rounded-full text-yellow-300 font-bold" style={{fontSize:t.tiny}}>{item.tag}</span>
                  </div>
                  <p style={{fontSize:t.body}} className="opacity-85 leading-snug">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`${card} text-center w-full`}>
          <p style={{fontSize:t.body}}>➕ <strong>Y más iniciativas por venir...</strong> Esto no para. Cada temporada un paso más.</p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 6. TRANSICIÓN A LA APP
  // ═══════════════════════════════════════
  {
    id: "app_intro",
    bg: "from-orange-600 to-orange-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white text-center px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <p style={{fontSize:t.icon}} className="mb-4 md:mb-[3vh]">📱</p>
        <h2 style={{fontSize:t.h1}} className="font-black leading-tight mb-2 md:mb-[2vh]">Y para gestionar todo esto mejor...</h2>
        <p style={{fontSize:t.h2}} className="text-yellow-200 font-bold mb-4 md:mb-[3vh]">¡Tenemos nueva app!</p>
        <div className={`${card} max-w-full md:max-w-[70vw]`}>
          <p style={{fontSize:t.body}} className="opacity-90 leading-relaxed">Una herramienta <strong>gratuita</strong> que nos permite organizar el club de forma profesional: inscripciones, pagos, convocatorias, comunicación, calendario, tienda… <strong>todo en un solo sitio.</strong></p>
        </div>
        <p style={{fontSize:t.small}} className="opacity-60 mt-4 md:mt-[3vh]">👇 Os explicamos cómo funciona</p>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 7. POR QUÉ ES NECESARIA
  // ═══════════════════════════════════════
  {
    id: "why_needed",
    bg: "from-red-700 to-red-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-4 md:mb-[3vh]">🚨 ¿Por qué necesitamos esta app?</h2>
        <div className="flex flex-col gap-3 md:gap-[2vh] w-full">
          {[
            { icon: "📋", title: "Gestión imposible sin ella", desc: "Con ~130 jugadores y familias — y creciendo — necesitamos una herramienta centralizada." },
            { icon: "💬", title: "WhatsApp genera problemas", desc: "Grupos descontrolados, información perdida, malentendidos, imposible gestionar pagos ni convocatorias." },
            { icon: "⚖️", title: "Igualdad y transparencia", desc: "Todos reciben la misma información al mismo tiempo. Sin favoritismos ni rumores." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-start gap-3 md:gap-[1.5vw]">
                <span style={{fontSize:t.iconSm}} className="flex-shrink-0">{item.icon}</span>
                <div>
                  <p style={{fontSize:t.h3}} className="font-bold">{item.title}</p>
                  <p style={{fontSize:t.body}} className="opacity-85 leading-snug">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 8. ES OBLIGATORIA + GRATUITA
  // ═══════════════════════════════════════
  {
    id: "mandatory_free",
    bg: "from-slate-900 to-slate-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-4 md:mb-[3vh]">⚠️ Es OBLIGATORIA — y es GRATIS</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          <div className="bg-red-500/15 border-2 border-red-400/40 rounded-2xl md:rounded-3xl p-4 md:p-[2vw]">
            <h3 style={{fontSize:t.h3}} className="font-bold text-red-300 mb-3 md:mb-[2vh]">🚫 Sin app NO puedes...</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p style={{fontSize:t.body}}>❌ Inscribir a tus hijos</p>
              <p style={{fontSize:t.body}}>❌ Gestionar pagos</p>
              <p style={{fontSize:t.body}}>❌ Recibir convocatorias</p>
              <p style={{fontSize:t.body}}>❌ Comunicarte con el club</p>
            </div>
          </div>
          <div className="bg-green-500/15 border-2 border-green-400/40 rounded-2xl md:rounded-3xl p-4 md:p-[2vw]">
            <h3 style={{fontSize:t.h3}} className="font-bold text-green-300 mb-3 md:mb-[2vh]">🆓 100% Gratuita</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p style={{fontSize:t.body}}>✅ No cuesta nada — ni ahora ni nunca</p>
              <p style={{fontSize:t.body}}>✅ Solo necesitas tu móvil y un email</p>
              <p style={{fontSize:t.body}}>✅ 5 minutos para instalarla</p>
              <p style={{fontSize:t.body}}>✅ El club ha invertido en ella por vosotros</p>
            </div>
          </div>
        </div>

        <div className={`${card} text-center w-full`}>
          <p style={{fontSize:t.body}}>💛 Si tienes dificultades económicas, <strong>habla con nosotros</strong>. El club siempre escucha.</p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 9. ADIÓS WHATSAPP
  // ═══════════════════════════════════════
  {
    id: "bye_whatsapp",
    bg: "from-slate-800 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">🔄 Adiós WhatsApp, emails y papeles</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">Todo en un solo sitio</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-[1.5vw] w-full">
          {[
            { icon: "💬", old: "Grupos de WhatsApp", now: "Chat integrado por categoría" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios y notificaciones al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Pagos, asistencia y datos automáticos" },
            { icon: "📝", old: "Google Forms / papeles", now: "Inscripciones digitales" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado del club" },
            { icon: "📞", old: "Llamadas para todo", now: "Chat directo con entrenador" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-2 md:gap-[1vw] mb-1 md:mb-2">
                <span style={{fontSize:t.iconSm}}>{item.icon}</span>
                <span style={{fontSize:t.small}} className="text-red-400 line-through">{item.old}</span>
              </div>
              <p style={{fontSize:t.body}} className="text-green-400 font-bold">✅ {item.now}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 10. CÓMO INSTALAR
  // ═══════════════════════════════════════
  {
    id: "install",
    bg: "from-blue-600 to-blue-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">📲 Cómo instalar la app</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">NO es de tienda — se instala desde el navegador en 1 minuto</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full">
          {[
            { icon: "🍎", title: "iPhone / iPad", color: "text-blue-300", steps: ["Abrir Safari (obligatorio)", "Ir al enlace de la app", "Pulsar ⬆️ (compartir)", '"Añadir a pantalla de inicio"', "Confirmar → ¡Listo!"] },
            { icon: "🤖", title: "Android", color: "text-green-300", steps: ["Abrir Chrome", "Ir al enlace de la app", "Pulsar ⋮ (3 puntos)", '"Instalar aplicación"', "Confirmar → ¡Listo!"] },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div style={{fontSize:t.icon}} className="text-center mb-2 md:mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:t.h3}} className="font-bold text-center mb-3 md:mb-[2vh]">{item.title}</h3>
              <ol className="space-y-2 md:space-y-[1.2vh]">
                {item.steps.map((step, j) => (
                  <li key={j} className="flex gap-2 md:gap-[0.8vw]" style={{fontSize:t.body}}>
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

  // ═══════════════════════════════════════
  // 11. REGISTRO E INSCRIPCIÓN
  // ═══════════════════════════════════════
  {
    id: "register",
    bg: "from-emerald-600 to-emerald-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">👨‍👩‍👧 Registro e inscripción</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">Proceso sencillo paso a paso</p>
        <div className="flex flex-col gap-2 md:gap-[1.5vh] w-full">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código de acceso — sin contraseña" },
            { step: "2", title: "Verificar código del club", desc: "El club te dará un código para confirmar tu identidad" },
            { step: "3", title: "Seleccionar tu perfil", desc: "Familia (hijos menores) o Jugador +18" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos, foto tipo carnet y documentos" },
            { step: "5", title: "Elegir categoría y pagar", desc: "Cuota única o fraccionada en 3 plazos" },
          ].map((item, i) => (
            <div key={i} className={`${card} flex items-center gap-3 md:gap-[1.5vw]`}>
              <div className="w-10 h-10 md:w-[5vw] md:h-[5vw] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0" style={{fontSize:t.h3, fontWeight:900}}>{item.step}</div>
              <div>
                <h3 style={{fontSize:t.h3}} className="font-bold">{item.title}</h3>
                <p style={{fontSize:t.body}} className="opacity-80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 12. JUGADORES +18 Y ACCESO JUVENIL
  // ═══════════════════════════════════════
  {
    id: "adults_minors",
    bg: "from-amber-700 to-purple-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-4 md:mb-[3vh]">👥 Jugadores +18 y Acceso Juvenil</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full">
          <div className={card}>
            <p style={{fontSize:t.icon}} className="text-center mb-2 md:mb-[1vh]">🔞</p>
            <h3 style={{fontSize:t.h3}} className="font-bold text-center mb-3 md:mb-[2vh]">Mayores de 18</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p style={{fontSize:t.body}}>🚫 <strong>NO los deis de alta como hijos</strong></p>
              <p style={{fontSize:t.body}}>✅ Se registran <strong>ellos mismos</strong> con su email</p>
              <p style={{fontSize:t.body}}>✅ Gestionan sus propios pagos y convocatorias</p>
            </div>
          </div>
          <div className={card}>
            <p style={{fontSize:t.icon}} className="text-center mb-2 md:mb-[1vh]">🧑‍🎓</p>
            <h3 style={{fontSize:t.h3}} className="font-bold text-center mb-3 md:mb-[2vh]">Acceso Juvenil (13–17)</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p style={{fontSize:t.body}}>📱 El menor puede tener su propio acceso</p>
              <p style={{fontSize:t.body}}>👨‍👩‍👧 El padre/madre lo autoriza desde la app</p>
              <p style={{fontSize:t.body}}>✅ Ve convocatorias y calendario (sin chat)</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl md:rounded-3xl p-4 md:p-[2vw] w-full text-center mt-3 md:mt-[2vh]">
          <p style={{fontSize:t.h3}} className="font-bold">⚠️ Si tu hijo tiene 18+, díselo: tiene que instalarse la app él mismo.</p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 13. CONVOCATORIAS + PAGOS
  // ═══════════════════════════════════════
  {
    id: "callups_payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-4 md:mb-[3vh]">🏆 Convocatorias y 💳 Pagos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          <div className={card}>
            <h3 style={{fontSize:t.h3}} className="font-bold mb-3 md:mb-[2vh]">🏆 Convocatorias</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p style={{fontSize:t.body}}>📩 Te llega aviso cuando tu hijo es convocado</p>
              <p style={{fontSize:t.body}}>✅ Confirmas con un solo toque</p>
              <p style={{fontSize:t.body}}>🚗 Organiza transporte compartido</p>
              <p style={{fontSize:t.body}}>📍 Cómo llegar al campo rival</p>
            </div>
          </div>
          <div className={card}>
            <h3 style={{fontSize:t.h3}} className="font-bold mb-3 md:mb-[2vh]">💳 Pagos</h3>
            <div className="space-y-2 md:space-y-[1.5vh]">
              <p style={{fontSize:t.body}}>💰 Pago único o 3 plazos</p>
              <p style={{fontSize:t.body}}>🏦 Transferencia o tarjeta</p>
              <p style={{fontSize:t.body}}>📄 Sube justificante y el club valida</p>
              <p style={{fontSize:t.body}}>📊 Todo el historial visible</p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-4 md:p-[2vw] w-full text-center">
          <p style={{fontSize:t.h3}} className="font-bold">⚠️ Los jugadores con pagos pendientes no serán convocados a partidos.</p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 14. COMUNICACIÓN
  // ═══════════════════════════════════════
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">💬 Comunicación</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">3 canales — todo dentro de la app</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[2vw] w-full mb-4 md:mb-[3vh]">
          {[
            { icon: "⚽", title: "Chat de Equipo", desc: "Grupal con entrenador y familias de la categoría" },
            { icon: "🎓", title: "Chat Coordinador", desc: "Privado 1-a-1 para temas personales" },
            { icon: "🔔", title: "Mensajes del Club", desc: "Avisos oficiales y recordatorios" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:t.icon}} className="mb-2 md:mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:t.h3}} className="font-bold mb-1 md:mb-2">{item.title}</h3>
              <p style={{fontSize:t.body}} className="opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-4 md:p-[2vw] w-full text-center">
          <p style={{fontSize:t.h3}} className="font-bold">🚫 Los grupos de WhatsApp del club se eliminarán.</p>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 15. COMPETICIÓN + TIENDA + MÁS
  // ═══════════════════════════════════════
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-2 md:mb-[1.5vh]">✨ Y mucho más...</h2>
        <p style={{fontSize:t.body}} className="opacity-80 text-center mb-4 md:mb-[3vh]">La app sigue creciendo</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-[1.5vw] w-full">
          {[
            { icon: "🏆", title: "Competición en directo" },
            { icon: "🛍️", title: "Tienda de ropa" },
            { icon: "🖼️", title: "Galería de fotos" },
            { icon: "📅", title: "Calendario y eventos" },
            { icon: "📋", title: "Encuestas" },
            { icon: "📄", title: "Documentos" },
            { icon: "🤝", title: "Voluntariado" },
            { icon: "🛍️", title: "Mercadillo" },
            { icon: "🎫", title: "Hacerse socio" },
            { icon: "🤖", title: "Asistente virtual IA" },
            { icon: "🖊️", title: "Firmas federación" },
            { icon: "🍀", title: "Lotería Navidad" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:t.iconSm}} className="mb-1">{item.icon}</div>
              <p style={{fontSize:t.small}} className="font-bold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 16. FAQ
  // ═══════════════════════════════════════
  {
    id: "faq",
    bg: "from-indigo-700 to-violet-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-4 md:px-[4vw] py-4 md:py-[2vh]">
        <h2 style={{fontSize:t.h1}} className="font-black text-center mb-4 md:mb-[3vh]">❓ Preguntas Frecuentes</h2>
        <div className="flex flex-col gap-2 md:gap-[1.2vh] w-full">
          {[
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se invita al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — el sistema te envía un código nuevo." },
            { q: "¿Mi hijo de 15 puede usar la app?", a: "Sí, con acceso juvenil. Tú lo autorizas." },
            { q: "¿Mi hijo de 19 va en mi cuenta?", a: "No. Los +18 se registran ellos mismos." },
            { q: "¿Quién ve mis datos?", a: "Solo administradores y entrenadores. Cumplimos LOPD." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <h3 style={{fontSize:t.h3}} className="font-bold mb-1">{item.q}</h3>
              <p style={{fontSize:t.body}} className="opacity-80">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════
  // 17. CIERRE
  // ═══════════════════════════════════════
  {
    id: "end",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-4 md:px-[4vw]">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 md:w-56 md:h-56 rounded-full border-4 border-white/40 shadow-2xl mb-4 md:mb-8" />
        <h2 style={{fontSize:t.hero}} className="font-black mb-2 md:mb-[2vh] leading-none">¡Gracias!</h2>
        <p style={{fontSize:t.h2}} className="opacity-90">¿Alguna pregunta?</p>
        <p style={{fontSize:t.body}} className="opacity-70 mt-2 md:mt-[2vh]">Estamos aquí para ayudaros 💪</p>
        <div className={`${card} mt-4 md:mt-[4vh] max-w-full md:max-w-[70vw]`}>
          <p style={{fontSize:t.body}} className="opacity-80 mb-2">Si necesitáis ayuda con la app:</p>
          <p style={{fontSize:t.h3}} className="font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
          <p style={{fontSize:t.tiny}} className="opacity-60 mt-2">o escribid al coordinador por el chat</p>
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-2xl md:rounded-3xl p-4 md:p-[2vw] mt-3 md:mt-[3vh] max-w-full md:max-w-[70vw]">
          <p style={{fontSize:t.h3}} className="font-bold">📱 ¡Instaladla HOY!</p>
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

  // Fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Touch/swipe support for mobile
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
      <div className="h-full w-full overflow-y-auto">{slide.content}</div>

      {/* Navigation arrows — hidden on small screens (use swipe) */}
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
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 md:px-[2vw] py-2 md:py-[1vh] bg-black/20 safe-area-bottom">
        {/* Dots — compact on mobile */}
        <div className="flex gap-1 md:gap-[0.4vw] flex-wrap max-w-[65%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? "bg-white scale-125 md:scale-150" : "bg-white/40 hover:bg-white/60"}`}
              style={{width: 'clamp(6px, 0.8vw, 12px)', height: 'clamp(6px, 0.8vw, 12px)'}}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 md:gap-[1.5vw] text-white/70" style={{fontSize:t.tiny}}>
          <span>{current + 1}/{total}</span>
          <button onClick={toggleFullscreen} className="hidden md:block hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize className="w-5 h-5 md:w-8 md:h-8" /> : <Maximize className="w-5 h-5 md:w-8 md:h-8" />}
          </button>
        </div>
      </div>

      {/* Invisible click zones for desktop */}
      <div className="hidden md:flex absolute inset-0 pointer-events-none">
        <div className="w-1/4 h-full pointer-events-auto" onClick={goPrev} />
        <div className="w-1/2 h-full" />
        <div className="w-1/4 h-full pointer-events-auto" onClick={goNext} />
      </div>
    </div>
  );
}