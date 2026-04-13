import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
// v4 — EXTREME TV MODE: max size for 300-person auditorium at 5+ meters

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Reusable card style — fills maximum space
const card = "bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 p-8";

const slides = [
  // 1. BIENVENIDA
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-6">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-56 h-56 rounded-full border-4 border-white/40 shadow-2xl mb-8" />
        <h1 style={{fontSize:'8vw', lineHeight:1}} className="font-black drop-shadow-lg">CD Bustarviejo</h1>
        <p style={{fontSize:'3.5vw'}} className="font-light opacity-90 mt-4">Nueva App del Club</p>
        <p style={{fontSize:'2.5vw'}} className="opacity-90 mt-4 font-semibold">Temporada 2026–2027</p>
        <p style={{fontSize:'2vw'}} className="opacity-70 mt-4">Reunión de Familias</p>
        <div className="mt-12 animate-bounce opacity-60" style={{fontSize:'1.8vw'}}>Pulsa → para avanzar</div>
      </div>
    ),
  },

  // 2. POR QUÉ ES NECESARIA
  {
    id: "why_needed",
    bg: "from-red-700 to-red-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[3vh]">🚨 ¿Por qué necesitamos esta app?</h2>
        <div className="flex flex-col gap-[2vh] w-full">
          {[
            { icon: "📋", title: "Gestión imposible sin ella", desc: "Con alrededor de 130 jugadores y familias — y con la esperanza de seguir creciendo — necesitamos una herramienta centralizada." },
            { icon: "💬", title: "WhatsApp genera problemas", desc: "Los grupos se descontrolan, se pierde información, hay malentendidos y no hay forma de gestionar pagos ni convocatorias." },
            { icon: "⚖️", title: "Igualdad y transparencia", desc: "Todos los padres reciben la misma información al mismo tiempo. Sin favoritismos." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <p style={{fontSize:'3vw'}} className="font-bold mb-1">{item.icon} {item.title}</p>
              <p style={{fontSize:'2.2vw'}} className="opacity-85 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 3. ES OBLIGATORIA
  {
    id: "mandatory",
    bg: "from-slate-900 to-slate-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5.5vw', lineHeight:1.1}} className="font-black text-center mb-[2vh]">⚠️ Es OBLIGATORIA</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-90 text-center mb-[3vh]">No es opcional. Es el único canal oficial del club.</p>
        <div className="bg-red-500/20 border-2 border-red-400/40 rounded-3xl p-[3vw] w-full">
          <div className="flex flex-col gap-[2.5vh]">
            {[
              { icon: "📱", title: "Sin app → No puedes inscribir a tus hijos", desc: "Las inscripciones se hacen exclusivamente por la app" },
              { icon: "💳", title: "Sin inscripción → No puedes pagar", desc: "Los pagos se gestionan dentro de la app" },
              { icon: "💛", title: "Sin pagar → Problema para todos", desc: "El club siempre escucha a familias con dificultades. Hablad con nosotros." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-[1.5vw]">
                <span style={{fontSize:'4vw'}} className="flex-shrink-0">{item.icon}</span>
                <div>
                  <p style={{fontSize:'2.8vw'}} className="font-bold">{item.title}</p>
                  <p style={{fontSize:'2vw'}} className="opacity-80">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 4. PERO ES GRATIS
  {
    id: "free",
    bg: "from-green-600 to-emerald-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5.5vw', lineHeight:1.1}} className="font-black text-center mb-[2vh]">🆓 ¡Es 100% GRATUITA!</h2>
        <p style={{fontSize:'2.8vw'}} className="opacity-90 text-center mb-[4vh]">No cuesta nada. Ni ahora ni nunca.</p>
        <div className="grid grid-cols-3 gap-[2vw] w-full mb-[3vh]">
          {[
            { icon: "💰", val: "0€", sub: "Sin coste para las familias" },
            { icon: "📱", val: "Solo tu móvil", sub: "Y un email para acceder" },
            { icon: "⏱️", val: "5 minutos", sub: "Es lo que tardas en instalarla" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:'5vw'}} className="mb-2">{item.icon}</div>
              <p style={{fontSize:'3vw'}} className="font-bold">{item.val}</p>
              <p style={{fontSize:'1.8vw'}} className="opacity-80 mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-white/15 rounded-3xl p-[2vw] border border-white/20 w-full text-center">
          <p style={{fontSize:'2.2vw'}}>💚 El club ha invertido en esta herramienta. Solo necesitamos que <strong>todas las familias colaboren usándola</strong>.</p>
        </div>
      </div>
    ),
  },

  // 5. ADIÓS WHATSAPP
  {
    id: "bye_whatsapp",
    bg: "from-slate-800 to-slate-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'4.5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">🔄 Adiós WhatsApp, emails y papeles</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">Todo en un solo sitio</p>
        <div className="grid grid-cols-2 gap-[1.5vw] w-full">
          {[
            { icon: "💬", old: "Grupos de WhatsApp", now: "Chat integrado por categoría" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios y notificaciones al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Pagos, asistencia y datos automáticos" },
            { icon: "📝", old: "Google Forms / papeles", now: "Inscripciones digitales con documentos" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado del club" },
            { icon: "📞", old: "Llamadas para todo", now: "Chat directo con entrenador" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div className="flex items-center gap-[1vw] mb-2">
                <span style={{fontSize:'3.5vw'}}>{item.icon}</span>
                <span style={{fontSize:'2vw'}} className="text-red-400 line-through">{item.old}</span>
              </div>
              <p style={{fontSize:'2.2vw'}} className="text-green-400 font-bold">✅ {item.now}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 6. ASÍ SE VE POR DENTRO
  {
    id: "screenshots",
    bg: "from-gray-900 to-gray-800",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'4.5vw', lineHeight:1.1}} className="font-black text-center mb-[3vh]">📱 Así se ve la app por dentro</h2>
        <div className="grid grid-cols-4 gap-[1.5vw] w-full flex-1 max-h-[70vh]">
          {[
            { label: "Panel principal", icon: "🏠", items: ["Próximos partidos", "Alertas y avisos", "Accesos rápidos", "Chat y anuncios"] },
            { label: "Convocatorias", icon: "🏆", items: ["Rival y hora", "Confirmar asistencia", "Transporte", "Cómo llegar"] },
            { label: "Chat de equipo", icon: "💬", items: ["Mensajes grupales", "Fotos y archivos", "Encuestas rápidas", "Audio y emojis"] },
            { label: "Mis pagos", icon: "💳", items: ["Estado de cuotas", "Subir justificante", "Histórico", "Recibos PDF"] },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-[1vh]">
              <div className="bg-gradient-to-b from-white/15 to-white/5 rounded-3xl border-2 border-white/20 p-[1.5vw] shadow-2xl w-full flex-1 flex flex-col justify-center">
                <div style={{fontSize:'5vw'}} className="text-center mb-[1.5vh]">{item.icon}</div>
                <div className="space-y-[1vh]">
                  {item.items.map((line, j) => (
                    <div key={j} className="bg-white/10 rounded-xl px-[1vw] py-[0.8vh]" style={{fontSize:'1.6vw'}}>{line}</div>
                  ))}
                </div>
              </div>
              <span style={{fontSize:'1.6vw'}} className="font-bold opacity-70">{item.label}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:'1.8vw'}} className="opacity-60 mt-[2vh]">👉 En la demo en vivo veréis la app real funcionando</p>
      </div>
    ),
  },

  // 7. CÓMO INSTALAR
  {
    id: "install",
    bg: "from-blue-600 to-blue-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">📲 Cómo instalar la app</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">NO es de tienda — se instala desde el navegador en 1 minuto</p>
        <div className="grid grid-cols-2 gap-[2vw] w-full">
          {[
            { icon: "🍎", title: "iPhone / iPad", color: "text-blue-300", steps: ["Abrir Safari (obligatorio)", "Ir al enlace de la app", "Pulsar ⬆️ (compartir)", '"Añadir a pantalla de inicio"', "Confirmar → ¡Listo!"] },
            { icon: "🤖", title: "Android", color: "text-green-300", steps: ["Abrir Chrome", "Ir al enlace de la app", "Pulsar ⋮ (3 puntos)", '"Instalar aplicación"', "Confirmar → ¡Listo!"] },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div style={{fontSize:'5vw'}} className="text-center mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:'3vw'}} className="font-bold text-center mb-[2vh]">{item.title}</h3>
              <ol className="space-y-[1.2vh]">
                {item.steps.map((step, j) => (
                  <li key={j} className="flex gap-[0.8vw]" style={{fontSize:'2.2vw'}}>
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

  // 8. REGISTRO
  {
    id: "register",
    bg: "from-emerald-600 to-emerald-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">👨‍👩‍👧 Registro e inscripción</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">Proceso sencillo paso a paso</p>
        <div className="flex flex-col gap-[1.5vh] w-full">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código de acceso — sin contraseña" },
            { step: "2", title: "Verificar código del club", desc: "El club te dará un código para confirmar tu identidad" },
            { step: "3", title: "Seleccionar tu perfil", desc: "Familia (si tienes hijos menores) o Jugador +18" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos, foto tipo carnet y documentos" },
            { step: "5", title: "Elegir categoría y pagar", desc: "Cuota única o fraccionada en 3 plazos" },
          ].map((item, i) => (
            <div key={i} className={`${card} flex items-center gap-[1.5vw]`}>
              <div className="w-[5vw] h-[5vw] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0" style={{fontSize:'3vw', fontWeight:900}}>{item.step}</div>
              <div>
                <h3 style={{fontSize:'2.8vw'}} className="font-bold">{item.title}</h3>
                <p style={{fontSize:'2vw'}} className="opacity-80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 9. JUGADORES +18
  {
    id: "adults",
    bg: "from-amber-700 to-orange-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">🔞 Jugadores mayores de 18</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">Importante: se gestionan ellos mismos</p>
        <div className="grid grid-cols-2 gap-[2vw] w-full mb-[3vh]">
          <div className={card}>
            <div style={{fontSize:'5vw'}} className="mb-[1vh]">🚫</div>
            <h3 style={{fontSize:'2.8vw'}} className="font-bold mb-2">NO los deis de alta como hijos</h3>
            <p style={{fontSize:'2vw'}} className="opacity-85 leading-snug">Un jugador mayor de 18 años <strong>NO puede estar dado de alta por un padre</strong>. Debe registrarse él mismo.</p>
          </div>
          <div className={card}>
            <div style={{fontSize:'5vw'}} className="mb-[1vh]">✅</div>
            <h3 style={{fontSize:'2.8vw'}} className="font-bold mb-2">Se registran solos</h3>
            <p style={{fontSize:'2vw'}} className="opacity-85 leading-snug">Se instalan la app, eligen perfil "Jugador +18", y gestionan sus propias convocatorias y pagos.</p>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-3xl p-[2vw] w-full text-center">
          <p style={{fontSize:'2.5vw'}} className="font-bold">⚠️ Si tenéis un hijo mayor de 18, decídselo: tiene que instalarse la app él mismo con su email personal.</p>
        </div>
      </div>
    ),
  },

  // 10. ACCESO JUVENIL
  {
    id: "minor_access",
    bg: "from-violet-700 to-purple-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">🧑‍🎓 Acceso Juvenil (13–17 años)</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">Para que los chavales se gestionen solos</p>
        <div className={`${card} w-full`}>
          <div className="flex flex-col gap-[2vh]">
            {[
              { icon: "📱", text: "Los menores de 13 a 17 años pueden tener su propio acceso a la app con su email" },
              { icon: "👨‍👩‍👧", text: "El padre/madre debe autorizar el acceso desde su cuenta" },
              { icon: "✅", text: "El menor puede ver convocatorias, calendario, evaluaciones y anuncios" },
              { icon: "🚫", text: "NO tienen chat ni acceso a pagos ni datos sensibles" },
              { icon: "🎯", text: "Así el chaval puede confirmar sus propias convocatorias sin depender de los padres" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-[1.5vw]">
                <span style={{fontSize:'3.5vw'}} className="flex-shrink-0">{item.icon}</span>
                <p style={{fontSize:'2.2vw'}} className="leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 11. CONVOCATORIAS
  {
    id: "callups",
    bg: "from-amber-600 to-red-700",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">🏆 Convocatorias</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">El entrenador convoca → tú confirmas</p>
        <div className="grid grid-cols-3 gap-[2vw] w-full mb-[3vh]">
          {[
            { icon: "📩", title: "Te llega aviso", desc: "Notificación cuando tu hijo es convocado" },
            { icon: "✅", title: "Confirmas", desc: '"Asistirá", "No asistirá" o "Duda" — un solo toque' },
            { icon: "🚗", title: "Transporte compartido", desc: "Ofrece o pide plazas para partidos fuera" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:'5vw'}} className="mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:'2.5vw'}} className="font-bold mb-2">{item.title}</h3>
              <p style={{fontSize:'1.8vw'}} className="opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className={`${card} text-center w-full`}>
          <p style={{fontSize:'2.2vw'}}>💡 <strong>Confirma siempre rápido</strong> para que el entrenador pueda planificar.</p>
        </div>
      </div>
    ),
  },

  // 12. PAGOS
  {
    id: "payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">💳 Pagos y Cuotas</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-90 text-center mb-[3vh]">Transparente y sencillo</p>
        <div className="grid grid-cols-2 gap-[2vw] w-full mb-[3vh]">
          <div className={card}>
            <h3 style={{fontSize:'3vw'}} className="font-bold mb-[2vh]">💰 Formas de pago</h3>
            <div className="space-y-[1.5vh]">
              <p style={{fontSize:'2.2vw'}}>✅ <strong>Pago único</strong> — toda la cuota de una vez</p>
              <p style={{fontSize:'2.2vw'}}>✅ <strong>3 plazos</strong> — Junio, Septiembre, Diciembre</p>
            </div>
          </div>
          <div className={card}>
            <h3 style={{fontSize:'3vw'}} className="font-bold mb-[2vh]">📄 Proceso</h3>
            <div className="space-y-[1.5vh]">
              <p style={{fontSize:'2.2vw'}}>1️⃣ Selecciona el pago pendiente</p>
              <p style={{fontSize:'2.2vw'}}>2️⃣ Paga por transferencia o tarjeta</p>
              <p style={{fontSize:'2.2vw'}}>3️⃣ Sube el justificante</p>
              <p style={{fontSize:'2.2vw'}}>4️⃣ El club lo valida</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-3xl p-[2vw] w-full text-center">
          <p style={{fontSize:'2.5vw'}} className="font-bold">⚠️ Los jugadores con pagos pendientes <strong>no serán convocados</strong> a los partidos.</p>
        </div>
      </div>
    ),
  },

  // 13. COMUNICACIÓN
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">💬 Comunicación</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">3 canales — todo dentro de la app</p>
        <div className="grid grid-cols-3 gap-[2vw] w-full mb-[3vh]">
          {[
            { icon: "⚽", title: "Chat de Equipo", desc: "Grupal con entrenador y familias de la categoría" },
            { icon: "🎓", title: "Chat Coordinador", desc: "Privado 1-a-1 para temas personales" },
            { icon: "🔔", title: "Mensajes del Club", desc: "Avisos oficiales y recordatorios" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:'5vw'}} className="mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:'2.5vw'}} className="font-bold mb-2">{item.title}</h3>
              <p style={{fontSize:'1.8vw'}} className="opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-3xl p-[2vw] w-full text-center">
          <p style={{fontSize:'2.5vw'}} className="font-bold">🚫 Los grupos de WhatsApp del club se eliminarán. Toda la comunicación será por la app.</p>
        </div>
      </div>
    ),
  },

  // 14. COMPETICIÓN
  {
    id: "competition",
    bg: "from-rose-600 to-pink-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">🏆 Competición en directo</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">Toda la info deportiva actualizada automáticamente</p>
        <div className="grid grid-cols-2 gap-[2vw] w-full">
          {[
            { icon: "📊", title: "Clasificaciones", desc: "Posición de todos los equipos del club en liga" },
            { icon: "⚽", title: "Resultados", desc: "Marcadores actualizados jornada a jornada" },
            { icon: "🥇", title: "Goleadores", desc: "Tabla de máximos goleadores del club" },
            { icon: "📅", title: "Próximos partidos", desc: "Calendario con hora, rival y ubicación" },
          ].map((item, i) => (
            <div key={i} className={card}>
              <div style={{fontSize:'4vw'}} className="mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:'3vw'}} className="font-bold mb-1">{item.title}</h3>
              <p style={{fontSize:'2.2vw'}} className="opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 15. TIENDA
  {
    id: "shop",
    bg: "from-indigo-700 to-blue-900",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">🛍️ Tienda de Ropa del Club</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[3vh]">Los packs y equipación se piden desde la app</p>
        <div className="grid grid-cols-3 gap-[2vw] w-full mb-[3vh]">
          {[
            { icon: "👕", title: "Pack obligatorio", desc: "Equipación completa: 1ª y 2ª equipación, ropa de entrenamiento, paseo, etc." },
            { icon: "🧥", title: "Ropa opcional", desc: "Chaqueta de partidos, chubasquero, anorak, mochila…" },
            { icon: "📦", title: "Te llega a casa", desc: "Eliges tallas, pagas y recibes el pedido sin moverte" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:'5vw'}} className="mb-[1vh]">{item.icon}</div>
              <h3 style={{fontSize:'2.5vw'}} className="font-bold mb-2">{item.title}</h3>
              <p style={{fontSize:'1.8vw'}} className="opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-3xl p-[2vw] w-full text-center">
          <p style={{fontSize:'2.5vw'}} className="font-bold">⚠️ El pedido de ropa se hace exclusivamente desde la app.</p>
        </div>
      </div>
    ),
  },

  // 16. MÁS FUNCIONES
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col justify-center items-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[1.5vh]">✨ Y mucho más...</h2>
        <p style={{fontSize:'2.5vw'}} className="opacity-80 text-center mb-[4vh]">La app sigue creciendo</p>
        <div className="grid grid-cols-3 gap-[1.5vw] w-full">
          {[
            { icon: "🖼️", title: "Galería de fotos" },
            { icon: "📋", title: "Encuestas" },
            { icon: "📄", title: "Documentos" },
            { icon: "📅", title: "Calendario y eventos" },
            { icon: "🤝", title: "Voluntariado" },
            { icon: "🛍️", title: "Mercadillo" },
            { icon: "🎫", title: "Hacerse socio" },
            { icon: "🤖", title: "Asistente virtual IA" },
            { icon: "🖊️", title: "Firmas federación" },
          ].map((item, i) => (
            <div key={i} className={`${card} text-center`}>
              <div style={{fontSize:'4.5vw'}} className="mb-[0.5vh]">{item.icon}</div>
              <p style={{fontSize:'2.2vw'}} className="font-bold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 17. FAQ
  {
    id: "faq",
    bg: "from-indigo-700 to-violet-800",
    content: (
      <div className="flex flex-col justify-center h-full text-white px-[4vw] py-[2vh]">
        <h2 style={{fontSize:'5vw', lineHeight:1.1}} className="font-black text-center mb-[3vh]">❓ Preguntas Frecuentes</h2>
        <div className="flex flex-col gap-[1.2vh] w-full">
          {[
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se invita al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta aunque estén en categorías distintas." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — el sistema te envía un código nuevo. No hay contraseña." },
            { q: "¿Mi hijo de 15 puede usar la app?", a: "Sí, con acceso juvenil. Tú lo autorizas y él ve convocatorias y calendario (sin chat)." },
            { q: "¿Mi hijo de 19 puede estar en mi cuenta?", a: "No. Los mayores de 18 se registran ellos mismos con su email." },
            { q: "¿Quién ve mis datos?", a: "Solo administradores y entrenadores del club. Cumplimos con la LOPD." },
          ].map((item, i) => (
            <div key={i} className={card}>
              <h3 style={{fontSize:'2.5vw'}} className="font-bold mb-1">{item.q}</h3>
              <p style={{fontSize:'2vw'}} className="opacity-80">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 18. CIERRE
  {
    id: "end",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-[4vw]">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-56 h-56 rounded-full border-4 border-white/40 shadow-2xl mb-8" />
        <h2 style={{fontSize:'8vw', lineHeight:1}} className="font-black mb-[2vh]">¡Gracias!</h2>
        <p style={{fontSize:'3.5vw'}} className="opacity-90">¿Alguna pregunta?</p>
        <p style={{fontSize:'2.5vw'}} className="opacity-70 mt-[2vh]">Estamos aquí para ayudaros 💪</p>
        <div className={`${card} mt-[4vh] max-w-[70vw]`}>
          <p style={{fontSize:'2.2vw'}} className="opacity-80 mb-2">Si necesitáis ayuda con la app:</p>
          <p style={{fontSize:'3vw'}} className="font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
          <p style={{fontSize:'1.8vw'}} className="opacity-60 mt-2">o escribid al coordinador por el chat</p>
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-3xl p-[2vw] mt-[3vh] max-w-[70vw]">
          <p style={{fontSize:'2.5vw'}} className="font-bold">📱 ¡Instaladla HOY! No dejéis para mañana lo que podéis hacer en 5 minutos.</p>
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
        <button onClick={goPrev} className="absolute left-[1vw] top-1/2 -translate-y-1/2 w-[5vw] h-[5vw] rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all">
          <ChevronLeft style={{width:'3vw', height:'3vw'}} />
        </button>
      )}
      {current < total - 1 && (
        <button onClick={goNext} className="absolute right-[1vw] top-1/2 -translate-y-1/2 w-[5vw] h-[5vw] rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all">
          <ChevronRight style={{width:'3vw', height:'3vw'}} />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-[2vw] py-[1vh] bg-black/20">
        <div className="flex gap-[0.4vw] flex-wrap max-w-[60%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? "bg-white scale-150" : "bg-white/40 hover:bg-white/60"}`}
              style={{width:'0.8vw', height:'0.8vw'}}
            />
          ))}
        </div>
        <div className="flex items-center gap-[1.5vw] text-white/70" style={{fontSize:'1.5vw'}}>
          <span>{current + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize style={{width:'2vw', height:'2vw'}} /> : <Maximize style={{width:'2vw', height:'2vw'}} />}
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